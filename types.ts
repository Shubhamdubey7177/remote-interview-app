export enum Sender {
  USER = 'user',
  REMOTE = 'remote',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: number;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  examples: ProblemExample[];
  starterCode: string;
}

export interface ExecutionResult {
  passed: boolean;
  output: string;
  error?: string;
  feedback: string;
  testCasesPassed?: number;
  totalTestCases?: number;
}

// P2P Data Types
export type SyncType = 'CODE' | 'PROBLEM' | 'CHAT' | 'RESULT';

export interface P2PData {
  type: SyncType;
  payload: any;
}
