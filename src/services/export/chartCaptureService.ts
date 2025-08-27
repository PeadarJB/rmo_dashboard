// src/services/export/chartCaptureService.ts
import { Chart as ChartJS } from 'chart.js';
import { logger } from '@/utils/logger';

/**
 * Options for chart capture
 */
export interface ChartCaptureOptions {
  quality?: number; // 0-1 for JPEG quality
  format?: 'png' | 'jpeg' | 'webp';
  backgroundColor?: string;
  width?: number;
  height?: number;
  scale?: number; // Device pixel ratio
}

/**
 * Result from chart capture
 */
export interface CaptureResult {
  success: boolean;
  dataUrl?: string;
  blob?: Blob;
  error?: string;
}

/**
 * Service for capturing chart visualizations
 * Works with Chart.js, DOM elements, and Canvas elements
 */
export class ChartCaptureService {
  private readonly loggerPrefix: string;

  constructor(loggerPrefix: string = 'ChartCaptureService') {
    this.loggerPrefix = loggerPrefix;
  }

  /**
   * Capture a Chart.js chart instance
   */
  public async captureChartJS(
    chart: ChartJS | null | undefined,
    options: ChartCaptureOptions = {}
  ): Promise<CaptureResult> {
    if (!chart) {
      return {
        success: false,
        error: 'No chart instance provided',
      };
    }

    try {
      logger.info(this.loggerPrefix, 'Capturing Chart.js visualization');

      const {
        format = 'png',
        quality = 1.0,
        backgroundColor,
      } = options;

      // Ensure chart is rendered
      if (!chart.canvas) {
        return {
          success: false,
          error: 'Chart canvas not available',
        };
      }

      // Set background if specified
      if (backgroundColor) {
        const ctx = chart.canvas.getContext('2d');
        if (ctx) {
          // Store current canvas content
          const imageData = ctx.getImageData(0, 0, chart.width, chart.height);
          
          // Fill background
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, chart.width, chart.height);
          
          // Restore chart content
          ctx.putImageData(imageData, 0, 0);
        }
      }

      // Get base64 image from chart
      const dataUrl = chart.toBase64Image(`image/${format}`, quality);

      // Convert to blob if needed
      const blob = await this.dataUrlToBlob(dataUrl);

      logger.info(this.loggerPrefix, 'Chart captured successfully', {
        format,
        width: chart.width,
        height: chart.height,
        size: blob?.size,
      });

      return {
        success: true,
        dataUrl,
        blob,
      };
    } catch (error) {
      logger.error(this.loggerPrefix, 'Failed to capture Chart.js chart', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chart capture failed',
      };
    }
  }

  /**
   * Capture a DOM element (using html2canvas would be ideal, but we'll use a simpler approach)
   */
  public async captureElement(
    elementId: string,
    options: ChartCaptureOptions = {}
  ): Promise<CaptureResult> {
    try {
      logger.info(this.loggerPrefix, 'Capturing DOM element', { elementId });

      const element = document.getElementById(elementId);
      if (!element) {
        return {
          success: false,
          error: `Element with id "${elementId}" not found`,
        };
      }

      // Look for canvas within the element
      const canvas = element.querySelector('canvas');
      if (!canvas) {
        return {
          success: false,
          error: 'No canvas found in element',
        };
      }

      // Capture the canvas
      return this.captureCanvas(canvas as HTMLCanvasElement, options);
    } catch (error) {
      logger.error(this.loggerPrefix, 'Failed to capture element', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Element capture failed',
      };
    }
  }

  /**
   * Capture a canvas element directly
   */
  public async captureCanvas(
    canvas: HTMLCanvasElement,
    options: ChartCaptureOptions = {}
  ): Promise<CaptureResult> {
    try {
      logger.info(this.loggerPrefix, 'Capturing canvas element');

      const {
        format = 'png',
        quality = 1.0,
        backgroundColor,
        width,
        height,
      } = options;

      // Create a new canvas if resizing is needed
      let targetCanvas = canvas;
      if (width || height) {
        targetCanvas = document.createElement('canvas');
        const ctx = targetCanvas.getContext('2d');
        
        if (ctx) {
          targetCanvas.width = width || canvas.width;
          targetCanvas.height = height || canvas.height;
          
          // Fill background if specified
          if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
          }
          
          // Draw the original canvas scaled to fit
          ctx.drawImage(
            canvas,
            0, 0, canvas.width, canvas.height,
            0, 0, targetCanvas.width, targetCanvas.height
          );
        }
      } else if (backgroundColor) {
        // Add background to existing canvas
        targetCanvas = document.createElement('canvas');
        targetCanvas.width = canvas.width;
        targetCanvas.height = canvas.height;
        
        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(canvas, 0, 0);
        }
      }

      // Convert to data URL
      const mimeType = `image/${format}`;
      const dataUrl = targetCanvas.toDataURL(mimeType, quality);

      // Convert to blob
      const blob = await this.dataUrlToBlob(dataUrl);

      logger.info(this.loggerPrefix, 'Canvas captured successfully', {
        format,
        width: targetCanvas.width,
        height: targetCanvas.height,
        size: blob?.size,
      });

      return {
        success: true,
        dataUrl,
        blob,
      };
    } catch (error) {
      logger.error(this.loggerPrefix, 'Failed to capture canvas', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Canvas capture failed',
      };
    }
  }

  /**
   * Capture multiple charts and combine them
   */
  public async captureMultipleCharts(
    charts: Array<ChartJS | null>,
    options: ChartCaptureOptions & { layout?: 'vertical' | 'horizontal' | 'grid' } = {}
  ): Promise<CaptureResult> {
    try {
      const { layout = 'vertical', ...captureOptions } = options;
      const validCharts = charts.filter(chart => chart !== null) as ChartJS[];
      
      if (validCharts.length === 0) {
        return {
          success: false,
          error: 'No valid charts provided',
        };
      }

      logger.info(this.loggerPrefix, 'Capturing multiple charts', {
        count: validCharts.length,
        layout,
      });

      // Capture each chart
      const captures = await Promise.all(
        validCharts.map(chart => this.captureChartJS(chart, captureOptions))
      );

      // Check for failures
      const failed = captures.filter(c => !c.success);
      if (failed.length > 0) {
        return {
          success: false,
          error: `Failed to capture ${failed.length} of ${captures.length} charts`,
        };
      }

      // Combine images based on layout
      const combinedDataUrl = await this.combineImages(
        captures.map(c => c.dataUrl!),
        layout,
        captureOptions
      );

      const blob = await this.dataUrlToBlob(combinedDataUrl);

      return {
        success: true,
        dataUrl: combinedDataUrl,
        blob,
      };
    } catch (error) {
      logger.error(this.loggerPrefix, 'Failed to capture multiple charts', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Multiple chart capture failed',
      };
    }
  }

  /**
   * Get the currently visible chart from the dashboard
   */
  public async getCurrentVisibleChart(): Promise<CaptureResult> {
    try {
      logger.info(this.loggerPrefix, 'Looking for visible chart');

      // Try to find chart containers by common class names or IDs
      const chartSelectors = [
        '.chartjs-render-monitor', // Chart.js default
        '[data-chart-container]',  // Custom attribute
        '#maintenance-category-chart',
        '#category-breakdown-chart',
        '.chart-container canvas',
      ];

      for (const selector of chartSelectors) {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          if (element instanceof HTMLCanvasElement) {
            return this.captureCanvas(element);
          } else {
            const canvas = element.querySelector('canvas');
            if (canvas) {
              return this.captureCanvas(canvas);
            }
          }
        }
      }

      return {
        success: false,
        error: 'No visible chart found',
      };
    } catch (error) {
      logger.error(this.loggerPrefix, 'Failed to get current chart', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find chart',
      };
    }
  }

  /**
   * Optimize image for PDF inclusion
   */
  public async optimizeForPDF(
    dataUrl: string,
    maxWidth: number = 800,
    maxHeight: number = 600
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Return optimized image as PNG for best PDF quality
        resolve(canvas.toDataURL('image/png', 0.92));
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      img.src = dataUrl;
    });
  }

  /**
   * Helper: Convert data URL to Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob | undefined> {
    try {
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      logger.warn(this.loggerPrefix, 'Failed to convert data URL to blob', { error });
      return undefined;
    }
  }

  /**
   * Helper: Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * Helper: Combine multiple images into one
   */
  private async combineImages(
    dataUrls: string[],
    layout: 'vertical' | 'horizontal' | 'grid',
    options: ChartCaptureOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const images: HTMLImageElement[] = [];
      let loadedCount = 0;

      // Load all images
      dataUrls.forEach(dataUrl => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          if (loadedCount === dataUrls.length) {
            // All images loaded, combine them
            const combined = this.drawCombinedCanvas(images, layout, options);
            resolve(combined);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image for combining'));
        img.src = dataUrl;
        images.push(img);
      });
    });
  }

  /**
   * Helper: Draw combined canvas
   */
  private drawCombinedCanvas(
    images: HTMLImageElement[],
    layout: 'vertical' | 'horizontal' | 'grid',
    options: ChartCaptureOptions
  ): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const padding = 20;
    
    if (layout === 'vertical') {
      // Stack vertically
      const maxWidth = Math.max(...images.map(img => img.width));
      const totalHeight = images.reduce((sum, img) => sum + img.height + padding, -padding);
      
      canvas.width = maxWidth;
      canvas.height = totalHeight;
      
      if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      let y = 0;
      images.forEach(img => {
        const x = (maxWidth - img.width) / 2; // Center horizontally
        ctx.drawImage(img, x, y);
        y += img.height + padding;
      });
    } else if (layout === 'horizontal') {
      // Place side by side
      const maxHeight = Math.max(...images.map(img => img.height));
      const totalWidth = images.reduce((sum, img) => sum + img.width + padding, -padding);
      
      canvas.width = totalWidth;
      canvas.height = maxHeight;
      
      if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      let x = 0;
      images.forEach(img => {
        const y = (maxHeight - img.height) / 2; // Center vertically
        ctx.drawImage(img, x, y);
        x += img.width + padding;
      });
    } else {
      // Grid layout (2 columns)
      const cols = 2;
      const rows = Math.ceil(images.length / cols);
      const cellWidth = Math.max(...images.map(img => img.width));
      const cellHeight = Math.max(...images.map(img => img.height));
      
      canvas.width = cellWidth * cols + padding * (cols - 1);
      canvas.height = cellHeight * rows + padding * (rows - 1);
      
      if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      images.forEach((img, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * (cellWidth + padding) + (cellWidth - img.width) / 2;
        const y = row * (cellHeight + padding) + (cellHeight - img.height) / 2;
        ctx.drawImage(img, x, y);
      });
    }
    
    return canvas.toDataURL('image/png', options.quality || 0.92);
  }

  /**
   * Add watermark to captured image
   */
  public async addWatermark(
    dataUrl: string,
    text: string,
    options: {
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      opacity?: number;
      fontSize?: number;
      color?: string;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Configure watermark
        const {
          position = 'bottom-right',
          opacity = 0.5,
          fontSize = 14,
          color = '#000000',
        } = options;
        
        ctx.globalAlpha = opacity;
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = color;
        
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize;
        const margin = 10;
        
        let x = margin;
        let y = img.height - margin;
        
        switch (position) {
          case 'top-left':
            x = margin;
            y = textHeight + margin;
            break;
          case 'top-right':
            x = img.width - textWidth - margin;
            y = textHeight + margin;
            break;
          case 'bottom-left':
            x = margin;
            y = img.height - margin;
            break;
          case 'bottom-right':
            x = img.width - textWidth - margin;
            y = img.height - margin;
            break;
          case 'center':
            x = (img.width - textWidth) / 2;
            y = (img.height + textHeight) / 2;
            break;
        }
        
        ctx.fillText(text, x, y);
        ctx.globalAlpha = 1.0;
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for watermark'));
      };
      
      img.src = dataUrl;
    });
  }
}

// Export singleton instance
export const chartCaptureService = new ChartCaptureService();