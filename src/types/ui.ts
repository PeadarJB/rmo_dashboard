// src/types/ui.ts
// UI type definitions will be added here in Phase 2

export interface UIState {
  loading: boolean;
  error: string | null;
}

export interface Breakpoint {
  mobile: number;
  tablet: number;
  desktop: number;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';