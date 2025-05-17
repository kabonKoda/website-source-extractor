import chalk from 'chalk';
import { Logger } from '../types';

/**
 * Creates a logger instance with configurable verbosity
 * @param verbose Whether to enable verbose logging
 * @returns A logger instance
 */
export function createLogger(verbose: boolean): Logger {
  return {
    info: (message: string): void => console.log(chalk.blue(`[INFO] ${message}`)),
    
    success: (message: string): void => console.log(chalk.green(`[SUCCESS] ${message}`)),
    
    warn: (message: string): void => console.log(chalk.yellow(`[WARNING] ${message}`)),
    
    error: (message: string): void => console.log(chalk.red(`[ERROR] ${message}`)),
    
    verbose: (message: string): void => {
      if (verbose) console.log(chalk.gray(`[VERBOSE] ${message}`));
    }
  };
} 