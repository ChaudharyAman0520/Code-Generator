/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  registerUser, 
  loginUser, 
  verifyToken, 
  getUserHistory, 
  addUserHistoryItem, 
  updateUserHistoryItem, 
  removeUserHistoryItem, 
  clearUserHistory 
} from './src/usersDb';

// Load variables from .env
dotenv.config();

const PORT = 3000;

// Middleware to authenticate users and protect endpoints
function authMiddleware(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Please log in first.' });
  }
  const token = authHeader.substring(7);
  const username = verifyToken(token);
  if (!username) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
  }
  (req as any).username = username;
  next();
}

// Lazy initialization pattern for Gemini SDK as specified in guidelines
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel.');
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

/**
 * Executes a Gemini content generation call with automatic exponential backoff retry for transient
 * 503/429 errors, and drops back to an alternative highly resilient model if the primary model of choice is unavailable.
 */
async function generateContentWithRetryAndFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  fallbackModel: string,
  options: {
    contents: any;
    config: any;
  }
) {
  const maxRetries = 2;
  let delay = 1000; // start with 1s delay
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Calling Gemini API [Model: ${primaryModel}] (Attempt ${attempt + 1}/${maxRetries + 1})`);
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: options.contents,
        config: options.config
      });
      return response;
    } catch (err: any) {
      const statusStr = String(err?.status || '');
      const errMessage = String(err?.message || err || '');
      const isTransient = statusStr.includes('503') || statusStr.includes('429') ||
                          errMessage.includes('503') || errMessage.includes('429') ||
                          errMessage.includes('UNAVAILABLE') || errMessage.includes('RESOURCE_EXHAUSTED');
      
      if (isTransient && attempt < maxRetries) {
        console.warn(`Attempt ${attempt + 1} failed with transient error: ${errMessage}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        if (isTransient) {
          console.warn(`All retry attempts for primary model ${primaryModel} failed. Transitioning to fallback model: ${fallbackModel}...`);
          break;
        }
        throw err;
      }
    }
  }

  // If retries are exhausted or it's a transient failure, invoke the fallback model
  console.log(`Invoking fallback Gemini model: ${fallbackModel}`);
  return await ai.models.generateContent({
    model: fallbackModel,
    contents: options.contents,
    config: options.config
  });
}

