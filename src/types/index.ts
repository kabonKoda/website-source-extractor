/**
 * Command line arguments
 */
export interface CliArgs {
  url: string;
  output: string;
  verbose: boolean;
  saveAssets: boolean;
  maxDepth: number;
}

/**
 * Logger levels
 */
export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'verbose';

/**
 * Logger interface
 */
export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  verbose(message: string): void;
}

/**
 * Download progress tracking
 */
export interface DownloadProgress {
  files: Record<string, DownloadProgressFile>;
  formatSize(bytes: number): string;
  formatSpeed(bytesPerSec: number): string;
  start(url: string): void;
  update(url: string, loaded: number, total: number): void;
  complete(url: string): void;
}

/**
 * Download progress tracking for a single file
 */
export interface DownloadProgressFile {
  started: number;
  lastUpdate: number;
  bytesPerSecond: number;
  prevLoaded: number;
}

/**
 * Network request options
 */
export interface FetchOptions {
  url: string;
  responseType?: 'text' | 'arraybuffer';
  outputPath?: string;
}

/**
 * Configuration for processing a page
 */
export interface PageProcessorOptions {
  url: string;
  outputDir: string;
  saveAssets: boolean;
  maxDepth: number;
  currentDepth?: number;
}

/**
 * Source map processing options
 */
export interface SourceMapOptions {
  sourceMapUrl: string;
  referenceUrl: string;
  outputDir: string;
}

/**
 * Detected dependencies
 */
export interface Dependencies {
  add(dep: string): void;
  getAll(): Set<string>;
} 