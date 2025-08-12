// src/utils/validators.ts
import { z } from 'zod';

// ============= BASE SCHEMAS =============

// Survey years as literal union (removed if unused, or export if needed elsewhere)
export const SurveyYearSchema = z.enum(['2011', '2018', '2025']);

// Road conditions for a specific year - all nullable except width and sqm
const RoadConditionsSchema = z.object({
  iri: z.number().nullable(),
  rut: z.number().nullable(),
  psci: z.number().nullable(),
  csc: z.number().nullable(),
  mpd: z.number().nullable(),
  width: z.number(),
  category: z.string().nullable(),
  sqm: z.number(),
});

// Main segment structure - matches JSON exactly
export const RoadSegmentDataSchema = z.object({
  id: z.number(),
  roadNumber: z.string(),
  county: z.string(),
  data: z.object({
    "2011": RoadConditionsSchema.nullable(),
    "2018": RoadConditionsSchema.nullable(),
    "2025": RoadConditionsSchema.nullable(),
  }),
});

// Array of segments for the full dataset
export const FullDatasetSchema = z.array(RoadSegmentDataSchema);

// ============= SUMMARY FILE SCHEMAS =============

// Default parameters from summary metadata
const DefaultParametersSchema = z.object({
  roadReconstruction_iri: z.number(),
  roadReconstruction_rut: z.number(),
  roadReconstruction_psci: z.number(),
  structuralOverlay_iri: z.number(),
  structuralOverlay_rut: z.number(),
  structuralOverlay_psci: z.number(),
  surfaceRestoration_psci_a: z.number(),
  surfaceRestoration_psci_b: z.number(),
  surfaceRestoration_iri: z.number(),
  surfaceRestoration_psci_c: z.number(),
  restorationOfSkidResistance_psci_a: z.number(),
  restorationOfSkidResistance_psci_b: z.number(),
  restorationOfSkidResistance_csc: z.number(),
  restorationOfSkidResistance_psci_c: z.number(),
  restorationOfSkidResistance_mpd: z.number(),
});

// Default costs from summary metadata
const DefaultCostsSchema = z.object({
  rr: z.number(),  // Road Reconstruction
  so: z.number(),  // Structural Overlay
  sr: z.number(),  // Surface Restoration
  rs: z.number(),  // Restoration of Skid Resistance
  rm: z.number(),  // Routine Maintenance
});

// Summary metadata structure
const SummaryMetadataSchema = z.object({
  localAuthorities: z.array(z.string()),
  surveyYears: z.array(z.string()),
  defaultParameters: DefaultParametersSchema,
  defaultCosts: DefaultCostsSchema,
});

// Category breakdown in summary
const CategoryBreakdownSchema = z.object({
  length: z.number(),
  cost: z.number(),
  count: z.number(),
});

// County summary by year and category
const CountySummarySchema = z.record(
  z.string(), // Year key
  z.record(
    z.string(), // Category key
    CategoryBreakdownSchema
  )
);

// Complete summary file structure
export const SummaryFileDataSchema = z.object({
  metadata: SummaryMetadataSchema,
  summary: z.record(z.string(), CountySummarySchema), // County key -> summary
});

// ============= SIMPLIFIED SUMMARY FOR UI =============

// This is what we store in state - a simplified version
export const SummaryDataSchema = z.object({
  totalSegments: z.number(),
  totalLength: z.number(),
  totalCost: z.number(),
  localAuthorities: z.array(z.string()),
  lastUpdated: z.string(),
  // Optional rich data from file
  metadata: SummaryMetadataSchema.optional(),
  countyBreakdown: z.record(z.string(), CountySummarySchema).optional(),
});

// ============= TYPE EXPORTS =============

// Export inferred types from schemas
export type ValidatedRoadSegment = z.infer<typeof RoadSegmentDataSchema>;
export type ValidatedSummaryFile = z.infer<typeof SummaryFileDataSchema>;
export type ValidatedSummaryData = z.infer<typeof SummaryDataSchema>;

// ============= VALIDATION HELPERS =============

/**
 * Validate a single segment
 */
export function validateSegment(data: unknown): ValidatedRoadSegment | null {
  try {
    return RoadSegmentDataSchema.parse(data);
  } catch (error) {
    console.error('Invalid segment data:', error);
    return null;
  }
}

/**
 * Validate full dataset with error reporting
 */
export function validateDataset(data: unknown): {
  valid: ValidatedRoadSegment[];
  invalid: number[];
  errors: string[];
} {
  const result = {
    valid: [] as ValidatedRoadSegment[],
    invalid: [] as number[],
    errors: [] as string[],
  };

  if (!Array.isArray(data)) {
    result.errors.push('Dataset is not an array');
    return result;
  }

  data.forEach((item, index) => {
    try {
      const validated = RoadSegmentDataSchema.parse(item);
      result.valid.push(validated);
    } catch (error) {
      result.invalid.push(index);
      if (error instanceof z.ZodError) {
        // Fixed: Use 'issues' instead of 'errors'
        result.errors.push(`Segment ${index}: ${error.issues[0].message}`);
      }
    }
  });

  return result;
}

/**
 * Extract and validate summary from file
 */
export function validateSummaryFile(data: unknown): ValidatedSummaryFile | null {
  try {
    return SummaryFileDataSchema.parse(data);
  } catch (error) {
    console.error('Invalid summary file structure:', error);
    if (error instanceof z.ZodError) {
      // Fixed: Use 'issues' instead of 'errors'
      console.error('Validation errors:', error.issues);
    }
    return null;
  }
}