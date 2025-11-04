import { GoogleGenAI, Type } from '@google/genai';
import type { Lesson, RealWorldExample, Subject } from '../types';
import { loadApiKey } from '../utils/progress';

// DO NOT initialize the AI client at the top level. This causes a crash in production.
// It will be initialized on-demand in the function below.

const getAiClient = (): GoogleGenAI => {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error("API key not found in storage. Please set it on the start screen.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper function to convert a File object to a base64 string for the API
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};


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

export const generateLesson = async (topic: string, subject: string): Promise<Lesson> => {
  // Initialize the client here, just before making the API call.
  const ai = getAiClient();

  const prompt = `You are an expert ${subject} teacher creating a personalized lesson plan for a student. The topic is "${topic}".
  
  Generate a comprehensive lesson based on this topic. The lesson should include:
  1.  An engaging **introduction** to the topic.
  2.  A **core concept** section that explains the main idea in detail, including its title, a thorough explanation, and 3 real-world examples with explanations.
  3.  A **quiz** titled "Test Your Knowledge" with 5 multiple-choice questions to test understanding. Each question should have 4 options.
  4.  A **practice problems** section titled "Practice Makes Perfect" with 3 problems that require the student to apply the concept. Provide just the problem and the final answer.

  Format the entire output as a single JSON object that strictly adheres to the provided schema. Do not include any markdown formatting or explanations outside of the JSON structure.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Using pro for complex structured generation
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: lessonSchema,
      },
    });

    const jsonText = response.text.trim();
    const lessonData: Lesson = JSON.parse(jsonText);
    return lessonData;
  } catch (error) {
    console.error("Error generating lesson:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error("Your API key is not valid. Please check it and try again.");
    }
    throw new Error("Failed to generate lesson. The topic might be too broad or the service is currently unavailable. Please try again.");
  }
};

const topicsSchema = {
    type: Type.OBJECT,
    properties: {
        topics: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
    },
    required: ['topics']
};

export const extractTopicsFromFile = async (file: File): Promise<string[]> => {
    const ai = getAiClient();
    const filePart = await fileToGenerativePart(file);
    const textPart = { text: "Extract a list of 7th-grade level educational topics from this document. The topics should be suitable for generating a 15-minute lesson. Return only a JSON object with a 'topics' array." };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Pro model is better for this kind of extraction
            contents: { parts: [textPart, filePart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: topicsSchema,
            },
        });
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data.topics;
    } catch (error) {
        console.error("Error extracting topics:", error);
        throw new Error("Failed to extract topics from the file. Please ensure it's a valid curriculum document.");
    }
};

export const getKhanAcademyTopics = async (subject: Subject): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `Generate a list of 15 key 7th-grade ${subject} topics based on the Khan Academy curriculum. The topics should be concise and suitable for generating a short lesson. Return only a JSON object with a 'topics' array.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: topicsSchema,
            },
        });
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data.topics;
    } catch (error) {
        console.error("Error fetching Khan Academy topics:", error);
        throw new Error("Failed to fetch Khan Academy topics. Please try again later.");
    }
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
                    explanation: { type: Type.STRING }
                },
                required: ['example', 'explanation']
            }
        }
    },
    required: ['examples']
};

export const generateMoreExamples = async (topic: string, subject: string, existingExamples: RealWorldExample[]): Promise<RealWorldExample[]> => {
    const ai = getAiClient();
    const existingExamplesText = existingExamples.map(e => `- ${e.example}`).join('\n');
    const prompt = `The lesson is about "${topic}" in ${subject}.
    
The student has already seen these examples:
${existingExamplesText}

Please provide 2 new, simple, and distinct real-world examples to help them understand the concept better.
Return only a JSON object with an 'examples' array.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: examplesSchema
            }
        });
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data.examples;
    } catch (error) {
        console.error("Error generating more examples:", error);
        throw new Error("Failed to generate more examples. Please try again.");
    }
};