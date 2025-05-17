import * as fs from 'fs';
import * as path from 'path';
import * as sourceMap from 'source-map';
import { URL } from 'url';
import { DownloadProgress, Logger, SourceMapOptions } from '../types';
import { createDirectoryIfNotExists, safeWriteFile } from '../utils/filesystem';
import { fetchContent } from '../utils/network';

/**
 * Processes a source map and extracts the original source files
 * @param options Source map processing options
 * @param logger Logger instance
 * @param progress Download progress tracker
 */
export async function processSourceMap(
  options: SourceMapOptions,
  logger: Logger,
  progress: DownloadProgress
): Promise<void> {
  const { sourceMapUrl, referenceUrl, outputDir } = options;
  
  // Initialize with default value to prevent "used before assigned" error
  let fullSourceMapUrl = sourceMapUrl;
  
  try {
    logger.info(`Processing source map: ${sourceMapUrl} (referenced by ${referenceUrl})`);
    fullSourceMapUrl = new URL(sourceMapUrl, referenceUrl).href;
    
    // Fetch the source map content
    const sourceMapDataString = await fetchContent(
      { url: fullSourceMapUrl, responseType: 'text' }, 
      logger, 
      progress
    );

    // Parse the source map JSON
    let sourceMapData: any;
    try {
      sourceMapData = typeof sourceMapDataString === 'object' 
        ? sourceMapDataString 
        : JSON.parse(sourceMapDataString as string);
    } catch (e) {
      // Check if the content is HTML or text
      if (typeof sourceMapDataString === 'string') {
        if (sourceMapDataString.trim().toLowerCase().startsWith('<!doctype html') || 
            sourceMapDataString.trim().toLowerCase().startsWith('<html')) {
          logger.warn(`Failed to parse source map from ${fullSourceMapUrl}: Content is HTML, not JSON. Skipping.`);
        } else {
          logger.error(`Failed to parse source map JSON from ${fullSourceMapUrl}: ${e instanceof Error ? e.message : 'Unknown error'}. Content preview: ${
            sourceMapDataString.substring(0, 100) + '...'
          }`);
        }
      } else {
        logger.error(`Failed to parse source map from ${fullSourceMapUrl}: Received non-string content of type ${typeof sourceMapDataString}`);
      }
      return; // Skip further processing for this sourcemap
    }

    if (typeof sourceMapData !== 'object' || sourceMapData === null) {
      logger.error(`Failed to process source map ${fullSourceMapUrl}: Parsed data is not a valid object.`);
      return;
    }

    // Extract domain from source map URL to match Chrome's structure
    const parsedMapUrl = new URL(fullSourceMapUrl);
    const domain = parsedMapUrl.hostname;
    const domainPath = path.join(outputDir, domain);
    
    // Create domain directory if it doesn't exist
    createDirectoryIfNotExists(domainPath);
    
    const sourceMapName = path.basename(parsedMapUrl.pathname) || 'sourcemap.map';
    const sourceMapSavePath = path.join(domainPath, sourceMapName);
    
    // Save the source map
    if (fs.existsSync(sourceMapSavePath)) {
      logger.info(`Source map ${sourceMapName} already exists at ${sourceMapSavePath}. Skipping save.`);
    } else {
      safeWriteFile(sourceMapSavePath, JSON.stringify(sourceMapData, null, 2), logger);
    }
    
    // Process the sources using source-map consumer
    const consumer = await new sourceMap.SourceMapConsumer(sourceMapData);
    
    // Save source files under the domain directory
    for (const source of consumer.sources) {
      const content = consumer.sourceContentFor(source, true); // true for nullOnMissing
      if (content) {
        let relativePath = source;
        
        // Clean up webpack prefixes
        ['webpack:///', 'webpack://', 'ng://'].forEach(prefix => {
          if (relativePath.startsWith(prefix)) {
            relativePath = relativePath.substring(prefix.length);
          }
        });
        
        if (relativePath.startsWith('./')) relativePath = relativePath.substring(2);
        if (relativePath.startsWith('/')) relativePath = relativePath.substring(1); // Avoid absolute paths

        // Sanitize path segments
        const segments = relativePath.split(/[\/\\]+/);
        const sanitizedSegments = segments.map(segment => {
          if (segment === '..' || segment === '.') return '_'; // Replace parent/current dir refs
          return segment.replace(/[<>:"|?*\x00-\x1F]/g, '_').substring(0, 200); // Sanitize and shorten
        });
        
        const finalRelativePath = path.join(...sanitizedSegments);
        const sourceFilePath = path.join(domainPath, finalRelativePath);

        // Security check: ensure path does not escape domain directory
        if (!path.resolve(sourceFilePath).startsWith(path.resolve(domainPath))) {
          logger.warn(`Skipping source file "${source}" as its resolved path "${finalRelativePath}" attempts to escape the target domain directory.`);
          continue;
        }

        const sourceFileDir = path.dirname(sourceFilePath);
        createDirectoryIfNotExists(sourceFileDir);
        
        // Save the source file
        if (fs.existsSync(sourceFilePath)) {
          logger.info(`Source file ${finalRelativePath} already exists. Skipping save.`);
        } else {
          safeWriteFile(sourceFilePath, content, logger);
          logger.success(`Extracted original source: ${source} to ${finalRelativePath}`);
        }
      } else {
        logger.verbose(`No content for source ${source} in source map ${sourceMapName}`);
      }
    }
    
    consumer.destroy();
  } catch (error) {
    const mapIdentifier = fullSourceMapUrl || sourceMapUrl;
    if (error instanceof Error) {
      // Check if the error is due to fetching HTML instead of JSON
      if (error.message.includes("Unexpected token '<'")) {
        logger.warn(`Failed to process source map ${mapIdentifier}: Content was likely HTML instead of JSON.`);
      } else {
        logger.error(`Failed to process source map ${mapIdentifier}: ${error.message}`);
      }
      
      if (logger.verbose && error.stack) {
        logger.verbose(`Stack trace for sourcemap ${mapIdentifier}: ${error.stack}`);
      }
    } else {
      logger.error(`Failed to process source map ${mapIdentifier}: Unknown error`);
    }
  }
} 