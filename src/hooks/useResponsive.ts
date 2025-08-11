// src/hooks/useResponsive.ts
// Responsive design hook - to be implemented in Phase 2

import { useState, useEffect } from 'react';
import type { DeviceType } from '@/types/ui';

const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};

export function useResponsive(): DeviceType {
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < breakpoints.mobile) {
        setDevice('mobile');
      } else if (width < breakpoints.tablet) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return device;
}