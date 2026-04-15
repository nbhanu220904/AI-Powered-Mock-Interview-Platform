import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import Resume from '../models/Resume.model.js';

// The Function `parseResumePDF = async (pdfBuffer)` converts the multer buffer to a `unit8Array` which is the format that `pdfjsLib` expects. It then loads the PDF document and iterates through each page to extract text content. The extracted text from all pages is concatenated into a single string and returned. If any error occurs during this process, it logs the error and throws a new error with a user-friendly message.
export const parseResumePDF = async (pdfBuffer) => {
    try {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Uploaded PDF is empty');
    }

    const uint8Array = new Uint8Array(
            pdfBuffer.buffer,
            pdfBuffer.byteOffset,
            pdfBuffer.byteLength
        );
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array, disableWorker: true });
        const pdf = await loadingTask.promise;

        let extractedText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const strings = content.items.map((item) => item.str);
            extractedText += strings.join(' ');
        }

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from the PDF');
        }

        return extractedText;
    }
    catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF. Please upload a valid PDF file.');
        // throw new Error(`Failed to parse PDF: ${error.message}`);
    }
}

export const saveResume = async (userId, fileName, extractedText) => {
  const resume = await Resume.findOneAndUpdate(
    { userId },
    { userId, fileName, extractedText },
    { returnDocument: 'after', upsert: true }
  );

  return resume;
};

export const getUserResume = async (userId) => {
  const resume = await Resume.findOne({ userId }).select('-__v');
  return resume;
};