// src/utils/dataTransform.ts
import { RoadSegmentData, SummaryData } from '@/types/data';

export function generateSummaryFromDataset(segments: RoadSegmentData[]): SummaryData {
  // 'county' property contains local authority codes like 'DCC', 'STHDUB'
  const localAuthorities = [...new Set(segments.map(s => s.county))];
  
  // Each segment is fixed 100m length
  const SEGMENT_LENGTH = 100;
  const totalLength = segments.length * SEGMENT_LENGTH;
  
  // Placeholder cost calculation - will be refined with actual business logic
  const totalCost = segments.reduce((sum, segment) => {
    // Get width from most recent year data available
    const width = segment.data["2018"]?.width || 
                  segment.data["2011"]?.width || 
                  7; // Default 7m if no data
    
    const area = SEGMENT_LENGTH * width;
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