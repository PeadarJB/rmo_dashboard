import type { MaintenanceCategory } from '@/types/calculations';

export const CATEGORY_LABELS: Record<MaintenanceCategory, { short: string; full: string }> = {
  'Road Reconstruction': { short: 'RR', full: 'Road Reconstruction' },
  'Structural Overlay': { short: 'SO', full: 'Structural Overlay' },
  'Surface Restoration': { short: 'SR', full: 'Surface Restoration' },
  'Restoration of Skid Resistance': { short: 'RSR', full: 'Restoration of Skid Resistance' },
  'Routine Maintenance': { short: 'RM', full: 'Routine Maintenance' },
};
