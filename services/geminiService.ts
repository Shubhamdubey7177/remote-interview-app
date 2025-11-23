import { GoogleGenAI, Type } from "@google/genai";
import { Problem, ExecutionResult } from "../types";

const apiKey = process.env.API_KEY;

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey });

// Helper to clean JSON string if model adds markdown blocks
const cleanJson = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\n/, '').replace(/\n```$/, '');
  }
  return clean;
};

export const generateProblem = async (difficulty: string = 'Medium'): Promise<Problem> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `Generate a unique, ${difficulty}-level coding interview problem similar to LeetCode.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  output: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            },
            starterCode: { type: Type.STRING }
          },
          required: ["id", "title", "description", "difficulty", "tags", "examples", "starterCode"]
        },
        temperature: 0.8
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(cleanJson(text)) as Problem;
  } catch (error) {
    console.error("Error generating problem:", error);
    // Fallback problem if API fails or limits hit
    return {
      id: "two-sum",
      title: "Two Sum (Fallback)",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      difficulty: "Easy",
      tags: ["Array", "Hash Table"],
      examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }
      ],
      starterCode: "function twoSum(nums, target) {\n  // Your code here\n};"
    };
  }
};

export const evaluateCode = async (problem: Problem, code: string): Promise<ExecutionResult> => {
  const model = "gemini-2.5-flash";

  const prompt = `
  You are a code execution engine and judge.
  
  Problem: ${problem.title}
  Description: ${problem.description}
  
  User Code:
  ${code}
  
  Task:
  1. Analyze the code for correctness against the problem description.
  2. Simulate running the code against 3-5 edge cases and standard cases.
  3. Determine if it passes.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
           type: Type.OBJECT,
           properties: {
             passed: { type: Type.BOOLEAN },
             output: { type: Type.STRING },
             error: { type: Type.STRING },
             feedback: { type: Type.STRING },
             testCasesPassed: { type: Type.NUMBER },
             totalTestCases: { type: Type.NUMBER }
           },
           required: ["passed", "output", "feedback", "testCasesPassed", "totalTestCases"]
        },
        temperature: 0.2 // Low temperature for deterministic evaluation
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(cleanJson(text)) as ExecutionResult;
  } catch (error) {
    console.error("Error evaluating code:", error);
    return {
      passed: false,
      output: "",
      error: "Failed to evaluate code. Please try again.",
      feedback: "System error.",
      testCasesPassed: 0,
      totalTestCases: 0
    };
  }
};
