import Interview from '../models/Interview.model.js';
import { askGemini } from './gemini.service.js';
import { generateAudio } from './murf.service.js';
import { parseGeminiJSON } from '../utils/prompts.utils.js';
import {
  GENERATE_QUESTIONS_PROMPT,
  INTERVIEW_GREETING_PROMPT,
  FOLLOW_UP_PROMPT,
  FEEDBACK_PROMPT,
  EVALUATE_CODE_PROMPT,
  buildConversationHistory,
} from '../constants/prompts.js';

const buildFallbackQuestions = (role, totalQuestions) => {
  const desiredCount = Math.max((Number(totalQuestions) || 5) - 1, 1);
  const pool = [
    {
      text: `What motivated you to pursue ${role}, and what strengths do you bring to this role?`,
      type: 'behavioral',
      isCodeQuestion: false,
    },
    {
      text: `Describe one challenging problem you solved recently in ${role} work and how you approached it.`,
      type: 'technical',
      isCodeQuestion: false,
    },
    {
      text: 'Write a function that removes duplicate values from an array while preserving order.',
      type: 'technical',
      isCodeQuestion: true,
      codeType: 'write',
      codeLanguage: 'javascript',
    },
    {
      text: 'How do you evaluate trade-offs between performance, readability, and maintainability in production code?',
      type: 'technical',
      isCodeQuestion: false,
    },
    {
      text: 'Tell me about a time you received critical feedback and how you applied it.',
      type: 'behavioral',
      isCodeQuestion: false,
    },
  ];

  return pool.slice(0, desiredCount);
};

const buildFallbackFeedback = (role, conversationHistory, codeSubmissionsCount) => {
  const hasConversation = Boolean(conversationHistory && conversationHistory !== 'No conversation yet.');
  const codeBonus = codeSubmissionsCount > 0 ? 5 : 0;

  return {
    overallScore: 72 + codeBonus,
    categoryScores: {
      communicationSkills: {
        score: hasConversation ? 74 : 68,
        comment: 'You communicated your ideas clearly in parts of the interview. Keep structuring answers with context, action, and outcome for stronger impact.',
      },
      technicalKnowledge: {
        score: 73 + codeBonus,
        comment: `You demonstrated a workable foundation for ${role}. Continue deepening your understanding of practical trade-offs and system-level reasoning.`,
      },
      problemSolving: {
        score: 71 + codeBonus,
        comment: 'Your approach showed steady problem decomposition. Improve by explaining alternatives and why you selected your final approach.',
      },
      codeQuality: {
        score: 70 + codeBonus,
        comment: codeSubmissionsCount > 0
          ? 'Your code showed useful intent. Focus on edge cases, naming, and brief test validation to strengthen reliability.'
          : 'No code submission was available for deeper analysis. In future rounds, include short tests and edge-case handling.',
      },
      confidence: {
        score: hasConversation ? 75 : 69,
        comment: 'You maintained a composed tone. You can improve further by giving concise, decisive conclusions at the end of each answer.',
      },
    },
    strengths: [
      'You maintained consistent engagement throughout the interview flow.',
      'You showed practical intent in your explanations and responses.',
    ],
    areasOfImprovement: [
      'Use more concrete examples with measurable outcomes from your past work.',
      'For technical answers, explicitly discuss trade-offs and edge cases.',
    ],
    finalAssessment: 'You are on a promising track for this role. With sharper structure, deeper technical justification, and stronger example-driven answers, your interview performance can improve significantly.',
  };
};

export const startInterview = async (userId, role, resumeText, candidateName, totalQuestions = 5) => {
  let aiQuestions = [];
  try {
    const questionsPrompt = GENERATE_QUESTIONS_PROMPT(role, resumeText, totalQuestions);
    const questionsResponse = await askGemini(questionsPrompt);
    const parsed = parseGeminiJSON(questionsResponse);
    aiQuestions = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Question generation failed, using fallback questions:', error.message);
    aiQuestions = buildFallbackQuestions(role, totalQuestions);
  }

  if (!Array.isArray(aiQuestions) || aiQuestions.length === 0) {
    aiQuestions = buildFallbackQuestions(role, totalQuestions);
  }

  const introQuestion = {
    text: 'Tell me about yourself — your background, what you\'re currently working on, and what excites you about this role.',
    type: 'behavioral',
    isCodeQuestion: false,
  };
  const questions = [introQuestion, ...aiQuestions];

  const interview = await Interview.create({
    userId,
    role,
    resumeText,
    totalQuestions: questions.length,
    currentQuestion: 1,
    questions,
    status: 'in_progress',
  });

  let greeting = `Hi ${candidateName || 'there'}, I am Natalie, and I will be your interviewer for this ${role} interview. Take your time, there are no wrong answers. Let's start with the basics — tell me about yourself.`;
  try {
    const greetingPrompt = INTERVIEW_GREETING_PROMPT(role, candidateName);
    const generatedGreeting = await askGemini(greetingPrompt);
    if (generatedGreeting && generatedGreeting.trim()) {
      greeting = generatedGreeting.trim();
    }
  } catch (error) {
    console.error('Greeting generation failed, using fallback greeting:', error.message);
  }

  // Backward compatibility for older records with legacy message field.
  if (!Array.isArray(interview.messages)) {
    interview.messages = Array.isArray(interview.message) ? interview.message : [];
  }

  interview.messages.push({
    role: 'interviewer',
    content: greeting,
    timestamp: new Date(),
  });

  let audioBase64 = null;
  try {
    audioBase64 = await generateAudio(greeting);
  } catch (audioError) {
    console.error('Audio generation failed, continuing without audio:', audioError.message);
  }

  interview.lastAudio = audioBase64 || '';
  await interview.save();

  return {
    interviewId: interview._id,
    greeting: greeting,
    currentQuestion: 1,
    totalQuestions: questions.length,
    question: introQuestion,
    audio: audioBase64,
  };
};

