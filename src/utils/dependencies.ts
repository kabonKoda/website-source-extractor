import * as fs from 'fs';
import * as path from 'path';
import { Dependencies, Logger } from '../types';

/**
 * Class to track and manage detected dependencies
 */
export class DependencyTracker implements Dependencies {
  private dependencies: Set<string>;
  
  constructor() {
    this.dependencies = new Set<string>();
  }
  
  /**
   * Add a dependency
   * @param dep Dependency name
   */
  public add(dep: string): void {
    this.dependencies.add(dep);
  }
  
  /**
   * Get all dependencies
   * @returns Set of dependency names
   */
  public getAll(): Set<string> {
    return this.dependencies;
  }
  
  /**
   * Generate package.json with detected dependencies
   * @param outputDir Output directory
   * @param pageUrl URL of the page being processed
   * @param logger Logger instance
   */
  public generatePackageJson(outputDir: string, pageUrl: string, logger: Logger): void {
    if (this.dependencies.size === 0) {
      logger.info('No external npm dependencies detected, skipping package.json generation.');
      return;
    }
    
    logger.info('Generating package.json with detected dependencies...');
    
    const packageJson = {
      name: path.basename(outputDir) || 'extracted-website',
      version: '1.0.0',
      description: `Extracted website dependencies from ${pageUrl}`,
      dependencies: {} as Record<string, string>
    };
    
    this.dependencies.forEach(dep => {
      packageJson.dependencies[dep] = 'latest';
    });
    
    try {
      fs.writeFileSync(
        path.join(outputDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      logger.success(`Generated package.json in ${outputDir}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to write package.json: ${error.message}`);
      } else {
        logger.error('Failed to write package.json: Unknown error');
      }
    }
  }
} 