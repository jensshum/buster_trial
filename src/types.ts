export interface AgentConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
}

export interface FileOperation {
  type: 'read' | 'write' | 'edit';
  path: string;
  content?: string;
}

export interface CommandExecution {
  command: string;
  output: string;
  error?: string;
  exitCode: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentContext {
  currentDirectory: string;
  recentFiles: string[];
  recentCommands: string[];
  conversationHistory: AgentMessage[];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message: string;
}

// Gmail API Types
export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  snippet: string;
  date: Date;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface EmailDraft {
  id?: string;
  subject: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface GmailConfig {
  credentialsPath: string;
  tokenPath: string;
  scopes: string[];
}

export interface EmailSearchOptions {
  query?: string;
  maxResults?: number;
  includeSpamTrash?: boolean;
  labelIds?: string[];
}

export interface EmailListResult {
  messages: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
} 