/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssistantMode = 
  | 'generate' 
  | 'explain' 
  | 'debug' 
  | 'optimize' 
  | 'document' 
  | 'concept' 
  | 'review';

export interface CodeComplexity {
  time: string;
  space: string;
}

export interface LineExplanation {
  line: string;
  desc: string;
}

export interface ConceptExercise {
  title: string;
  question: string;
  starterCode: string;
  solution: string;
}

export interface ActionResponse {
  // Mode: Generate
  code?: string;
  explanation?: string;
  complexity?: CodeComplexity;
  language?: string;

  // Mode: Explain
  lineByLine?: LineExplanation[];

  // Mode: Debug
  fixedCode?: string;
  errors?: string[];
  debugExplanation?: string;
  debugSuggestions?: string[];

  // Mode: Optimize
  optimizedCode?: string;
  speedup?: string;
  changes?: string[];
  complexityBefore?: string;
  complexityAfter?: string;

  // Mode: Document
  commentedCode?: string;
  apiDocs?: string;
  readme?: string;

  // Mode: Concept
  conceptTitle?: string;
  conceptExplanation?: string;
  conceptExamples?: string[];
  exercises?: ConceptExercise[];

  // Mode: Review
  reviewScore?: number;
  recommendations?: string[];
  smells?: string[];
  nomenclature?: {
    valid: string[];
    invalid: string[];
    suggestions: string[];
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  code?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: string;
  language: string;
  mode: AssistantMode;
  prompt: string;
  codeContext?: string;
  response: ActionResponse;
  chatHistory?: ChatMessage[];
}
