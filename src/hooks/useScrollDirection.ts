// src/hooks/useScrollDirection.ts
import { useState, useEffect, useRef } from 'react';

type ScrollDirection = 'up' | 'down';

/**
 * A custom React hook that detects the scroll direction ('up' or 'down').
 * @param {object} options - Configuration options.
 * @param {number} [options.threshold=10] - The minimum scroll distance (in pixels) to trigger a direction change.
 * @returns {ScrollDirection | null} The current scroll direction, or null if not yet determined.
 */
export function useScrollDirection({ threshold = 10 }: { threshold?: number } = {}): ScrollDirection | null {
  const [scrollDir, setScrollDir] = useState<ScrollDirection | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // Initialize lastScrollY with the current scroll position on mount
    lastScrollY.current = window.scrollY;

    const updateScrollDir = () => {
      const currentScrollY = window.scrollY;

      // Prevent updates if the scroll distance is less than the threshold
      if (Math.abs(currentScrollY - lastScrollY.current) < threshold) {
        return;
      }

      // Determine direction and update state
      setScrollDir(currentScrollY > lastScrollY.current ? 'down' : 'up');
      
      // Update the last scroll position, ensuring it's not negative
      lastScrollY.current = currentScrollY > 0 ? currentScrollY : 0;
    };

    // Throttle the scroll event listener for performance
    const onScroll = () => window.requestAnimationFrame(updateScrollDir);

    window.addEventListener('scroll', onScroll);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrollDir;
}
