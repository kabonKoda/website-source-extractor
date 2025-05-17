import detective from 'detective';
import * as fs from 'fs';
import { ConstructorOptions, DOMWindow, JSDOM } from 'jsdom';
import { builtinModules } from 'module';
import * as path from 'path';
import { URL } from 'url';
import { DownloadProgress, Logger, PageProcessorOptions } from '../types';
import { DependencyTracker } from '../utils/dependencies';
import { createDirectoryStructure, safeWriteFile } from '../utils/filesystem';
import { fetchContent } from '../utils/network';
import { processSourceMap } from './sourcemap';

/**
 * Main class for processing a web page and extracting assets
 */
export class PageProcessor {
  private logger: Logger;
  private progress: DownloadProgress;
  private processedUrls: Set<string>;
  private dependencies: DependencyTracker;
  
  /**
   * Creates a new PageProcessor instance
   * @param logger Logger instance
   * @param progress Download progress tracker
   */
  constructor(logger: Logger, progress: DownloadProgress) {
    this.logger = logger;
    this.progress = progress;
    this.processedUrls = new Set<string>();
    this.dependencies = new DependencyTracker();
  }
  
  /**
   * Initializes JSDOM with the provided HTML content
   * @param html HTML content
   * @param pageUrl URL of the page
   * @returns Promise that resolves to a JSDOM instance
   */
  private async initializeJSDOM(html: string, pageUrl: string): Promise<JSDOM> {
    this.logger.info(`Initializing JSDOM for ${pageUrl}`);
    
    const jsdomOptions: ConstructorOptions = {
      url: pageUrl,
      runScripts: 'dangerously' as const,
      resources: 'usable',
      pretendToBeVisual: true,
      beforeParse(window: DOMWindow) {
        window.requestIdleCallback = window.requestIdleCallback || function (cb) {
          return setTimeout(function () {
            var start = Date.now();
            cb({
              didTimeout: false,
              timeRemaining: function () {
                return Math.max(0, 50 - (Date.now() - start));
              }
            });
          }, 1);
        };
      }
    };

    const dom = new JSDOM(html, jsdomOptions);
    
    return new Promise<JSDOM>((resolve) => {
      const timeoutDuration = 10000; // 10 seconds
      const timeoutId = setTimeout(() => {
        this.logger.verbose(`JSDOM script execution timeout reached for ${pageUrl}`);
        resolve(dom);
      }, timeoutDuration);
    });
  }
  
