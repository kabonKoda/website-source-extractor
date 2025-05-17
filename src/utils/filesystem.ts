import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { Logger } from '../types';

/**
 * Creates directory structure for a given base path
 * @param outputDir The output directory to create
 * @param logger Logger instance
 */
export function createDirectoryStructure(outputDir: string, logger: Logger): void {
  logger.verbose(`Ensuring directory structure for: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Determines the output directory based on URL and user options
 * @param url The URL to extract from
 * @param outputOption User-specified output directory option
 * @returns Resolved output directory path
 */
export function determineOutputDirectory(url: string, outputOption?: string): string {
  if (outputOption) {
    return path.resolve(outputOption);
  }
  
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname) {
      return path.resolve(`./extracted-${urlObj.hostname}`);
    }
  } catch (error) {
    // URL parsing failed, use fallback
  }
  
  return path.resolve('./extracted-site');
}

/**
 * Gets a safe file path from a URL
 * @param url The URL to extract path from
 * @param basePath Base directory path
 * @returns Safe file path
 */
export function getFilePathFromUrl(url: string, basePath: string): string {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    const urlPath = parsedUrl.pathname;
    const filename = path.basename(urlPath) || 'index.html';
    const dirPath = path.dirname(urlPath).substring(1); // Remove leading slash
    
    const domainPath = path.join(basePath, domain);
    const outputDir = path.join(domainPath, dirPath);
    
    createDirectoryIfNotExists(outputDir);
    
    return path.join(outputDir, filename);
  } catch (error) {
    // Fallback for invalid URLs
    return path.join(basePath, 'unknown', 'file.txt');
  }
}

/**
 * Creates a directory if it doesn't exist
 * @param dirPath Directory path to create
 */
export function createDirectoryIfNotExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Safely writes content to a file
 * @param filePath Path to write to
 * @param content Content to write
 * @param logger Logger instance
 * @returns Whether the write was successful
 */
export function safeWriteFile(
  filePath: string, 
  content: string | Buffer, 
  logger: Logger
): boolean {
  try {
    const dir = path.dirname(filePath);
    createDirectoryIfNotExists(dir);
    
    fs.writeFileSync(filePath, content);
    logger.success(`Saved file to: ${filePath}`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to write file to ${filePath}: ${error.message}`);
    } else {
      logger.error(`Failed to write file to ${filePath}: Unknown error`);
    }
    return false;
  }
} 