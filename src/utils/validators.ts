// src/utils/validators.ts
import { z } from 'zod';

// ============= BASE SCHEMAS =============

// Survey years as literal union
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
  joinKey: z.string(),                    // NEW - unique identifier for joins
  isDublin: z.number(),                   // NEW (0 or 1)
  isCityTown: z.number(),                 // NEW (0 or 1)
  isPeat: z.number(),                     // NEW (0 or 1)
  isFormerNa: z.number(),                 // NEW (0 or 1)
  isNew: z.number(),                      // NEW (0 or 1)
  data: z.object({
    "2011": RoadConditionsSchema.nullish(),  // Allows null or undefined (missing key)
    "2018": RoadConditionsSchema.nullish(),  // Allows null or undefined (missing key)
    "2025": RoadConditionsSchema.nullish(),  // Allows null or undefined (missing key)
  }),
});

// Array of segments for the full dataset
export const FullDatasetSchema = z.array(RoadSegmentDataSchema);

// ============= SUMMARY FILE SCHEMAS =============

// Default parameters from your actual JSON structure
const DefaultParametersSchema = z.object({
  reconstruction_iri: z.number(),
  reconstruction_rut: z.number(),
  reconstruction_psci: z.number(),
  overlay_iri: z.number(),
  overlay_rut: z.number(),
  overlay_psci: z.number(),
  restoration_psci_lower: z.number(),
  restoration_psci_upper: z.number(),
  restoration_iri: z.number(),
  skid_psci_lower: z.number(),
  skid_psci_upper: z.number(),
  skid_csc: z.number(),
  skid_mpd: z.number(),
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
    z.string(), // Category key (e.g., "Road Reconstruction", "Structural Overlay")
    CategoryBreakdownSchema
  )
);

// Complete summary file structure
export const SummaryFileDataSchema = z.object({
  metadata: SummaryMetadataSchema,
  summary: z.record(z.string(), CountySummarySchema), // County key -> summary
});

// ============= SIMPLIFIED SUMMARY FOR UI =============

export const SummaryDataSchema = z.object({
  totalSegments: z.number(),
  totalLength: z.number(),
  totalCost: z.number(),
  localAuthorities: z.array(z.string()),
  lastUpdated: z.string(),
  metadata: SummaryMetadataSchema.optional(),
  countyBreakdown: z.record(z.string(), CountySummarySchema).optional(),
});

// ============= TYPE EXPORTS =============

export type ValidatedRoadSegment = z.infer<typeof RoadSegmentDataSchema>;
export type ValidatedSummaryFile = z.infer<typeof SummaryFileDataSchema>;
export type ValidatedSummaryData = z.infer<typeof SummaryDataSchema>;

// ============= VALIDATION HELPERS =============

export function validateSegment(data: unknown): ValidatedRoadSegment | null {
  try {
    return RoadSegmentDataSchema.parse(data);
  } catch (error) {
    console.error('Invalid segment data:', error);
    return null;
  }
}

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
        result.errors.push(`Segment ${index}: ${error.issues[0].message}`);
      }
    }
  });

  return result;
}

export function validateSummaryFile(data: unknown): ValidatedSummaryFile | null {
  try {
    return SummaryFileDataSchema.parse(data);
  } catch (error) {
    console.error('Invalid summary file structure:', error);
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.issues);
    }
    return null;
  }
}