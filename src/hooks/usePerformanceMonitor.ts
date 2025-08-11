// src/hooks/usePerformanceMonitor.ts
// Performance monitoring hook - to be implemented in Phase 4

import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    console.debug(`${componentName} rendered ${renderCount.current} times`);
  });

  return {
    renderCount: renderCount.current,
  };
}