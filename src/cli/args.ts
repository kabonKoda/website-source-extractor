import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CliArgs } from '../types';

/**
 * Parses command line arguments
 * @returns Parsed command line arguments
 */
export function parseArgs(): CliArgs {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <url> [options]')
    .demandCommand(1, 'Please provide a website URL. The URL should be the first positional argument.')
    .option('output', {
      alias: 'o',
      describe: 'Output directory for extracted content',
      type: 'string',
      // Default is handled dynamically after URL is parsed
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      default: false,
      type: 'boolean'
    })
    .option('save-assets', {
      alias: 'a',
      describe: 'Save all assets (images, CSS, JS, and process iframes)',
      default: true,
      type: 'boolean'
    })
    .option('max-depth', {
      alias: 'd',
      describe: 'Maximum depth for processing iframes',
      type: 'number',
      default: 2 // 0 means only the main page, 1 means main page + direct iframes, etc.
    })
    .help()
    .parseSync();

  return {
    url: argv._[0].toString(),
    output: argv.output as string,
    verbose: argv.verbose as boolean,
    saveAssets: argv['save-assets'] as boolean,
    maxDepth: argv['max-depth'] as number
  };
} 