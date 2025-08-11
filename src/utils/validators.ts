// src/utils/validators.ts
import { z } from 'zod';

const RoadConditionsSchema = z.object({
  year: z.number(),
  iri: z.number(),
  rut: z.number(),
  psci: z.number(),
  csc: z.number(),
  mpd: z.number(),
  category: z.string().nullable(),
  sqm: z.number(),
});

export const RoadSegmentSchema = z.object({
  id: z.string(),
  la_name: z.string(),
  road_number: z.string(),
  road_name: z.string(),
  section_id: z.string(),
  network_type: z.enum(['National', 'Regional', 'Local']),
  length_m: z.number().positive(),
  width_m: z.number().positive(),
  conditions_2011: RoadConditionsSchema,
  conditions_2018: RoadConditionsSchema,
});

export const DatasetSchema = z.array(RoadSegmentSchema);

export const SummaryDataSchema = z.object({
  totalSegments: z.number(),
  totalLength: z.number(),
  totalCost: z.number(),
  localAuthorities: z.array(z.string()),
  lastUpdated: z.string(),
});