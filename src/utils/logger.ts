// src/utils/logger.ts
import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'PERF';
type LogContext = Record<string, any>;

interface LogConfig {
  level: LogLevel;
  enabledLevels: Set<LogLevel>;
  sampleRate: number;
  perfBudgets: {
    componentRender: number;
    dataFetch: number;
    calculation: number;
    chartUpdate: number;
    stateUpdate: number;
  };
}

class Logger {
  private config: LogConfig;
  private performanceMarks: Map<string, number> = new Map();
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
    
    // Initialize config based on environment
    this.config = this.isDevelopment ? this.getDevConfig() : this.getProdConfig();
    
    // Check for runtime override
    this.checkRuntimeOverride();
    
    // Initialize web vitals monitoring
    if (this.isProduction) {
      this.initWebVitals();
    }
  }

  private getDevConfig(): LogConfig {
    return {
      level: 'DEBUG',
      enabledLevels: new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'PERF']),
      sampleRate: 1.0,
      perfBudgets: {
        componentRender: 16,    // 1 frame at 60fps
        dataFetch: 300,
        calculation: 500,
        chartUpdate: 100,
        stateUpdate: 50,
      },
    };
  }

  private getProdConfig(): LogConfig {
    return {
      level: 'INFO',
      enabledLevels: new Set(['WARN', 'ERROR', 'PERF']),
      sampleRate: 0.1, // Sample 10% of INFO logs
      perfBudgets: {
        componentRender: 50,
        dataFetch: 1000,
        calculation: 2000,
        chartUpdate: 300,
        stateUpdate: 100,
      },
    };
  }

  private checkRuntimeOverride(): void {
    const override = localStorage.getItem('LOG_LEVEL');
    if (override) {
      const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'PERF'];
      const overrideLevel = override as LogLevel;
      
      if (levels.includes(overrideLevel)) {
        this.config.level = overrideLevel;
        // Enable all levels up to and including the override
        const enabledLevels = new Set<LogLevel>();
        const levelIndex = levels.indexOf(overrideLevel);
        for (let i = levelIndex; i < levels.length; i++) {
          enabledLevels.add(levels[i]);
        }
        this.config.enabledLevels = enabledLevels;
        console.log(`[Logger] Runtime override active: ${override}`);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabledLevels.has(level)) return false;
    
    // Apply sampling to INFO logs in production
    if (this.isProduction && level === 'INFO') {
      return Math.random() < this.config.sampleRate;
    }
    
    return true;
  }

  private formatMessage(
    level: LogLevel,
    component: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] [${component}] ${message}${contextStr}`;
  }

  private getConsoleMethod(level: LogLevel): keyof Console {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARN': return 'warn';
      case 'INFO': return 'info';
      case 'DEBUG': return 'debug';
      case 'PERF': return 'log';
      default: return 'log';
    }
  }

  private log(
    level: LogLevel,
    component: string,
    message: string,
    context?: LogContext
  ): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, component, message, context);
    const method = this.getConsoleMethod(level);
    
    // Use appropriate console method with styling
    if (this.isDevelopment) {
      const styles = this.getLogStyles(level);
      (console[method] as Function)(`%c${formattedMessage}`, styles);
    } else {
      (console[method] as Function)(formattedMessage);
    }

    // Send to Sentry in production for errors
    if (this.isProduction && level === 'ERROR' && window.Sentry) {
      window.Sentry.captureMessage(formattedMessage, 'error');
    }
  }

  private getLogStyles(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      DEBUG: 'color: #888; font-size: 11px;',
      INFO: 'color: #2196F3;',
      WARN: 'color: #FF9800; font-weight: bold;',
      ERROR: 'color: #F44336; font-weight: bold;',
      PERF: 'color: #4CAF50; font-style: italic;',
    };
    return styles[level];
  }

  // Public logging methods
  debug(component: string, message: string, context?: LogContext): void {
    this.log('DEBUG', component, message, context);
  }

  info(component: string, message: string, context?: LogContext): void {
    this.log('INFO', component, message, context);
  }

  warn(component: string, message: string, context?: LogContext): void {
    this.log('WARN', component, message, context);
  }

  error(component: string, message: string, context?: LogContext): void {
    this.log('ERROR', component, message, context);
  }

  // Performance monitoring
  startPerf(markName: string): void {
    this.performanceMarks.set(markName, performance.now());
    this.debug('Performance', `Started timing: ${markName}`);
  }

  endPerf(markName: string, budgetType?: keyof LogConfig['perfBudgets']): number {
    const startTime = this.performanceMarks.get(markName);
    if (!startTime) {
      this.warn('Performance', `No start mark found for: ${markName}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(markName);

    // Check against budget if specified
    if (budgetType && this.config.perfBudgets[budgetType]) {
      const budget = this.config.perfBudgets[budgetType];
      if (duration > budget) {
        this.warn('Performance', `Budget exceeded for ${markName}`, {
          duration: `${duration.toFixed(2)}ms`,
          budget: `${budget}ms`,
          exceeded: `${(duration - budget).toFixed(2)}ms`,
        });
      } else {
        this.log('PERF', 'Performance', `${markName} completed`, {
          duration: `${duration.toFixed(2)}ms`,
          budget: `${budget}ms`,
        });
      }
    } else {
      this.log('PERF', 'Performance', `${markName} completed`, {
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    return duration;
  }

  // User action tracking
  userAction(action: string, details?: LogContext): void {
    this.info('UserAction', action, {
      ...details,
      timestamp: Date.now(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
  }

  // Component lifecycle logging
  componentMount(name: string, props?: LogContext): void {
    this.debug('Component', `${name} mounted`, props);
  }

  componentUnmount(name: string): void {
    this.debug('Component', `${name} unmounted`);
  }

  componentUpdate(name: string, changes: { before: any; after: any }): void {
    this.debug('Component', `${name} updated`, changes);
  }

  // State change logging
  stateChange(storeName: string, action: string, payload?: any): void {
    this.debug('State', `${storeName}.${action}`, payload);
  }

  // Network request logging
  apiRequest(method: string, url: string, options?: LogContext): void {
    this.info('API', `${method} ${url}`, options);
  }

  apiResponse(method: string, url: string, status: number, duration: number): void {
    const level = status >= 400 ? 'ERROR' : 'INFO';
    this.log(level, 'API', `${method} ${url} -> ${status}`, {
      duration: `${duration.toFixed(2)}ms`,
      status,
    });
  }

  // Web Vitals integration
  private initWebVitals(): void {
    onCLS((metric: Metric) => this.logWebVital('CLS', metric.value));
    onINP((metric: Metric) => this.logWebVital('INP', metric.value));
    onFCP((metric: Metric) => this.logWebVital('FCP', metric.value));
    onLCP((metric: Metric) => this.logWebVital('LCP', metric.value));
    onTTFB((metric: Metric) => this.logWebVital('TTFB', metric.value));
  }

  private logWebVital(name: string, value: number): void {
    this.log('PERF', 'WebVital', name, { value: value.toFixed(2) });
  }

  // Group logging (for related operations)
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  // Table logging (for structured data)
  table(data: any[], columns?: string[]): void {
    if (this.isDevelopment && this.shouldLog('DEBUG')) {
      console.table(data, columns);
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const {
  debug,
  info,
  warn,
  error,
  startPerf,
  endPerf,
  userAction,
  componentMount,
  componentUnmount,
  componentUpdate,
  stateChange,
  apiRequest,
  apiResponse,
  group,
  groupEnd,
  table,
} = logger;

// React component helper hooks
export const useComponentLogger = (componentName: string) => {
  return {
    mount: (props?: LogContext) => logger.componentMount(componentName, props),
    unmount: () => logger.componentUnmount(componentName),
    update: (changes: { before: any; after: any }) => 
      logger.componentUpdate(componentName, changes),
    action: (action: string, details?: LogContext) => 
      logger.userAction(`${componentName}.${action}`, details),
  };
};

// Performance timing hook
export const usePerformanceTimer = (operation: string) => {
  const start = () => logger.startPerf(operation);
  const end = (budgetType?: keyof LogConfig['perfBudgets']) => 
    logger.endPerf(operation, budgetType);
  
  return { start, end };
};

// TypeScript augmentation for window.Sentry
declare global {
  interface Window {
    Sentry?: {
      captureMessage: (message: string, level: string) => void;
      captureException: (error: Error) => void;
    };
  }
}