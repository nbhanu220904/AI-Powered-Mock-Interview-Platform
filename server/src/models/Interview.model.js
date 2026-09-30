import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema(
    {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        required: true
    },
    resumeText: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed'],
        default: 'in_progress'
    },
    modality: {
        type: String,
        enum: ['audio', 'video'],
        default: 'audio'
    },
    sessionStatus: {
        type: String,
        enum: ['created', 'active', 'paused', 'completed', 'abandoned'],
        default: 'created'
    },
    mediaConsent: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: null
    },
    endedAt: {
        type: Date,
        default: null
    },
    lastActivityAt: {
        type: Date,
        default: null
    },
    videoTranscript: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    videoMetrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    totalQuestions: {
        type: Number,
        default: 5
    },
    currentQuestion: {
        type: Number,
        default: 0
    },
    questions: {
        type: Array,
        default: []
    },
    messages: {
        type: Array,
        default: []
    },
    codeSubmissions: {
        type: Array,
        default: []
    },
    lastAudio: {
        type: String,
        default: ''
    },
    feedback: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    overallScore: {
        type: Number,
        default: null
    },
    },
    {
        timestamps: true,
    }

)

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;