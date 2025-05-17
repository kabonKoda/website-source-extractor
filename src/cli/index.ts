#!/usr/bin/env node

import { PageProcessor } from '../core/processor';
import { determineOutputDirectory } from '../utils/filesystem';
import { createLogger } from '../utils/logger';
import { createDownloadProgress } from '../utils/progress';
import { parseArgs } from './args';

/**
 * Main function
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const args = parseArgs();
  
  // Create logger
  const logger = createLogger(args.verbose);
  
  // Create download progress tracker
  const progress = createDownloadProgress();
  
  try {
    // Determine output directory
    const outputDir = determineOutputDirectory(args.url, args.output);
    
    logger.info(`Starting extraction of ${args.url}`);
    logger.info(`Base output directory: ${outputDir}`);
    if (args.verbose) logger.verbose('Verbose logging enabled.');
    if (!args.saveAssets) logger.info('Asset saving (CSS, images, iframes) is disabled.');
    logger.info(`Max iframe depth: ${args.maxDepth}`);
    
    // Create page processor
    const processor = new PageProcessor(logger, progress);
    
    // Process the initial page
    await processor.processPage({
      url: args.url,
      outputDir,
      saveAssets: args.saveAssets,
      maxDepth: args.maxDepth,
      currentDepth: 0
    });
    
    // Generate package.json with detected dependencies
    processor.generatePackageJson(outputDir, args.url);
    
    logger.success(`Website extraction complete. Output saved to ${outputDir}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Extraction failed: ${error.message}`);
      if (args.verbose && error.stack) {
        logger.verbose(`Main error stack: ${error.stack}`);
      }
    } else {
      logger.error('Extraction failed with an unknown error');
    }
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 