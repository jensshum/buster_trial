import * as fs from 'fs';
import * as path from 'path';
import { FileOperation, ToolResult } from '../types';

export class FileTools {
  private currentDirectory: string;

  constructor(initialDirectory: string = process.cwd()) {
    this.currentDirectory = initialDirectory;
  }

  async readFile(filePath: string): Promise<ToolResult> {
    try {
      const fullPath = path.resolve(this.currentDirectory, filePath);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          message: `File ${filePath} does not exist`
        };
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      return {
        success: true,
        data: content,
        message: `Successfully read file: ${filePath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to read file: ${filePath}`
      };
    }
  }

  async writeFile(filePath: string, content: string): Promise<ToolResult> {
    try {
      const fullPath = path.resolve(this.currentDirectory, filePath);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
      return {
        success: true,
        data: { path: filePath, size: content.length },
        message: `Successfully wrote file: ${filePath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to write file: ${filePath}`
      };
    }
  }

  async editFile(filePath: string, newContent: string): Promise<ToolResult> {
    try {
      const fullPath = path.resolve(this.currentDirectory, filePath);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          message: `Cannot edit non-existent file: ${filePath}`
        };
      }

      fs.writeFileSync(fullPath, newContent, 'utf-8');
      return {
        success: true,
        data: { path: filePath, size: newContent.length },
        message: `Successfully edited file: ${filePath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to edit file: ${filePath}`
      };
    }
  }

  async listFiles(directory: string = '.'): Promise<ToolResult> {
    try {
      const fullPath = path.resolve(this.currentDirectory, directory);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `Directory not found: ${directory}`,
          message: `Directory ${directory} does not exist`
        };
      }

      const items = fs.readdirSync(fullPath);
      const files = items.map(item => {
        const itemPath = path.join(fullPath, item);
        const stats = fs.statSync(itemPath);
        return {
          name: item,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      });

      return {
        success: true,
        data: files,
        message: `Successfully listed files in: ${directory}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to list files in: ${directory}`
      };
    }
  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  setCurrentDirectory(directory: string): void {
    this.currentDirectory = path.resolve(directory);
  }
} 