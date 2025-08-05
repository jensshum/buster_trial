import { OpenAI } from 'openai';
import { AgentConfig, AgentContext, AgentMessage, ToolResult, GmailConfig } from './types';
import { FileTools } from './tools/fileTools';
import { CommandTools } from './tools/commandTools';
import { GmailTools } from './tools/gmailTools';

export class CodingAgent {
  private config: AgentConfig;
  private context: AgentContext;
  private openai: OpenAI;
  private fileTools: FileTools;
  private commandTools: CommandTools;
  private gmailTools?: GmailTools;

  constructor(config: AgentConfig, gmailConfig?: GmailConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
    });

    this.fileTools = new FileTools();
    this.commandTools = new CommandTools();

    // Initialize Gmail tools if config is provided
    if (gmailConfig) {
      this.gmailTools = new GmailTools(gmailConfig);
    }

    this.context = {
      currentDirectory: process.cwd(),
      recentFiles: [],
      recentCommands: [],
      conversationHistory: []
    };
  }

  private async generateSystemPrompt(): Promise<string> {
    const currentDir = this.fileTools.getCurrentDirectory();
    const files = await this.fileTools.listFiles('.');
    
    let fileList = '';
    if (files.success && files.data) {
      fileList = files.data
        .slice(0, 10) // Limit to 10 most recent files
        .map((file: any) => `${file.isDirectory ? '[DIR]' : '[FILE]'} ${file.name}`)
        .join('\n');
    }

    let gmailCapabilities = '';
    if (this.gmailTools) {
      gmailCapabilities = `
Email capabilities (Gmail API):
- listEmails(): List recent emails
- getEmail(messageId): Get specific email details
- sendEmail(draft): Send an email
- createDraft(draft): Create email draft
- searchEmails(query): Search emails
- getUnreadEmails(): Get unread emails
- markAsRead(messageId): Mark email as read
- deleteEmail(messageId): Delete email
- getEmailContext(messageId): Get email context for MCP
- analyzeEmailThread(threadId): Analyze email thread
`;
    }

    return `You are ${this.config.name}, a helpful coding assistant with MCP (Model Context Protocol) capabilities. You can:

1. Read, write, and edit files
2. Execute bash commands
3. Help with coding tasks and debugging
${this.gmailTools ? '4. Read and write emails via Gmail API' : ''}

Current directory: ${currentDir}
Recent files:
${fileList}

Available tools:
- readFile(filePath): Read the contents of a file
- writeFile(filePath, content): Write content to a file
- editFile(filePath, newContent): Edit an existing file
- executeCommand(command): Execute a bash command
- listFiles(directory): List files in a directory${gmailCapabilities}

MCP Context: You can understand and reason about email content, threads, and relationships. When working with emails, consider:
- Email context and threading
- Sender/recipient relationships
- Content analysis and summarization
- Action items and follow-ups
- Attachment handling

Always be helpful, explain your actions, and ensure commands are safe before executing them.`;
  }

  private async callOpenAI(messages: any[]): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return response.choices[0]?.message?.content || 'No response from AI';
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return 'Sorry, I encountered an error while processing your request.';
    }
  }

  private async parseAndExecuteTools(response: string): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    // Enhanced tool parsing to include Gmail functions
    const toolCalls = response.match(/\b(readFile|writeFile|editFile|executeCommand|listFiles|listEmails|getEmail|sendEmail|createDraft|searchEmails|getUnreadEmails|markAsRead|deleteEmail|getEmailContext|analyzeEmailThread)\s*\([^)]+\)/g);
    
    if (toolCalls) {
      for (const toolCall of toolCalls) {
        try {
          // Extract function name and arguments
          const match = toolCall.match(/(\w+)\s*\(([^)]+)\)/);
          if (match) {
            const [, funcName, argsStr] = match;
            const args = argsStr.split(',').map(arg => arg.trim().replace(/['"]/g, ''));
            
            let result: ToolResult;
            
            switch (funcName) {
              case 'readFile':
                result = await this.fileTools.readFile(args[0]);
                break;
              case 'writeFile':
                result = await this.fileTools.writeFile(args[0], args[1]);
                break;
              case 'editFile':
                result = await this.fileTools.editFile(args[0], args[1]);
                break;
              case 'executeCommand':
                if (this.commandTools.isSafeCommand(args[0])) {
                  result = await this.commandTools.executeCommand(args[0]);
                } else {
                  result = {
                    success: false,
                    error: 'Command blocked for safety',
                    message: `Command blocked: ${args[0]}`
                  };
                }
                break;
              case 'listFiles':
                result = await this.fileTools.listFiles(args[0] || '.');
                break;
              // Gmail API functions
              case 'listEmails':
                if (this.gmailTools) {
                  result = await this.gmailTools.listEmails();
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              case 'getEmail':
                if (this.gmailTools) {
                  result = await this.gmailTools.getEmail(args[0]);
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              case 'searchEmails':
                if (this.gmailTools) {
                  result = await this.gmailTools.searchEmails(args[0], parseInt(args[1]) || 10);
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              case 'getUnreadEmails':
                if (this.gmailTools) {
                  result = await this.gmailTools.getUnreadEmails(parseInt(args[0]) || 10);
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              case 'markAsRead':
                if (this.gmailTools) {
                  result = await this.gmailTools.markAsRead(args[0]);
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              case 'deleteEmail':
                if (this.gmailTools) {
                  result = await this.gmailTools.deleteEmail(args[0]);
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              case 'getEmailContext':
                if (this.gmailTools) {
                  result = await this.gmailTools.getEmailContext(args[0]);
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              case 'analyzeEmailThread':
                if (this.gmailTools) {
                  result = await this.gmailTools.analyzeEmailThread(args[0]);
                } else {
                  result = {
                    success: false,
                    error: 'Gmail tools not available',
                    message: 'Gmail functionality not configured'
                  };
                }
                break;
              default:
                result = {
                  success: false,
                  error: 'Unknown tool',
                  message: `Unknown tool: ${funcName}`
                };
            }
            
            results.push(result);
          }
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: `Failed to execute tool: ${toolCall}`
          });
        }
      }
    }
    
    return results;
  }

  async processMessage(userMessage: string): Promise<string> {
    // Add user message to conversation history
    this.context.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Generate system prompt
    const systemPrompt = await this.generateSystemPrompt();
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.context.conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Get AI response
    const aiResponse = await this.callOpenAI(messages);
    
    // Parse and execute any tools mentioned in the response
    const toolResults = await this.parseAndExecuteTools(aiResponse);
    
    // Format the response with tool results
    let finalResponse = aiResponse;
    if (toolResults.length > 0) {
      finalResponse += '\n\nTool Results:\n';
      toolResults.forEach((result, index) => {
        finalResponse += `${index + 1}. ${result.message}\n`;
        if (result.error) {
          finalResponse += `   Error: ${result.error}\n`;
        }
        if (result.data && typeof result.data === 'string') {
          finalResponse += `   Data: ${result.data.substring(0, 200)}${result.data.length > 200 ? '...' : ''}\n`;
        }
      });
    }

    // Add assistant response to conversation history
    this.context.conversationHistory.push({
      role: 'assistant',
      content: finalResponse,
      timestamp: new Date()
    });

    return finalResponse;
  }

  // Direct tool access methods for more precise control
  async readFile(filePath: string): Promise<ToolResult> {
    return await this.fileTools.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<ToolResult> {
    return await this.fileTools.writeFile(filePath, content);
  }

  async editFile(filePath: string, newContent: string): Promise<ToolResult> {
    return await this.fileTools.editFile(filePath, newContent);
  }

  async executeCommand(command: string): Promise<ToolResult> {
    if (!this.commandTools.isSafeCommand(command)) {
      return {
        success: false,
        error: 'Command blocked for safety',
        message: `Command blocked: ${command}`
      };
    }
    return await this.commandTools.executeCommand(command);
  }

  async listFiles(directory: string = '.'): Promise<ToolResult> {
    return await this.fileTools.listFiles(directory);
  }

  // Gmail API methods
  async listEmails(options?: any): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.listEmails(options);
  }

  async getEmail(messageId: string): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.getEmail(messageId);
  }

  async sendEmail(draft: any): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.sendEmail(draft);
  }

  async createDraft(draft: any): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.createDraft(draft);
  }

  async searchEmails(query: string, maxResults: number = 10): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.searchEmails(query, maxResults);
  }

  async getUnreadEmails(maxResults: number = 10): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.getUnreadEmails(maxResults);
  }

  async markAsRead(messageId: string): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.markAsRead(messageId);
  }

  async deleteEmail(messageId: string): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.deleteEmail(messageId);
  }

  async getEmailContext(messageId: string): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.getEmailContext(messageId);
  }

  async analyzeEmailThread(threadId: string): Promise<ToolResult> {
    if (!this.gmailTools) {
      return {
        success: false,
        error: 'Gmail tools not available',
        message: 'Gmail functionality not configured'
      };
    }
    return await this.gmailTools.analyzeEmailThread(threadId);
  }

  getContext(): AgentContext {
    return { ...this.context };
  }

  setCurrentDirectory(directory: string): void {
    this.context.currentDirectory = directory;
    this.fileTools.setCurrentDirectory(directory);
    this.commandTools.setCurrentDirectory(directory);
  }

  // MCP-specific methods for enhanced context and reasoning
  async getMCPContext(): Promise<any> {
    const context = {
      currentDirectory: this.context.currentDirectory,
      recentFiles: this.context.recentFiles,
      recentCommands: this.context.recentCommands,
      conversationHistory: this.context.conversationHistory.length,
      gmailAvailable: !!this.gmailTools
    };

    return context;
  }
} 