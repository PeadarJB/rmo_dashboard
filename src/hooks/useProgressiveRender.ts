// src/hooks/useProgressiveRender.ts
// Progressive rendering hook - to be implemented in Phase 3

import { useState, useEffect } from 'react';

export function useProgressiveRender<T>(data: T[], chunkSize = 10): T[] {
  const [visibleData, setVisibleData] = useState<T[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setVisibleData([]);
      return;
    }

    // Start with first chunk
    setVisibleData(data.slice(0, chunkSize));

    // Load rest after initial render
    if (data.length > chunkSize) {
      const timer = setTimeout(() => {
        setVisibleData(data);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data, chunkSize]);

  return visibleData;
}