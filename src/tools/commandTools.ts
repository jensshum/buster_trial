import { spawn, exec } from 'child_process';
import { CommandExecution, ToolResult } from '../types';

export class CommandTools {
  private currentDirectory: string;

  constructor(initialDirectory: string = process.cwd()) {
    this.currentDirectory = initialDirectory;
  }

  async executeCommand(command: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      const process = exec(command, {
        cwd: this.currentDirectory,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const result: CommandExecution = {
          command,
          output: stdout,
          error: stderr || undefined,
          exitCode: code || 0
        };

        if (code === 0) {
          resolve({
            success: true,
            data: result,
            message: `Command executed successfully: ${command}`
          });
        } else {
          resolve({
            success: false,
            data: result,
            error: stderr || 'Command failed',
            message: `Command failed with exit code ${code}: ${command}`
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          message: `Failed to execute command: ${command}`
        });
      });
    });
  }

  async executeCommandWithTimeout(command: string, timeoutMs: number = 30000): Promise<ToolResult> {
    return new Promise((resolve) => {
      const process = exec(command, {
        cwd: this.currentDirectory,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: timeoutMs
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const result: CommandExecution = {
          command,
          output: stdout,
          error: stderr || undefined,
          exitCode: code || 0
        };

        if (code === 0) {
          resolve({
            success: true,
            data: result,
            message: `Command executed successfully: ${command}`
          });
        } else {
          resolve({
            success: false,
            data: result,
            error: stderr || 'Command failed',
            message: `Command failed with exit code ${code}: ${command}`
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          message: `Failed to execute command: ${command}`
        });
      });

      process.on('timeout', () => {
        process.kill();
        resolve({
          success: false,
          error: 'Command timed out',
          message: `Command timed out after ${timeoutMs}ms: ${command}`
        });
      });
    });
  }

  async executeInteractiveCommand(command: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args, {
        cwd: this.currentDirectory,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const result: CommandExecution = {
          command,
          output: stdout,
          error: stderr || undefined,
          exitCode: code || 0
        };

        if (code === 0) {
          resolve({
            success: true,
            data: result,
            message: `Interactive command completed: ${command}`
          });
        } else {
          resolve({
            success: false,
            data: result,
            error: stderr || 'Interactive command failed',
            message: `Interactive command failed with exit code ${code}: ${command}`
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          message: `Failed to execute interactive command: ${command}`
        });
      });
    });
  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  setCurrentDirectory(directory: string): void {
    this.currentDirectory = directory;
  }

  // Helper method to check if a command is safe to execute
  isSafeCommand(command: string): boolean {
    const dangerousCommands = [
      'rm -rf',
      'format',
      'dd',
      'mkfs',
      'fdisk',
      'shutdown',
      'reboot',
      'halt',
      'poweroff'
    ];

    const lowerCommand = command.toLowerCase();
    return !dangerousCommands.some(dangerous => 
      lowerCommand.includes(dangerous.toLowerCase())
    );
  }
} 