import { DownloadProgress } from '../types';

/**
 * Creates a download progress tracker utility
 * @returns A download progress tracker instance
 */
export function createDownloadProgress(): DownloadProgress {
  return {
    files: {},
    
    formatSize(bytes: number): string {
      if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${bytes} B`;
    },
    
    formatSpeed(bytesPerSec: number): string {
      if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
      if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
      return `${bytesPerSec.toFixed(0)} B/s`;
    },
    
    start(url: string): void {
      const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
      this.files[url] = { 
        started: Date.now(),
        lastUpdate: Date.now(),
        bytesPerSecond: 0,
        prevLoaded: 0
      };
      process.stdout.write(`⬇️  Downloading: ${shortUrl}`);
    },
    
    update(url: string, loaded: number, total: number): void {
      if (!this.files[url]) return;
      
      const now = Date.now();
      const file = this.files[url];
      const elapsedSecs = (now - file.lastUpdate) / 1000;
      
      // Calculate download speed if at least 100ms have passed
      if (elapsedSecs >= 0.1) {
        const bytesDownloaded = loaded - file.prevLoaded;
        file.bytesPerSecond = bytesDownloaded / elapsedSecs;
        file.prevLoaded = loaded;
        file.lastUpdate = now;
      }
      
      const percent = total ? Math.round((loaded / total) * 100) : '?';
      const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
      const speedText = file.bytesPerSecond > 0 ? this.formatSpeed(file.bytesPerSecond) : '? KB/s';
      
      const loadedSize = this.formatSize(loaded);
      const totalSize = total ? this.formatSize(total) : 'unknown';
      
      if (process.stdout.clearLine) process.stdout.clearLine(0);
      if (process.stdout.cursorTo) process.stdout.cursorTo(0);
      process.stdout.write(`⬇️  Downloading: ${shortUrl} [${percent}% | ${loadedSize}/${totalSize} @ ${speedText}]`);
    },
    
    complete(url: string): void {
      if (!this.files[url]) return;
      const file = this.files[url];
      const totalTime = (Date.now() - file.started) / 1000;
      
      if (process.stdout.clearLine) process.stdout.clearLine(0);
      if (process.stdout.cursorTo) process.stdout.cursorTo(0);
      
      if (file.prevLoaded > 0 && totalTime > 0) {
        const avgSpeed = file.prevLoaded / totalTime;
        const speedText = this.formatSpeed(avgSpeed);
        process.stdout.write(`✅ Downloaded: ${url.length > 50 ? url.substring(0, 47) + '...' : url} [${this.formatSize(file.prevLoaded)} in ${totalTime.toFixed(1)}s @ ${speedText}]\n`);
      }
      
      delete this.files[url];
    }
  };
} 