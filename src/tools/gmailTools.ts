import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import * as fs from 'fs';
import * as path from 'path';
import { 
  ToolResult, 
  EmailMessage, 
  EmailDraft, 
  EmailAttachment, 
  GmailConfig, 
  EmailSearchOptions,
  EmailListResult 
} from '../types';

export class GmailTools {
  private gmail: any;
  private config: GmailConfig;
  private isAuthenticated: boolean = false;

  constructor(config: GmailConfig) {
    this.config = config;
  }

  private async authenticate(): Promise<ToolResult> {
    try {
      if (this.isAuthenticated && this.gmail) {
        return {
          success: true,
          message: 'Already authenticated'
        };
      }

      const auth = await authenticate({
        keyfilePath: this.config.credentialsPath,
        scopes: this.config.scopes,
      });

      this.gmail = google.gmail({ version: 'v1', auth: auth as any });
      this.isAuthenticated = true;

      return {
        success: true,
        message: 'Successfully authenticated with Gmail API'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        message: 'Failed to authenticate with Gmail API'
      };
    }
  }

  private async ensureAuthenticated(): Promise<ToolResult> {
    if (!this.isAuthenticated) {
      return await this.authenticate();
    }
    return { success: true, message: 'Authenticated' };
  }

  async listEmails(options: EmailSearchOptions = {}): Promise<ToolResult> {
    try {
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return authResult;
      }

      const query = options.query || '';
      const maxResults = options.maxResults || 10;
      const includeSpamTrash = options.includeSpamTrash || false;

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        includeSpamTrash
      });

      const messages = response.data.messages || [];
      const emailMessages: EmailMessage[] = [];

      for (const message of messages) {
        const emailResult = await this.getEmail(message.id);
        if (emailResult.success && emailResult.data) {
          emailMessages.push(emailResult.data);
        }
      }

      const result: EmailListResult = {
        messages: emailMessages,
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate || 0
      };

      return {
        success: true,
        data: result,
        message: `Successfully retrieved ${emailMessages.length} emails`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to list emails'
      };
    }
  }

  async getEmail(messageId: string): Promise<ToolResult> {
    try {
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return authResult;
      }

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      
      const emailMessage: EmailMessage = {
        id: message.id,
        threadId: message.threadId,
        subject: this.getHeaderValue(headers, 'Subject') || '',
        from: this.getHeaderValue(headers, 'From') || '',
        to: this.getHeaderValue(headers, 'To')?.split(',').map(email => email.trim()) || [],
        cc: this.getHeaderValue(headers, 'Cc')?.split(',').map(email => email.trim()) || [],
        bcc: this.getHeaderValue(headers, 'Bcc')?.split(',').map(email => email.trim()) || [],
        body: this.getEmailBody(message.payload),
        snippet: message.snippet || '',
        date: new Date(this.getHeaderValue(headers, 'Date') || ''),
        isRead: !message.labelIds?.includes('UNREAD'),
        hasAttachments: this.hasAttachments(message.payload)
      };

      return {
        success: true,
        data: emailMessage,
        message: `Successfully retrieved email: ${emailMessage.subject}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to get email: ${messageId}`
      };
    }
  }

  async sendEmail(draft: EmailDraft): Promise<ToolResult> {
    try {
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return authResult;
      }

      const email = this.createEmail(draft);
      const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return {
        success: true,
        data: response.data,
        message: `Successfully sent email: ${draft.subject}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to send email'
      };
    }
  }

  async createDraft(draft: EmailDraft): Promise<ToolResult> {
    try {
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return authResult;
      }

      const email = this.createEmail(draft);
      const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail
          }
        }
      });

      return {
        success: true,
        data: response.data,
        message: `Successfully created draft: ${draft.subject}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create draft'
      };
    }
  }

  async searchEmails(query: string, maxResults: number = 10): Promise<ToolResult> {
    return await this.listEmails({
      query,
      maxResults
    });
  }

  async getUnreadEmails(maxResults: number = 10): Promise<ToolResult> {
    return await this.listEmails({
      query: 'is:unread',
      maxResults
    });
  }

  async markAsRead(messageId: string): Promise<ToolResult> {
    try {
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return authResult;
      }

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      return {
        success: true,
        message: `Successfully marked email as read: ${messageId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to mark email as read: ${messageId}`
      };
    }
  }

  async deleteEmail(messageId: string): Promise<ToolResult> {
    try {
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return authResult;
      }

      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId
      });

      return {
        success: true,
        message: `Successfully deleted email: ${messageId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to delete email: ${messageId}`
      };
    }
  }

  // Helper methods
  private getHeaderValue(headers: any[], name: string): string | undefined {
    const header = headers.find(h => h.name === name);
    return header?.value;
  }

  private getEmailBody(payload: any): string {
    if (!payload) return '';

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain') {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    return '';
  }

  private hasAttachments(payload: any): boolean {
    if (!payload) return false;

    if (payload.parts) {
      return payload.parts.some((part: any) => 
        part.filename && part.filename.length > 0
      );
    }

    return false;
  }

  private createEmail(draft: EmailDraft): string {
    const boundary = 'boundary_' + Math.random().toString(36).substring(2);
    const headers = [
      `From: ${draft.to[0]}`, // Using first recipient as sender for demo
      `To: ${draft.to.join(', ')}`,
      `Subject: ${draft.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ''
    ];

    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      draft.body,
      ''
    ];

    // Add attachments if any
    if (draft.attachments && draft.attachments.length > 0) {
      for (const attachment of draft.attachments) {
        body.push(
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          '',
          attachment.data.toString('base64'),
          ''
        );
      }
    }

    body.push(`--${boundary}--`);

    return headers.join('\r\n') + '\r\n' + body.join('\r\n');
  }

  // MCP-specific methods for context and reasoning
  async getEmailContext(messageId: string): Promise<ToolResult> {
    try {
      const emailResult = await this.getEmail(messageId);
      if (!emailResult.success) {
        return emailResult;
      }

      const email = emailResult.data as EmailMessage;
      const context = {
        subject: email.subject,
        sender: email.from,
        recipients: email.to,
        date: email.date,
        snippet: email.snippet,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
        threadId: email.threadId
      };

      return {
        success: true,
        data: context,
        message: `Email context retrieved for: ${email.subject}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get email context'
      };
    }
  }

  async analyzeEmailThread(threadId: string): Promise<ToolResult> {
    try {
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return authResult;
      }

      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId
      });

      const thread = response.data;
      const messages = thread.messages || [];

      const analysis = {
        threadId,
        messageCount: messages.length,
        participants: new Set<string>(),
        subjects: new Set<string>(),
        dateRange: {
          first: new Date(),
          last: new Date()
        },
        hasAttachments: false
      };

      for (const message of messages) {
        const headers = message.payload?.headers || [];
        const from = this.getHeaderValue(headers, 'From') || '';
        const subject = this.getHeaderValue(headers, 'Subject') || '';
        
        analysis.participants.add(from);
        analysis.subjects.add(subject);
        
        if (this.hasAttachments(message.payload)) {
          analysis.hasAttachments = true;
        }
      }

      return {
        success: true,
        data: analysis,
        message: `Thread analysis completed for thread: ${threadId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to analyze email thread'
      };
    }
  }
} 