async function startServer() {
  const app = express();
  
  // Accept payload sizes up to 10MB
  app.use(express.json({ limit: '10mb' }));

  // --- AUTHENTICATION ENDPOINTS ---
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const result = registerUser(username, password);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ message: result.message });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const result = loginUser(username, password);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ token: result.token, message: result.message, username: username.toLowerCase().trim() });
  });

  app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
    const username = (req as any).username;
    return res.json({ username });
  });

  // --- ISOLATED USER-SCOPED HISTORY ENDPOINTS ---
  app.get('/api/history', authMiddleware, (req: Request, res: Response) => {
    const username = (req as any).username;
    const history = getUserHistory(username);
    return res.json(history);
  });

  app.post('/api/history', authMiddleware, (req: Request, res: Response) => {
    const username = (req as any).username;
    const { item } = req.body;
    if (!item) {
      return res.status(400).json({ error: 'History item is required.' });
    }
    const success = addUserHistoryItem(username, item);
    if (!success) {
      return res.status(500).json({ error: 'Failed to save history item.' });
    }
    return res.json({ success: true, message: 'History item saved successfully.' });
  });

  app.put('/api/history/:id', authMiddleware, (req: Request, res: Response) => {
    const username = (req as any).username;
    const itemId = req.params.id;
    const { chatHistory } = req.body;
    if (!chatHistory) {
      return res.status(400).json({ error: 'chatHistory is required.' });
    }
    const success = updateUserHistoryItem(username, itemId, (item) => ({
      ...item,
      chatHistory
    }));
    if (!success) {
      return res.status(404).json({ error: 'History item not found or update failed.' });
    }
    return res.json({ success: true, message: 'History item updated successfully.' });
  });

  app.delete('/api/history/clear', authMiddleware, (req: Request, res: Response) => {
    const username = (req as any).username;
    const success = clearUserHistory(username);
    if (!success) {
      return res.status(500).json({ error: 'Failed to clear history.' });
    }
    return res.json({ success: true, message: 'History cleared successfully.' });
  });

  app.delete('/api/history/:id', authMiddleware, (req: Request, res: Response) => {
    const username = (req as any).username;
    const itemId = req.params.id;
    const success = removeUserHistoryItem(username, itemId);
    if (!success) {
      return res.status(404).json({ error: 'History item not found or deletion failed.' });
    }
    return res.json({ success: true, message: 'History item deleted successfully.' });
  });
  
  // Handle server-side API endpoints FIRST before Vite middleware
  app.post('/api/gemini/generate', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { prompt, mode, code, language } = req.body;
      
      if (!prompt && !code && mode !== 'concept') {
        return res.status(400).json({ error: 'Either prompt or code must be provided.' });
      }
      
      if (!mode) {
        return res.status(400).json({ error: 'Action mode is required.' });
      }
      
      const ai = getGeminiClient();
      
      // Select appropriate config & system instruction depending on the request mode
      let systemInstruction = 'You are an elite coding assistant. Follow clean code, industry standards, secure programming practices, and provide helpful outputs.';
      let responseSchema: any = null;
      let modelPrompt = '';
      
      switch (mode) {
        case 'generate':
          systemInstruction = `You are a professional software engineer. Generate solid, fully functional code in the requested programming language. Strictly adhere to standard practices, clean structure, accurate logic, and include complete modules instead of placeholders. Identify the programming language if not specified. Define and return the time and space complexity clearly.`;
          modelPrompt = `Requirements: ${prompt}\n${language ? `Requested Language: ${language}` : 'Determine the best language for this task.'}\nGenerate the requested asset and provide the requested structured details.`;
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING, description: "The complete, syntactically correct, fully-functional generated code block alone." },
              explanation: { type: Type.STRING, description: "Step-by-step summary explanation of the logic, core structures, and approach used." },
              complexity: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING, description: "Time complexity notation, e.g., O(n log n)" },
                  space: { type: Type.STRING, description: "Space complexity notation, e.g., O(n)" }
                },
                required: ["time", "space"]
              },
              language: { type: Type.STRING, description: "The specific language identifier e.g. python, javascript, sql, rust." }
            },
            required: ["code", "explanation", "complexity", "language"]
          };
          break;
          
        case 'explain':
          systemInstruction = `You are an expert programming instructor. Your goal is to break down the provided code block and explain it in clear, beginner-friendly terms. Provide a detailed overview, followed by a precise line-by-line explanation mapping each essential code line or block to its direct descriptive purpose.`;
          modelPrompt = `Code block to explain:\n\`\`\`\n${code}\n\`\`\`\n${prompt ? `Additional context: ${prompt}` : ''}`;
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING, description: "A high-quality educational overview detailing the logical design, algorithmic flow, and pattern architecture of the whole file." },
              lineByLine: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    line: { type: Type.STRING, description: "The relevant code instruction or block." },
                    desc: { type: Type.STRING, description: "A simple, accessible, easy to understand explanation of what that block does." }
                  },
                  required: ["line", "desc"]
                },
                description: "Array matching consecutive lines/blocks of code to their humanized explanations."
              }
            },
            required: ["explanation", "lineByLine"]
          };
          break;
          
        case 'debug':
          systemInstruction = `You are a master debugging assistant. Analyze the given code for syntax errors, compilation bugs, edge-cases, memory leaks, and logical fallacies. Correct the issues, explain the root cause of every failure in detail, and provide an array of concrete recommendations or best practices.`;
          modelPrompt = `Code block to debug:\n\`\`\`\n${code}\n\`\`\`\n${prompt ? `Reported issues / error logs: ${prompt}` : ''}`;
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              fixedCode: { type: Type.STRING, description: "The fully corrected and debugged code block." },
              errors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific identified syntax, compile-time, runtime, or conceptual errors." },
              debugExplanation: { type: Type.STRING, description: "Detailed summary explaining the root causes of the bugs and what was wrong." },
              debugSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Concrete best-practice recommendations to avoid duplicate bugs." }
            },
            required: ["fixedCode", "errors", "debugExplanation", "debugSuggestions"]
          };
          break;
          
        case 'optimize':
          systemInstruction = `You are an elite compiler and systems engineer. Analyze the code segment to detect performance bottlenecks, high space-complexity, excessive garbage collection, redundant operations, or database locks. Rewrite the code to optimize speed and resource usage without altering external output behavior.`;
          modelPrompt = `Original code:\n\`\`\`\n${code}\n\`\`\`\n${prompt ? `Optimization target: ${prompt}` : 'General speed & memory optimizations.'}`;
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              optimizedCode: { type: Type.STRING, description: "The optimized, clean, refactored version of the code segment." },
              speedup: { type: Type.STRING, description: "Estimated performance improvements (e.g., '60% faster runtime', 'O(n) reduced space')." },
              changes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Fine-grained details of the algorithmic adjustments and improvements." },
              complexityBefore: { type: Type.STRING, description: "Time and Space complexity of original code." },
              complexityAfter: { type: Type.STRING, description: "Time and Space complexity of the optimized code." }
            },
            required: ["optimizedCode", "speedup", "changes", "complexityBefore", "complexityAfter"]
          };
          break;
          
        case 'document':
          systemInstruction = `You are a technical documentation lead. Add industry-standard comments (JSDoc, Python docstrings, JavaDocs, etc.) directly inside the source code to turn it into highly readable code block. Then, write separate, complete, rich Markdown reference documentation detailing prerequisites, installation, full usage examples, types, and architecture.`;
          modelPrompt = `Source code:\n\`\`\`\n${code}\n\`\`\`\n${prompt ? `Documentation focus: ${prompt}` : ''}`;
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              commentedCode: { type: Type.STRING, description: "The exact source code enriched with flawless, professional, neat inline comments and standard docstrings." },
              readme: { type: Type.STRING, description: "A robust, standalone, developer-ready Markdown documentation file describing the code details, setup, usage instructions, and parameter properties." }
            },
            required: ["commentedCode", "readme"]
          };
          break;
          
        case 'concept':
          systemInstruction = `You are a friendly computer science professor. Answer the user's conceptual or technical programming questions. Break down the concept, explain how it operates behind the scenes, provide extensive code or logical examples, and curate custom interactive coding exercises to test and build their mastery.`;
          modelPrompt = `Concept or topic to learn: ${prompt || 'Code syntax structure'}`;
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              conceptTitle: { type: Type.STRING, description: "The exact name of the concept." },
              conceptExplanation: { type: Type.STRING, description: "Comprehensive but plain-English tutorial explaining the theory, lifecycle, and mechanics of the concept." },
              conceptExamples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Clear, isolated code snippets of the concept in action." },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Compact heading for the exercise task." },
                    question: { type: Type.STRING, description: "Detailed coding assignment statement." },
                    starterCode: { type: Type.STRING, description: "Template snippet with gaps/todo comments to start with." },
                    solution: { type: Type.STRING, description: "The fully implemented reference code representing the solution." }
                  },
                  required: ["title", "question", "starterCode", "solution"]
                },
                description: "List of 2 customized coding challenges appropriate to test this concept."
              }
            },
            required: ["conceptTitle", "conceptExplanation", "conceptExamples", "exercises"]
          };
          break;
          
        case 'review':
          systemInstruction = `You are a critical source code auditor and lead tech reviewer. Inspect code segment for structural code smells, performance pitfalls, safety hazards, styling guide violations, and nomenclature patterns. Provide a comprehensive quantitative review score from 1 to 100, lists of code smells and actionable recommendation items, and analyze identifier naming quality.`;
          modelPrompt = `Code block to review:\n\`\`\`\n${code}\n\`\`\`\n${prompt ? `Focus review on: ${prompt}` : ''}`;
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              reviewScore: { type: Type.INTEGER, description: "An integer score from 0-100 indicating code maturity, correctness, and speed." },
              smells: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Identified anti-patterns, potential styling violations, dead code, or safety issues." },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Concrete code changes requested for the next review cycle." },
              nomenclature: {
                type: Type.OBJECT,
                properties: {
                  valid: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Identified correct naming matches (camelCase or snake_case as per style guide)." },
                  invalid: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Confusing, uninformative, or improperly cased variable/function identifiers." },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nomenclature updates with clear alternative matching listings." }
                },
                required: ["valid", "invalid", "suggestions"]
              }
            },
            required: ["reviewScore", "smells", "recommendations", "nomenclature"]
          };
          break;
          
        default:
          return res.status(400).json({ error: `Unsupported mode "${mode}".` });
      }
      
      const response = await generateContentWithRetryAndFallback(
        ai,
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        {
          contents: modelPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema
          }
        }
      );
      
      if (!response.text) {
        throw new Error('Gemini did not return any textual response.');
      }
      
      const responseData = JSON.parse(response.text.trim());
      return res.json(responseData);
      
    } catch (error: any) {
      console.error('Gemini call failure:', error);
      return res.status(500).json({ 
        error: error.message || 'Something went wrong during Gemini processing.' 
      });
    }
  });

  app.post('/api/gemini/chat', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { messages, codeContext, language } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required.' });
      }
      
      const ai = getGeminiClient();
      
      // Build context of code
      let codePrompt = '';
      if (codeContext && codeContext.trim()) {
        codePrompt = `Here is the current code block state (${language || 'Unknown language'}):\n\`\`\`\n${codeContext.trim()}\n\`\`\`\n\n`;
      }
      
      // Format conversation history
      const formattedHistory = messages.map(msg => {
        const speaker = msg.sender === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.text}`;
      }).join('\n\n');
      
      const systemInstruction = `You are an interactive AI Coding Assistant. Discuss the codebase, answer inquiries, explain logic, and suggest refactoring steps. Be polite, clear, and highly professional. Return your response in JSON format specified below.`;
      
      const promptMessage = `Conversation thread:\n\n${formattedHistory}\n\nPlease generate the assistant's next follow-up message. If relevant (such as when requested to make modifications, correct errors, optimize logic, or refactor), provide an updated complete copy of the code block.`;
      
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The conversational response message text. Use markdown if helpful to format details, list bullet points, explanation details, etc." },
          code: { type: Type.STRING, description: "Optional. An updated, full copy of the entire code block incorporating user changes, fixes, or suggested refactoring (if relevant to the conversation), or empty/omitted if no code modifications were requested or are necessary in this turn." }
        },
        required: ["text"]
      };
      
      const response = await generateContentWithRetryAndFallback(
        ai,
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        {
          contents: codePrompt + promptMessage,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema
          }
        }
      );
      
      if (!response.text) {
        throw new Error('Gemini did not return any textual response.');
      }
      
      const parsed = JSON.parse(response.text.trim());
      return res.json(parsed);
      
    } catch (error: any) {
      console.error('Chat endpoint error:', error);
      return res.status(500).json({ 
        error: error.message || 'Something went wrong during interactive chat processing.' 
      });
    }
  });
  
  // Mounted Vite development / production middleware as instructed in guidelines
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