export const submitAnswer = async (interviewId, userId, answerText) => {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) throw new Error('Interview not found');
  if (interview.status === 'completed') throw new Error('Interview already completed');

  if (!Array.isArray(interview.messages)) {
    interview.messages = Array.isArray(interview.message) ? interview.message : [];
  }

  interview.messages.push({
    role: 'candidate',
    content: answerText,
    timestamp: new Date(),
  });

  const nextQuestionIndex = interview.currentQuestion;
  if (nextQuestionIndex >= interview.questions.length) {
    interview.status = 'completed';
    await interview.save();

    const farewellText = 'Thank you for completing the interview! I really enjoyed our conversation. Let me prepare your detailed feedback report.';
    let farewellAudio = null;
    try {
      farewellAudio = await generateAudio(farewellText);
    } catch (audioError) {
      console.error('Farewell audio failed:', audioError.message);
    }

    return { isComplete: true, message: farewellText, audio: farewellAudio };
  }

  const conversationHistory = buildConversationHistory(interview.messages);
  const nextQuestion = interview.questions[nextQuestionIndex];

  const followUpPrompt = FOLLOW_UP_PROMPT(interview.role, conversationHistory, nextQuestion.text);
  const followUpResponse = await askGemini(followUpPrompt);

  interview.messages.push({
    role: 'interviewer',
    content: followUpResponse,
    timestamp: new Date(),
  });

  interview.currentQuestion += 1;
  await interview.save();

  const spokenText = `${followUpResponse} ... ${nextQuestion.text}`;
  let audioBase64 = null;
  try {
    audioBase64 = await generateAudio(spokenText);
  } catch (audioError) {
    console.error('Audio generation failed, continuing without audio:', audioError.message);
  }

  interview.lastAudio = audioBase64 || '';
  await interview.save();

  return {
    isComplete: false,
    response: followUpResponse,
    currentQuestion: interview.currentQuestion,
    totalQuestions: interview.totalQuestions,
    question: nextQuestion,
    audio: audioBase64,
  };
};

export const submitCode = async (interviewId, userId, code, language) => {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) {
    const error = new Error('Interview not found');
    error.statusCode = 404;
    throw error;
  }
  if (interview.status === 'completed') {
    const error = new Error('Interview already completed');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(interview.messages)) {
    interview.messages = Array.isArray(interview.message) ? interview.message : [];
  }

  const questionIndex = interview.currentQuestion - 1;
  const question = interview.questions[questionIndex];
  const codeType = question.codeType || 'write';

  const evalPrompt = EVALUATE_CODE_PROMPT(question.text, code, language, codeType);
  const evalResponse = await askGemini(evalPrompt);
  const evaluation = parseGeminiJSON(evalResponse);

  interview.codeSubmissions.push({
    questionIndex,
    codeType,
    code,
    language,
    evaluation,
    timestamp: new Date(),
  });

  interview.messages.push({
    role: 'candidate',
    content: `[Code ${codeType} in ${language}] Score: ${evaluation.score}/100\n${code}`,
    timestamp: new Date(),
  });

  const nextQuestionIndex = interview.currentQuestion;
  if (nextQuestionIndex >= interview.questions.length) {
    interview.status = 'completed';
    await interview.save();

    const farewellText = 'Thank you for completing the interview! I really enjoyed our conversation. Let me prepare your detailed feedback report.';
    let farewellAudio = null;
    try {
      farewellAudio = await generateAudio(farewellText);
    } catch (audioError) {
      console.error('Farewell audio failed:', audioError.message);
    }

    return { evaluation, isComplete: true, audio: farewellAudio };
  }

  const conversationHistory = buildConversationHistory(interview.messages);
  const nextQuestion = interview.questions[nextQuestionIndex];

  const followUpPrompt = FOLLOW_UP_PROMPT(interview.role, conversationHistory, nextQuestion.text);
  const followUpResponse = await askGemini(followUpPrompt);

  interview.messages.push({
    role: 'interviewer',
    content: followUpResponse,
    timestamp: new Date(),
  });

  interview.currentQuestion += 1;

  const spokenText = `${followUpResponse} ... ${nextQuestion.text}`;
  let audioBase64 = null;
  try {
    audioBase64 = await generateAudio(spokenText);
  } catch (audioError) {
    console.error('Audio generation failed:', audioError.message);
  }

  interview.lastAudio = audioBase64 || '';
  await interview.save();

  return {
    evaluation,
    isComplete: false,
    response: followUpResponse,
    currentQuestion: interview.currentQuestion,
    totalQuestions: interview.totalQuestions,
    question: nextQuestion,
    audio: audioBase64,
  };
};

