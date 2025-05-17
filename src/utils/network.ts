import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import { DownloadProgress, FetchOptions, Logger } from '../types';

/**
 * Fetches content from a URL
 * @param options Fetch options
 * @param logger Logger instance
 * @param progress Download progress tracker
 * @returns The fetched content
 */
export async function fetchContent(
  options: FetchOptions, 
  logger: Logger, 
  progress: DownloadProgress
): Promise<string | Buffer> {
  const { url, responseType = 'text', outputPath } = options;
  
  logger.info(`Fetching content from ${url} (as ${responseType})`);
  
  // Check if file already exists
  if (outputPath && fs.existsSync(outputPath)) {
    logger.info(`File already exists at ${outputPath}. Skipping download.`);
    return responseType === 'text' 
      ? fs.readFileSync(outputPath, 'utf8')
      : fs.readFileSync(outputPath);
  }
  
  try {
    progress.start(url);
    
    const config: AxiosRequestConfig = { 
      responseType,
      onDownloadProgress: (progressEvent) => {
        progress.update(
          url, 
          progressEvent.loaded, 
          progressEvent.total || 0
        );
      }
    };
    
    const response = await axios.get(url, config);
    
    progress.complete(url);
    logger.success(`Successfully fetched content from ${url}`);
    return response.data;
  } catch (error) {
    progress.complete(url);
    
    if (axios.isAxiosError(error)) {
      logger.error(`Failed to fetch content from ${url}: ${error.message}`);
      if (error.response) {
        logger.verbose(`Response status: ${error.response.status}`);
      }
    } else if (error instanceof Error) {
      logger.error(`Failed to fetch content from ${url}: ${error.message}`);
    } else {
      logger.error(`Failed to fetch content from ${url}: Unknown error`);
    }
    
    throw error; // Re-throw to be handled by caller
  }
} 