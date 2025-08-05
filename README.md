# Coding Agent with MCP & Gmail 🤖📧

A simple coding agent similar to Claude Code, built with TypeScript and the AI SDK. This agent can read, write, and edit files, run bash commands, help with coding tasks, and manage emails through Gmail API with MCP (Model Context Protocol) capabilities.

## Features

- **File Operations**: Read, write, and edit files
- **Command Execution**: Run bash commands safely with built-in safety checks
- **AI Integration**: Powered by OpenAI GPT-4 for intelligent responses
- **Interactive CLI**: User-friendly command-line interface
- **Context Awareness**: Maintains conversation history and current directory state
- **Safety Features**: Blocks dangerous commands and provides error handling
- **Gmail Integration**: Read, write, and manage emails via Gmail API
- **MCP Capabilities**: Model Context Protocol for enhanced email reasoning and analysis

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key
- Gmail API credentials (optional)

## Installation

1. **Clone or download this project**
   ```bash
   git clone <repository-url>
   cd coding_agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   AGENT_NAME=CodingAgent
   MAX_TOKENS=4000
   TEMPERATURE=0.1
   
   # Gmail API Configuration (Optional)
   GMAIL_CREDENTIALS_PATH=credentials.json
   GMAIL_TOKEN_PATH=token.json
   ```

4. **Set up Gmail API (Optional)**
   
   To enable email functionality:
   
   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   b. Create a new project or select existing one
   c. Enable Gmail API
   d. Create OAuth 2.0 credentials
   e. Download credentials and save as `credentials.json`
   f. Copy `credentials.example` to `credentials.json` and update with your values

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Direct Execution
```bash
npx ts-node src/index.ts
```

## Available Commands

### Built-in Commands
- `help` - Show help message
- `quit` or `exit` - Exit the agent
- `clear` - Clear conversation history
- `context` - Show current context
- `cd <directory>` - Change current directory
- `ls` or `list` - List files in current directory
- `read <file>` - Read a file
- `write <file> <content>` - Write content to a file
- `run <command>` - Execute a bash command

### Email Commands (Gmail API)
- `emails` - List recent emails
- `unread` - List unread emails
- `search <query>` - Search emails
- `email <id>` - Get specific email details
- `send <to> <subject> <body>` - Send email
- `draft <to> <subject> <body>` - Create email draft
- `read-email <id>` - Mark email as read
- `delete-email <id>` - Delete email
- `analyze <thread-id>` - Analyze email thread

### AI Chat
Any other message will be processed by the AI agent, which can:
- Understand natural language requests
- Execute file operations
- Run commands when appropriate
- Provide coding assistance
- Manage emails intelligently
- Analyze email context and relationships

## Examples

### Basic File Operations
```
🤖 > ls
📁 Files in current directory:
  📄 package.json
  📄 tsconfig.json
  📁 src/

🤖 > read package.json
📄 Contents of package.json:
──────────────────────────────────────────────────
{
  "name": "coding_agent",
  "version": "1.0.0",
  ...
}
──────────────────────────────────────────────────

🤖 > write test.txt Hello World!
✅ Successfully wrote file: test.txt
```

### Email Operations
```
🤖 > emails
📧 Recent emails (5):
  1. 📖 Meeting Tomorrow - john@example.com
     Hi, let's meet tomorrow at 2 PM...
  2. 📨 Project Update - sarah@company.com
     Here's the latest update on the project...

🤖 > search urgent
🔍 Search results (2):
  1. 📨 Urgent: Server Down - admin@company.com
     The production server is down...
  2. 📖 Urgent Meeting - manager@company.com
     Emergency meeting at 3 PM...

🤖 > send john@example.com "Meeting Confirmation" "Hi John, I confirm our meeting tomorrow at 2 PM."
📧 Sending email to: john@example.com
✅ Successfully sent email: Meeting Confirmation

🤖 > analyze 18b7c1d2e3f4a5b6
🔍 Analyzing email thread: 18b7c1d2e3f4a5b6
📊 Thread Analysis:
──────────────────────────────────────────────────
Thread ID: 18b7c1d2e3f4a5b6
Message Count: 5
Participants: john@example.com, sarah@company.com, me@company.com
Subjects: Project Discussion, Re: Project Discussion, Re: Re: Project Discussion
Has Attachments: Yes
──────────────────────────────────────────────────
```

### AI-Powered Email Assistance
```
🤖 > Summarize my unread emails
🤔 Processing...
💬 I'll help you summarize your unread emails. Let me fetch them first.

Tool Results:
1. Successfully retrieved 3 unread emails

Here's a summary of your unread emails:

1. **Meeting Tomorrow** from john@example.com
   - Snippet: "Hi, let's meet tomorrow at 2 PM to discuss the project timeline..."
   - Action needed: Reply with availability

2. **Project Update** from sarah@company.com  
   - Snippet: "Here's the latest update on the project. We've completed phase 1..."
   - Action needed: Review and provide feedback

3. **Urgent: Server Issue** from admin@company.com
   - Snippet: "The production server is experiencing high load..."
   - Action needed: Immediate attention required

Would you like me to help you compose responses to any of these emails?
```

