// src/utils/dataTransform.ts
import { RoadSegment, SummaryData } from '@/types/data';

export function generateSummaryFromDataset(segments: RoadSegment[]): SummaryData {
  const localAuthorities = [...new Set(segments.map(s => s.la_name))];
  
  const totalLength = segments.reduce((sum, segment) => sum + segment.length_m, 0);
  
  // Placeholder cost calculation - will be refined with actual business logic
  const totalCost = segments.reduce((sum, segment) => {
    const area = segment.length_m * segment.width_m;
    const baseCost = area * 50; // €50/sqm placeholder
    return sum + baseCost;
  }, 0);

  return {
    totalSegments: segments.length,
    totalLength,
    totalCost,
    localAuthorities,
    lastUpdated: new Date().toISOString(),
  };
}