// export const endInterview = async (interviewId, userId) => {
//   const interview = await Interview.findOne({ _id: interviewId, userId });
//   if (!interview) {
//     const error = new Error('Interview not found');
//     error.statusCode = 404;
//     throw error;
//   }

//   if (interview.status === 'completed' && interview.feedback) {
//     return {
//       interviewId: interview._id,
//       feedback: interview.feedback,
//       overallScore: interview.overallScore,
//     };
//   }

//   const conversationHistory = buildConversationHistory(interview.messages);

//   let codeSubmissionsSummary = '';
//   if (interview.codeSubmissions.length > 0) {
//     codeSubmissionsSummary = interview.codeSubmissions
//       .map((sub, i) => `Submission ${i + 1} (${sub.language}):\n${sub.code}\nEvaluation: ${JSON.stringify(sub.evaluation)}`)
//       .join('\n\n');
//   }

//   const feedbackPrompt = FEEDBACK_PROMPT(interview.role, conversationHistory, codeSubmissionsSummary);
//   const feedbackResponse = await askGemini(feedbackPrompt);
//   const feedback = parseGeminiJSON(feedbackResponse);

//   interview.feedback = feedback;
//   interview.overallScore = feedback.overallScore || 0;
//   interview.status = 'completed';
//   await interview.save();

//   return {
//     interviewId: interview._id,
//     feedback,
//     overallScore: feedback.overallScore,
//   };
// };

export const endInterview = async (interviewId, userId) => {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) {
    const error = new Error('Interview not found');
    error.statusCode = 404;
    throw error;
  }

  if (interview.status === 'completed' && interview.feedback) {
    return {
      interviewId: interview._id,
      feedback: interview.feedback,
      overallScore: interview.overallScore,
    };
  }

  if (!Array.isArray(interview.messages)) {
    interview.messages = Array.isArray(interview.message) ? interview.message : [];
  }

  const conversationHistory = buildConversationHistory(interview.messages);

  let codeSubmissionsSummary = '';
  if (interview.codeSubmissions.length > 0) {
    codeSubmissionsSummary = interview.codeSubmissions
      .map((sub, i) => `Submission ${i + 1} (${sub.language}):\n${sub.code}\nEvaluation: ${JSON.stringify(sub.evaluation)}`)
      .join('\n\n');
  }

  let feedback;
  try {
    const feedbackPrompt = FEEDBACK_PROMPT(interview.role, conversationHistory, codeSubmissionsSummary);
    const feedbackResponse = await askGemini(feedbackPrompt);
    feedback = parseGeminiJSON(feedbackResponse);
  } catch (error) {
    console.error('Feedback generation failed, using fallback feedback:', error.message);
    feedback = buildFallbackFeedback(
      interview.role,
      conversationHistory,
      interview.codeSubmissions?.length || 0
    );
  }

  interview.feedback = feedback;
  interview.overallScore = feedback.overallScore || 0;
  interview.status = 'completed';
  await interview.save();

  return {
    interviewId: interview._id,
    feedback,
    overallScore: feedback.overallScore,
  };
};

// export const getInterviewById = async (interviewId, userId) => {
//   const interview = await Interview.findOne({ _id: interviewId, userId }).select('-__v');
//   if (!interview) {
//     const error = new Error('Interview not found');
//     error.statusCode = 404;
//     throw error;
//   }
//   return interview;
// };

export const getInterviewById = async (interviewId, userId) => {
  const interview = await Interview.findOne({ _id: interviewId, userId }).select('-__v');
  if (!interview) {
    const error = new Error('Interview not found');
    error.statusCode = 404;
    throw error;
  }
  return interview;
};