### Command Execution
```
🤖 > run pwd
🚀 Executing: pwd
📤 Output:
──────────────────────────────────────────────────
/Users/username/projects/coding_agent
──────────────────────────────────────────────────

🤖 > run ls -la
🚀 Executing: ls -la
📤 Output:
──────────────────────────────────────────────────
total 1234
drwxr-xr-x  10 user  staff   320 Jan 15 10:30 .
drwxr-xr-x   3 user  staff    96 Jan 15 10:29 ..
...
──────────────────────────────────────────────────
```

## Project Structure

```
coding_agent/
├── src/
│   ├── types.ts              # TypeScript interfaces
│   ├── agent.ts              # Main agent class
│   ├── cli.ts                # Command-line interface
│   ├── index.ts              # Entry point
│   └── tools/
│       ├── fileTools.ts      # File system operations
│       ├── commandTools.ts   # Command execution
│       └── gmailTools.ts     # Gmail API operations
├── package.json
├── tsconfig.json
├── env.example
├── credentials.example
└── README.md
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `AGENT_NAME` (optional): Name of the agent (default: "CodingAgent")
- `MAX_TOKENS` (optional): Maximum tokens for AI responses (default: 4000)
- `TEMPERATURE` (optional): AI response creativity (default: 0.1)
- `GMAIL_CREDENTIALS_PATH` (optional): Path to Gmail API credentials file
- `GMAIL_TOKEN_PATH` (optional): Path to Gmail API token file

### Gmail API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Gmail API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Desktop application"
   - Download the JSON file

4. **Configure Credentials**
   - Rename the downloaded file to `credentials.json`
   - Place it in the project root directory
   - The agent will automatically detect and use it

### Safety Features

The agent includes several safety features:
- Blocks dangerous commands (rm -rf, format, etc.)
- Validates file paths before operations
- Provides detailed error messages
- Maintains conversation context safely
- Secure Gmail API authentication
- Email content validation

## MCP (Model Context Protocol) Features

The agent includes enhanced MCP capabilities for email management:

### Email Context Analysis
- **Thread Analysis**: Understand email conversation flows
- **Relationship Mapping**: Track sender/recipient relationships
- **Content Summarization**: Intelligent email content analysis
- **Action Item Extraction**: Identify tasks and follow-ups
- **Attachment Handling**: Manage email attachments

### Intelligent Email Management
- **Smart Search**: Natural language email queries
- **Context-Aware Responses**: Generate appropriate email replies
- **Priority Assessment**: Identify urgent vs. routine emails
- **Thread Continuity**: Maintain conversation context

### Example MCP Usage
```
🤖 > Analyze the email thread about the project deadline
🤔 Processing...
💬 I'll analyze the email thread to understand the project deadline discussion.

Tool Results:
1. Thread analysis completed for thread: 18b7c1d2e3f4a5b6

Based on the email thread analysis, here's what I found:

**Thread Summary:**
- 5 messages in the conversation
- Participants: john@example.com, sarah@company.com, me@company.com
- Subject evolution: "Project Discussion" → "Re: Project Discussion" → "Deadline Concerns"

**Key Points:**
1. Original deadline was set for next Friday
2. Sarah raised concerns about timeline feasibility
3. John suggested extending by one week
4. No final decision has been made

**Action Items:**
- Need to respond to John's proposal
- Consider timeline impact on other projects
- Schedule follow-up meeting if needed

Would you like me to help draft a response to this thread?
```

## Development

### Building
```bash
npm run build
```

### Running Tests
```bash
npm test
```

### TypeScript Compilation
```bash
npx tsc
```

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY is required"**
   - Make sure you've created a `.env` file with your OpenAI API key
   - Verify the API key is valid and has sufficient credits

2. **"Gmail functionality not configured"**
   - Ensure `credentials.json` exists in the project root
   - Verify the credentials file has correct OAuth 2.0 settings
   - Check that Gmail API is enabled in Google Cloud Console

3. **"Command blocked for safety"**
   - The agent blocks potentially dangerous commands
   - Use alternative safe commands or contact the agent for help

4. **"File not found"**
   - Check the file path is correct
   - Use `ls` to see available files in the current directory

5. **Gmail API Authentication Issues**
   - Delete `token.json` and restart the agent to re-authenticate
   - Ensure credentials.json has correct OAuth 2.0 settings
   - Check that Gmail API scopes are properly configured

6. **TypeScript compilation errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check that Node.js version is 16 or higher

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Acknowledgments

- Built with [AI SDK](https://v5.ai-sdk.dev/)
- Powered by OpenAI GPT-4
- Gmail API integration with Google Cloud
- Inspired by Claude Code
- MCP (Model Context Protocol) implementation 