  /**
   * Extracts and processes script elements
   * @param dom JSDOM instance
   * @param baseUrl Base URL of the page
   * @param outputDir Output directory path
   */
  private async extractScripts(dom: JSDOM, baseUrl: string, outputDir: string): Promise<void> {
    this.logger.info('Extracting JavaScript files...');
    const scripts = dom.window.document.querySelectorAll('script[src]');
    
    for (const script of scripts) {
      const src = script.getAttribute('src');
      if (!src || src.startsWith('data:')) {
        this.logger.verbose(`Skipping script with non-fetchable src: ${src?.substring(0, 50)}...`);
        continue;
      }
      
      try {
        const scriptUrl = new URL(src, baseUrl).href;
        this.logger.verbose(`Processing script: ${scriptUrl}`);
        
        // Extract domain from script URL
        const parsedUrl = new URL(scriptUrl);
        const domain = parsedUrl.hostname;
        const domainPath = path.join(outputDir, domain);
        
        // Preserve directory structure within the script path
        const scriptPathname = parsedUrl.pathname;
        const scriptDirname = path.dirname(scriptPathname);
        const scriptBasedir = path.join(domainPath, scriptDirname.substring(1)); // Remove leading slash
        
        if (!fs.existsSync(scriptBasedir)) {
          fs.mkdirSync(scriptBasedir, { recursive: true });
        }
        
        const scriptName = path.basename(parsedUrl.pathname) || 'script.js';
        const outputPath = path.join(scriptBasedir, scriptName);
        
        // Fetch script content
        let scriptContent: string;
        
        if (fs.existsSync(outputPath)) {
          this.logger.info(`Script ${scriptName} already exists at ${outputPath}. Reading locally.`);
          scriptContent = fs.readFileSync(outputPath, 'utf8');
        } else {
          const content = await fetchContent(
            { url: scriptUrl, responseType: 'text', outputPath }, 
            this.logger, 
            this.progress
          );
          
          if (typeof content !== 'string') {
            this.logger.warn(`Skipping script ${scriptUrl} as content is not a string.`);
            continue;
          }
          
          scriptContent = content;
          safeWriteFile(outputPath, scriptContent, this.logger);
        }
        
        // Check for source map
        if (scriptContent.includes('//# sourceMappingURL=')) {
          const match = scriptContent.match(/\/\/# sourceMappingURL=([^\s'"]+)/m);
          if (match && match[1]) {
            const sourceMapUrl = match[1].trim();
            await processSourceMap(
              { sourceMapUrl, referenceUrl: scriptUrl, outputDir }, 
              this.logger, 
              this.progress
            );
          }
        }
        
        // Extract dependencies
        try {
          if (scriptContent.length > 0) {
            const npmDeps = detective(scriptContent);
            npmDeps.forEach(dep => {
              if (!dep.startsWith('.') && !path.isAbsolute(dep) && !builtinModules.includes(dep)) {
                this.dependencies.add(dep);
              }
            });
          }
        } catch (detectiveError) {
          if (detectiveError instanceof Error) {
            this.logger.warn(`Failed to parse dependencies for ${scriptUrl}: ${detectiveError.message}.`);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Failed to process script ${src}: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Extracts and processes stylesheet elements
   * @param dom JSDOM instance
   * @param baseUrl Base URL of the page
   * @param outputDir Output directory path
   */
  private async extractStylesheets(dom: JSDOM, baseUrl: string, outputDir: string): Promise<void> {
    this.logger.info('Extracting CSS files...');
    const elements = dom.window.document.querySelectorAll('link[rel="stylesheet"][href], style');
    let inlineStyleCount = 0;
  
    for (const element of elements) {
      let cssContent: string | Buffer;
      let cssUrl = '';
      let cssName: string;
      let domainPath: string;
  
      try {
        if (element.tagName === 'LINK') {
          const href = element.getAttribute('href');
          if (!href || href.startsWith('data:')) {
            this.logger.verbose(`Skipping stylesheet link with non-fetchable href: ${href?.substring(0, 50)}...`);
            continue;
          }
          
          cssUrl = new URL(href, baseUrl).href;
          this.logger.verbose(`Processing stylesheet: ${cssUrl}`);
          
          // Extract domain and path information
          const parsedUrl = new URL(cssUrl);
          const domain = parsedUrl.hostname;
          domainPath = path.join(outputDir, domain);
          
          // Preserve directory structure
          const cssPathname = parsedUrl.pathname;
          const cssDirname = path.dirname(cssPathname);
          const cssBasedir = path.join(domainPath, cssDirname.substring(1)); // Remove leading slash
          
          if (!fs.existsSync(cssBasedir)) {
            fs.mkdirSync(cssBasedir, { recursive: true });
          }
          
          cssName = path.basename(parsedUrl.pathname) || 'style.css';
          const outputPath = path.join(cssBasedir, cssName);
          
          // Fetch CSS content
          if (fs.existsSync(outputPath)) {
            this.logger.info(`CSS file ${cssName} already exists at ${outputPath}. Reading locally.`);
            cssContent = fs.readFileSync(outputPath, 'utf8');
          } else {
            cssContent = await fetchContent(
              { url: cssUrl, responseType: 'text', outputPath }, 
              this.logger, 
              this.progress
            );
          }
        } else { // STYLE tag
          const content = element.textContent;
          if (!content || content.trim().length === 0) {
            this.logger.verbose('Skipping empty inline style tag.');
            continue;
          }
          
          // For inline styles, store under the page's domain
          const parsedUrl = new URL(baseUrl);
          const domain = parsedUrl.hostname;
          domainPath = path.join(outputDir, domain);
          
          if (!fs.existsSync(domainPath)) {
            fs.mkdirSync(domainPath, { recursive: true });
          }
          
          inlineStyleCount++;
          cssName = `inline-style-${inlineStyleCount}.css`;
          cssUrl = `${baseUrl}/#inline-style-${inlineStyleCount}`; // For context if sourcemap is relative
          this.logger.verbose(`Processing inline style: ${cssName}`);
          
          cssContent = content;
          const outputPath = path.join(domainPath, cssName);
          safeWriteFile(outputPath, cssContent, this.logger);
        }
  
        if (typeof cssContent !== 'string') {
          this.logger.warn(`Skipping ${cssUrl || cssName} as content is not a string.`);
          continue;
        }
  
        const outputPath = path.join(domainPath, cssName);
        safeWriteFile(outputPath, cssContent, this.logger);
  
        // Check for sourceMappingURL in CSS
        const match = cssContent.match(/\/\*#\s*sourceMappingURL=([^\s*]+)\s*\*\//m);
        if (match && match[1]) {
          const sourceMapUrl = match[1].trim();
          await processSourceMap(
            { sourceMapUrl, referenceUrl: cssUrl, outputDir },
            this.logger,
            this.progress
          );
        }
      } catch (error) {
        const styleIdentifier = cssUrl || (element.tagName === 'LINK' ? element.getAttribute('href') : `inline style #${inlineStyleCount}`);
        if (error instanceof Error) {
          this.logger.error(`Failed to process stylesheet ${styleIdentifier}: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Extracts and processes image elements
   * @param dom JSDOM instance
   * @param baseUrl Base URL of the page
   * @param outputDir Output directory path
   */
  private async extractImages(dom: JSDOM, baseUrl: string, outputDir: string): Promise<void> {
    this.logger.info('Extracting images...');
    const images = dom.window.document.querySelectorAll('img[src]');
  
    for (const img of images) {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) {
        this.logger.verbose(`Skipping image with non-fetchable src: ${src?.substring(0, 50)}...`);
        continue;
      }
  
      try {
        const assetUrl = new URL(src, baseUrl).href;
        this.logger.verbose(`Processing image: ${assetUrl}`);
        
        // Extract domain from asset URL
        const parsedUrl = new URL(assetUrl);
        const domain = parsedUrl.hostname;
        const domainPath = path.join(outputDir, domain);
        
        // Preserve directory structure
        const assetPathname = parsedUrl.pathname;
        const assetDirname = path.dirname(assetPathname);
        const assetBasedir = path.join(domainPath, assetDirname.substring(1)); // Remove leading slash
        
        if (!fs.existsSync(assetBasedir)) {
          fs.mkdirSync(assetBasedir, { recursive: true });
        }
        
        const assetName = path.basename(parsedUrl.pathname) || 'image.png';
        const outputPath = path.join(assetBasedir, assetName);
        
        // Skip if already exists
        if (fs.existsSync(outputPath)) {
          this.logger.info(`Image ${assetName} already exists at ${outputPath}. Skipping.`);
          continue;
        }
        
        const assetContent = await fetchContent(
          { url: assetUrl, responseType: 'arraybuffer', outputPath }, 
          this.logger, 
          this.progress
        );
        
        if (!(assetContent instanceof Buffer)) {
          this.logger.warn(`Skipping image ${assetUrl} as content is not a Buffer.`);
          continue;
        }
        
        safeWriteFile(outputPath, assetContent, this.logger);
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Failed to process image ${src}: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Extracts and processes iframe elements
   * @param dom JSDOM instance
   * @param baseUrl Base URL of the page
   * @param outputDir Output directory path
   * @param currentDepth Current processing depth
   * @param maxDepth Maximum processing depth
   */
  private async extractIframes(
    dom: JSDOM, 
    baseUrl: string, 
    outputDir: string, 
    currentDepth: number, 
    maxDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      this.logger.info(`Max iframe depth (${maxDepth}) reached. Not processing further iframes.`);
      return;
    }
  
    this.logger.info(`Extracting iframes (depth ${currentDepth})...`);
    const iframes = dom.window.document.querySelectorAll('iframe[src]');
  
    for (const iframe of iframes) {
      const src = iframe.getAttribute('src');
      if (!src || src.startsWith('about:blank') || src.startsWith('javascript:')) {
        this.logger.verbose(`Skipping iframe with non-fetchable src: ${src}`);
        continue;
      }
  
      try {
        const iframeUrl = new URL(src, baseUrl).href;
        if (this.processedUrls.has(iframeUrl)) {
          this.logger.warn(`Skipping already processed iframe URL: ${iframeUrl}`);
          continue;
        }
  
        this.logger.info(`Found iframe with src: ${iframeUrl}`);
        
        // Extract domain from iframe URL
        const parsedUrl = new URL(iframeUrl);
        const domain = parsedUrl.hostname;
        
        // In Chrome DevTools, iframes appear as separate top-level domains
        const iframeOutputDir = path.join(outputDir, domain);
        
        // Process the iframe recursively
        await this.processPage({
          url: iframeUrl,
          outputDir: iframeOutputDir,
          saveAssets: true,
          maxDepth,
          currentDepth: currentDepth + 1
        });
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Failed to process iframe src "${src}": ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Saves the HTML content to a file
   * @param dom JSDOM instance
   * @param outputDir Output directory path
   * @param currentDepth Current processing depth
   * @param filename Optional filename (defaults to index_depth{depth}_*.html)
   */
  private saveHtml(dom: JSDOM, outputDir: string, currentDepth: number, pageUrl: string): void {
    try {
      const urlObj = new URL(pageUrl);
      const pathBasename = path.basename(urlObj.pathname) || 'root';
      const filename = `index_depth${currentDepth}_${pathBasename}.html`;
      
      const html = dom.serialize();
      const outputPath = path.join(outputDir, filename);
      
      safeWriteFile(outputPath, html, this.logger);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to save HTML file: ${error.message}`);
      }
    }
  }
  
  /**
   * Processes a webpage and extracts assets
   * @param options Page processing options
   */
  public async processPage(options: PageProcessorOptions): Promise<void> {
    const { url, outputDir, saveAssets, maxDepth } = options;
    const currentDepth = options.currentDepth || 0;
    
    if (this.processedUrls.has(url)) {
      this.logger.warn(`URL ${url} has already been processed or is in a loop. Skipping.`);
      return;
    }
    this.processedUrls.add(url);
  
    this.logger.info(`Processing page: ${url} (depth ${currentDepth}) -> ${outputDir}`);
    
    try {
      createDirectoryStructure(outputDir, this.logger);
      
      const html = await fetchContent(
        { url, responseType: 'text' }, 
        this.logger, 
        this.progress
      );
      
      if (typeof html !== 'string') {
        this.logger.error(`Failed to process page ${url}: Content is not text.`);
        return;
      }
      
      const dom = await this.initializeJSDOM(html, url);
      
      // Always extract scripts
      await this.extractScripts(dom, url, outputDir);
      
      // Optionally extract other assets
      if (saveAssets) {
        await this.extractStylesheets(dom, url, outputDir);
        await this.extractImages(dom, url, outputDir);
        await this.extractIframes(dom, url, outputDir, currentDepth, maxDepth);
      }
      
      this.saveHtml(dom, outputDir, currentDepth, url);
      this.logger.success(`Finished processing page: ${url}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to process page ${url}: ${error.message}`);
        if (this.logger.verbose && error.stack) {
          this.logger.verbose(`Stack trace for ${url}: ${error.stack}`);
        }
      } else {
        this.logger.error(`Failed to process page ${url}: Unknown error`);
      }
    }
  }
  
  /**
   * Generates package.json with detected dependencies
   * @param outputDir Output directory path
   * @param pageUrl URL of the page being processed
   */
  public generatePackageJson(outputDir: string, pageUrl: string): void {
    this.dependencies.generatePackageJson(outputDir, pageUrl, this.logger);
  }
} 