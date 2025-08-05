import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { CodingAgent } from './agent';
import { AgentConfig, GmailConfig } from './types';

// Load environment variables
dotenv.config();

export class CLI {
  private agent: CodingAgent;
  private rl: readline.Interface;

  constructor() {
    const config: AgentConfig = {
      name: process.env.AGENT_NAME || 'CodingAgent',
      maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.TEMPERATURE || '0.1'),
      apiKey: process.env.OPENAI_API_KEY || ''
    };

    if (!config.apiKey) {
      console.error('❌ OPENAI_API_KEY is required. Please set it in your .env file.');
      console.log('You can copy env.example to .env and add your OpenAI API key.');
      process.exit(1);
    }

    // Initialize Gmail config if credentials file exists
    let gmailConfig: GmailConfig | undefined;
    const credentialsPath = process.env.GMAIL_CREDENTIALS_PATH || 'credentials.json';
    
    try {
      if (require('fs').existsSync(credentialsPath)) {
        gmailConfig = {
          credentialsPath,
          tokenPath: process.env.GMAIL_TOKEN_PATH || 'token.json',
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.compose'
          ]
        };
        console.log('📧 Gmail API configured');
      }
    } catch (error) {
      console.log('📧 Gmail API not configured (credentials.json not found)');
    }

    this.agent = new CodingAgent(config, gmailConfig);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private async displayWelcome(): Promise<void> {
    console.log('\n🤖 Welcome to the Coding Agent with MCP & Gmail!');
    console.log('I can help you with:');
    console.log('  • Reading, writing, and editing files');
    console.log('  • Running bash commands');
    console.log('  • Coding tasks and debugging');
    console.log('  • Reading and writing emails (Gmail API)');
    console.log('  • Email context analysis and MCP reasoning');
    console.log('\nType "help" for available commands, "quit" to exit.\n');
  }

  private async displayHelp(): Promise<void> {
    console.log('\n📚 Available Commands:');
    console.log('  help                    - Show this help message');
    console.log('  quit, exit              - Exit the agent');
    console.log('  clear                   - Clear the conversation history');
    console.log('  context                 - Show current context');
    console.log('  cd <directory>          - Change current directory');
    console.log('  ls, list               - List files in current directory');
    console.log('  read <file>            - Read a file');
    console.log('  write <file> <content> - Write content to a file');
    console.log('  run <command>          - Execute a bash command');
    console.log('');
    console.log('📧 Email Commands (Gmail API):');
    console.log('  emails                  - List recent emails');
    console.log('  unread                  - List unread emails');
    console.log('  search <query>         - Search emails');
    console.log('  email <id>             - Get specific email');
    console.log('  send <to> <subject> <body> - Send email');
    console.log('  draft <to> <subject> <body> - Create draft');
    console.log('  read-email <id>        - Mark email as read');
    console.log('  delete-email <id>      - Delete email');
    console.log('  analyze <thread-id>    - Analyze email thread');
    console.log('  <any other message>    - Chat with the AI agent\n');
  }

  private async handleSpecialCommands(input: string): Promise<boolean> {
    const trimmed = input.trim();
    
    switch (trimmed.toLowerCase()) {
      case 'help':
        await this.displayHelp();
        return true;
      
      case 'quit':
      case 'exit':
        console.log('\n👋 Goodbye!');
        this.rl.close();
        process.exit(0);
        return true;
      
      case 'clear':
        console.log('\n🧹 Conversation history cleared.');
        return true;
      
      case 'context':
        const context = this.agent.getContext();
        const mcpContext = await this.agent.getMCPContext();
        console.log('\n📁 Current Context:');
        console.log(`  Directory: ${context.currentDirectory}`);
        console.log(`  Recent files: ${context.recentFiles.slice(-5).join(', ')}`);
        console.log(`  Recent commands: ${context.recentCommands.slice(-5).join(', ')}`);
        console.log(`  Conversation messages: ${context.conversationHistory.length}`);
        console.log(`  Gmail available: ${mcpContext.gmailAvailable ? '✅' : '❌'}`);
        return true;
      
      default:
        return false;
    }
  }

  private async handleBuiltInCommands(input: string): Promise<boolean> {
    const parts = input.trim().split(' ');
    const command = parts[0].toLowerCase();
    
    switch (command) {
      case 'cd':
        if (parts.length < 2) {
          console.log('❌ Usage: cd <directory>');
          return true;
        }
        try {
          this.agent.setCurrentDirectory(parts[1]);
          console.log(`📁 Changed directory to: ${parts[1]}`);
        } catch (error) {
          console.log(`❌ Failed to change directory: ${error}`);
        }
        return true;
      
      case 'ls':
      case 'list':
        const listResult = await this.agent.listFiles();
        if (listResult.success && listResult.data) {
          console.log('\n📁 Files in current directory:');
          listResult.data.forEach((file: any) => {
            const icon = file.isDirectory ? '📁' : '📄';
            console.log(`  ${icon} ${file.name}`);
          });
        } else {
          console.log(`❌ ${listResult.message}`);
        }
        return true;
      
      case 'read':
        if (parts.length < 2) {
          console.log('❌ Usage: read <file>');
          return true;
        }
        const readResult = await this.agent.readFile(parts[1]);
        if (readResult.success && readResult.data) {
          console.log(`\n📄 Contents of ${parts[1]}:`);
          console.log('─'.repeat(50));
          console.log(readResult.data);
          console.log('─'.repeat(50));
        } else {
          console.log(`❌ ${readResult.message}`);
        }
        return true;
      
      case 'write':
        if (parts.length < 3) {
          console.log('❌ Usage: write <file> <content>');
          return true;
        }
        const content = parts.slice(2).join(' ');
        const writeResult = await this.agent.writeFile(parts[1], content);
        if (writeResult.success) {
          console.log(`✅ ${writeResult.message}`);
        } else {
          console.log(`❌ ${writeResult.message}`);
        }
        return true;
      
      case 'run':
        if (parts.length < 2) {
          console.log('❌ Usage: run <command>');
          return true;
        }
        const cmd = parts.slice(1).join(' ');
        console.log(`🚀 Executing: ${cmd}`);
        const runResult = await this.agent.executeCommand(cmd);
        if (runResult.success && runResult.data) {
          console.log('\n📤 Output:');
          console.log('─'.repeat(50));
          console.log(runResult.data.output);
          if (runResult.data.error) {
            console.log('\n❌ Error:');
            console.log(runResult.data.error);
          }
          console.log('─'.repeat(50));
        } else {
          console.log(`❌ ${runResult.message}`);
        }
        return true;
      
      // Gmail commands
      case 'emails':
        console.log('📧 Fetching recent emails...');
        const emailsResult = await this.agent.listEmails();
        if (emailsResult.success && emailsResult.data) {
          const emails = emailsResult.data.messages || [];
          console.log(`\n📧 Recent emails (${emails.length}):`);
          emails.forEach((email: any, index: number) => {
            const status = email.isRead ? '📖' : '📨';
            console.log(`  ${index + 1}. ${status} ${email.subject} - ${email.from}`);
            console.log(`     ${email.snippet.substring(0, 50)}...`);
          });
        } else {
          console.log(`❌ ${emailsResult.message}`);
        }
        return true;
      
      case 'unread':
        console.log('📨 Fetching unread emails...');
        const unreadResult = await this.agent.getUnreadEmails();
        if (unreadResult.success && unreadResult.data) {
          const emails = unreadResult.data.messages || [];
          console.log(`\n📨 Unread emails (${emails.length}):`);
          emails.forEach((email: any, index: number) => {
            console.log(`  ${index + 1}. 📨 ${email.subject} - ${email.from}`);
            console.log(`     ${email.snippet.substring(0, 50)}...`);
          });
        } else {
          console.log(`❌ ${unreadResult.message}`);
        }
        return true;
      
      case 'search':
        if (parts.length < 2) {
          console.log('❌ Usage: search <query>');
          return true;
        }
        const query = parts.slice(1).join(' ');
        console.log(`🔍 Searching emails for: ${query}`);
        const searchResult = await this.agent.searchEmails(query);
        if (searchResult.success && searchResult.data) {
          const emails = searchResult.data.messages || [];
          console.log(`\n🔍 Search results (${emails.length}):`);
          emails.forEach((email: any, index: number) => {
            const status = email.isRead ? '📖' : '📨';
            console.log(`  ${index + 1}. ${status} ${email.subject} - ${email.from}`);
            console.log(`     ${email.snippet.substring(0, 50)}...`);
          });
        } else {
          console.log(`❌ ${searchResult.message}`);
        }
        return true;
      
      case 'email':
        if (parts.length < 2) {
          console.log('❌ Usage: email <message-id>');
          return true;
        }
        console.log(`📧 Fetching email: ${parts[1]}`);
        const emailResult = await this.agent.getEmail(parts[1]);
        if (emailResult.success && emailResult.data) {
          const email = emailResult.data;
          console.log(`\n📧 Email Details:`);
          console.log('─'.repeat(50));
          console.log(`Subject: ${email.subject}`);
          console.log(`From: ${email.from}`);
          console.log(`To: ${email.to.join(', ')}`);
          console.log(`Date: ${email.date}`);
          console.log(`Read: ${email.isRead ? 'Yes' : 'No'}`);
          console.log(`Attachments: ${email.hasAttachments ? 'Yes' : 'No'}`);
          console.log('\nBody:');
          console.log('─'.repeat(50));
          console.log(email.body);
          console.log('─'.repeat(50));
        } else {
          console.log(`❌ ${emailResult.message}`);
        }
        return true;
      
      case 'send':
        if (parts.length < 4) {
          console.log('❌ Usage: send <to> <subject> <body>');
          return true;
        }
        const to = parts[1];
        const subject = parts[2];
        const body = parts.slice(3).join(' ');
        
        const draft = {
          to: [to],
          subject,
          body
        };
        
        console.log(`📧 Sending email to: ${to}`);
        const sendResult = await this.agent.sendEmail(draft);
        if (sendResult.success) {
          console.log(`✅ ${sendResult.message}`);
        } else {
          console.log(`❌ ${sendResult.message}`);
        }
        return true;
      
      case 'draft':
        if (parts.length < 4) {
          console.log('❌ Usage: draft <to> <subject> <body>');
          return true;
        }
        const draftTo = parts[1];
        const draftSubject = parts[2];
        const draftBody = parts.slice(3).join(' ');
        
        const emailDraft = {
          to: [draftTo],
          subject: draftSubject,
          body: draftBody
        };
        
        console.log(`📝 Creating draft for: ${draftTo}`);
        const draftResult = await this.agent.createDraft(emailDraft);
        if (draftResult.success) {
          console.log(`✅ ${draftResult.message}`);
        } else {
          console.log(`❌ ${draftResult.message}`);
        }
        return true;
      
      case 'read-email':
        if (parts.length < 2) {
          console.log('❌ Usage: read-email <message-id>');
          return true;
        }
        console.log(`📖 Marking email as read: ${parts[1]}`);
        const readEmailResult = await this.agent.markAsRead(parts[1]);
        if (readEmailResult.success) {
          console.log(`✅ ${readEmailResult.message}`);
        } else {
          console.log(`❌ ${readEmailResult.message}`);
        }
        return true;
      
      case 'delete-email':
        if (parts.length < 2) {
          console.log('❌ Usage: delete-email <message-id>');
          return true;
        }
        console.log(`🗑️ Deleting email: ${parts[1]}`);
        const deleteResult = await this.agent.deleteEmail(parts[1]);
        if (deleteResult.success) {
          console.log(`✅ ${deleteResult.message}`);
        } else {
          console.log(`❌ ${deleteResult.message}`);
        }
        return true;
      
      case 'analyze':
        if (parts.length < 2) {
          console.log('❌ Usage: analyze <thread-id>');
          return true;
        }
        console.log(`🔍 Analyzing email thread: ${parts[1]}`);
        const analyzeResult = await this.agent.analyzeEmailThread(parts[1]);
        if (analyzeResult.success && analyzeResult.data) {
          const analysis = analyzeResult.data;
          console.log(`\n📊 Thread Analysis:`);
          console.log('─'.repeat(50));
          console.log(`Thread ID: ${analysis.threadId}`);
          console.log(`Message Count: ${analysis.messageCount}`);
          console.log(`Participants: ${Array.from(analysis.participants).join(', ')}`);
          console.log(`Subjects: ${Array.from(analysis.subjects).join(', ')}`);
          console.log(`Has Attachments: ${analysis.hasAttachments ? 'Yes' : 'No'}`);
          console.log('─'.repeat(50));
        } else {
          console.log(`❌ ${analyzeResult.message}`);
        }
        return true;
      
      default:
        return false;
    }
  }

  private async promptUser(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question('🤖 > ', (answer) => {
        resolve(answer);
      });
    });
  }

  async start(): Promise<void> {
    await this.displayWelcome();
    
    while (true) {
      try {
        const input = await this.promptUser();
        
        if (!input.trim()) {
          continue;
        }

        // Handle special commands first
        if (await this.handleSpecialCommands(input)) {
          continue;
        }

        // Handle built-in commands
        if (await this.handleBuiltInCommands(input)) {
          continue;
        }

        // Process with AI agent
        console.log('\n🤔 Processing...');
        const response = await this.agent.processMessage(input);
        console.log(`\n💬 ${response}\n`);

      } catch (error) {
        console.error('❌ Error:', error);
      }
    }
  }
}

// Start the CLI if this file is run directly
if (require.main === module) {
  const cli = new CLI();
  cli.start().catch(console.error);
} 