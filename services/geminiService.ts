import { GoogleGenAI, Type, Part } from "@google/genai";
import type { Lesson, RealWorldExample, Subject } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const lessonSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    introduction: { type: Type.STRING },
    coreConcept: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        explanation: { type: Type.STRING },
        realWorldExamples: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              example: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['example', 'explanation'],
          },
        },
      },
      required: ['title', 'explanation', 'realWorldExamples'],
    },
    quiz: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
            },
            required: ['questionText', 'options', 'correctAnswerIndex'],
          },
        },
      },
      required: ['title', 'questions'],
    },
    practiceProblems: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        problems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              problemText: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ['problemText', 'answer'],
          },
        },
      },
      required: ['title', 'problems'],
    },
  },
  required: ['topic', 'introduction', 'coreConcept', 'quiz', 'practiceProblems'],
};

const topicsSchema = {
    type: Type.OBJECT,
    properties: {
        topics: {
            type: Type.ARRAY,
            items: { 
                type: Type.STRING,
                description: "A specific, teachable topic for a 7th grader." 
            }
        }
    },
    required: ['topics']
};

const examplesSchema = {
  type: Type.OBJECT,
  properties: {
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          example: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['example', 'explanation'],
      },
    },
  },
  required: ['examples'],
};

export const generateLesson = async (topic: string, subject: Subject): Promise<Lesson> => {
  const prompt = `
    You are an expert curriculum designer and teacher specializing in creating engaging content for 7th-grade students.
    Your task is to generate a complete mini-lesson on the ${subject} topic of "${topic}".
    The lesson should be structured to be completed in about 30 minutes.
    It must include:
    1. A simple introduction to the concept.
    2. A core concept explanation with real-world examples that a 12-13 year old can relate to.
    3. A multiple-choice quiz with 3-4 questions to check understanding.
    4. A set of 2-3 practice problems that require the student to type in the answer (not multiple-choice).
    
    The entire output must be a single, valid JSON object that adheres to the provided schema. Do not include any text, markdown, or code fences outside of the JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const lessonData = JSON.parse(jsonText) as Lesson;
    return lessonData;

  } catch (error) {
    console.error("Error generating lesson:", error);
    throw new Error(`Failed to generate the ${subject} lesson. Please try again with a different topic.`);
  }
};

const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const extractTopics = async (content: string | Part, subject: Subject): Promise<string[]> => {
    const prompt = `
        You are an expert curriculum analyzer. Your task is to analyze the provided 7th-grade ${subject} curriculum document or content and extract a list of specific, teachable topics suitable for a 15-30 minute mini-lesson.
        The topics should be granular enough for a single session (e.g., "Finding the area of a circle" instead of just "Geometry", or "The Water Cycle" instead of just "Earth Science").
        Return the topics as a single, valid JSON object that adheres to the provided schema. Do not include any text, markdown, or code fences outside of the JSON object.
    `;

    const contents = typeof content === 'string' 
        ? prompt + "\n\nCurriculum content: " + content 
        : { parts: [{ text: prompt }, content] };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: topicsSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as { topics: string[] };
        if (!result.topics || result.topics.length === 0) {
            throw new Error("No topics were extracted. The document might be empty or in an unsupported format.");
        }
        return result.topics;

    } catch (error) {
        console.error("Error extracting topics:", error);
        throw new Error("Failed to extract topics from the provided source. Please check the content and try again.");
    }
};

export const extractTopicsFromFile = async (file: File, subject: Subject): Promise<string[]> => {
    const filePart = await fileToGenerativePart(file);
    return extractTopics(filePart, subject);
};

export const extractTopicsFromKhanAcademy = async (subject: Subject): Promise<string[]> => {
    const khanPrompt = `Please provide a comprehensive list of 7th-grade ${subject} topics as covered by the Khan Academy curriculum.`;
    return extractTopics(khanPrompt, subject);
};

export const generateMoreExamples = async (topic: string, subject: Subject, existingExamples: RealWorldExample[]): Promise<RealWorldExample[]> => {
  const existingExamplesString = existingExamples.map(e => `- ${e.example}`).join('\n');

  const prompt = `
    You are a creative teacher for 7th graders. 
    A student needs more real-world examples for the ${subject} topic "${topic}".
    Please provide 2 new, simple, and distinct examples that are different from the ones they've already seen.
    
    Here are the examples the student already has:
    ${existingExamplesString}

    Provide only the new examples. The entire output must be a single, valid JSON object that adheres to the provided schema. Do not include any text, markdown, or code fences outside of the JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examplesSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText) as { examples: RealWorldExample[] };
    return result.examples;
  } catch (error) {
    console.error("Error generating more examples:", error);
    throw new Error("Failed to generate more examples. Please try again.");
  }
};