// src/utils/countyLabels.ts

/**
 * Comprehensive mapping of county codes to full county names.
 * This is the single source of truth for county data in the application.
 * 
 * Note: These codes match the actual data structure found in the road segments dataset.
 * Some codes are 2-letter (standard), some are 3+ letter abbreviations for cities/special areas.
 */
export const COUNTY_NAMES: Record<string, string> = {
  // ============= STANDARD COUNTY CODES =============
  // Standard 2-letter county codes (ISO format)
  CW: 'Carlow',
  CN: 'Cavan', 
  CE: 'Clare',
  CK: 'Cork',
  DL: 'Donegal',
  GY: 'Galway',
  KY: 'Kerry',
  KE: 'Kildare',
  KK: 'Kilkenny',
  LS: 'Laois',
  LM: 'Leitrim',
  LK: 'Limerick',
  LD: 'Longford',
  LH: 'Louth',
  MO: 'Mayo',
  MH: 'Meath',
  MN: 'Monaghan',
  OY: 'Offaly',
  RN: 'Roscommon',
  SO: 'Sligo',
  TY: 'Tipperary',
  WD: 'Waterford',
  WH: 'Westmeath',
  WX: 'Wexford',
  WW: 'Wicklow',

  // ============= CITY COUNCILS & SPECIAL AREAS =============
  // Cities with separate administrative status
  CC: 'Cork City',
  GC: 'Galway City',
  
  // Dublin Administrative Areas
  DCC: 'Dublin City',          // Dublin City Council
  DLR: 'Dún Laoghaire-Rathdown', // Dún Laoghaire-Rathdown County Council
  FL: 'Fingal',               // Fingal County Council
  SD: 'South Dublin',         // South Dublin County Council

  // ============= LEGACY/ALTERNATIVE CODES =============
  // These may appear in older datasets or alternative data sources
  'CARLOW': 'Carlow',
  'CAVAN': 'Cavan',
  'CLARE': 'Clare',
  'CORK': 'Cork',
  'CORKCITY': 'Cork City',
  'DONEGAL': 'Donegal',
  'DUBLIN': 'Dublin City',
  'DUBLINCITY': 'Dublin City',
  'DUNLAOGHAIRE': 'Dún Laoghaire-Rathdown',
  'FINGAL': 'Fingal',
  'GALWAY': 'Galway',
  'GALWAYCITY': 'Galway City',
  'KERRY': 'Kerry',
  'KILDARE': 'Kildare',
  'KILKENNY': 'Kilkenny',
  'LAOIS': 'Laois',
  'LEITRIM': 'Leitrim',
  'LIMERICK': 'Limerick',
  'LONGFORD': 'Longford',
  'LOUTH': 'Louth',
  'MAYO': 'Mayo',
  'MEATH': 'Meath',
  'MONAGHAN': 'Monaghan',
  'OFFALY': 'Offaly',
  'ROSCOMMON': 'Roscommon',
  'SLIGO': 'Sligo',
  'SOUTHDUBLIN': 'South Dublin',
  'TIPPERARY': 'Tipperary',
  'WATERFORD': 'Waterford',
  'WESTMEATH': 'Westmeath',
  'WEXFORD': 'Wexford',
  'WICKLOW': 'Wicklow',

  // ============= HISTORICAL/DEPRECATED CODES =============
  // May appear in legacy data - kept for backwards compatibility
  'CAR': 'Carlow',
  'CAV': 'Cavan', 
  'CLA': 'Clare',
  'COR': 'Cork',
  'DON': 'Donegal',
  'DUB': 'Dublin City',
  'GAL': 'Galway',
  'KER': 'Kerry',
  'KIL': 'Kildare',
  'KIK': 'Kilkenny',
  'LAO': 'Laois',
  'LEI': 'Leitrim',
  'LIM': 'Limerick',
  'LON': 'Longford',
  'LOU': 'Louth',
  'MAY': 'Mayo',
  'MEA': 'Meath',
  'MON': 'Monaghan',
  'OFF': 'Offaly',
  'ROS': 'Roscommon',
  'SLI': 'Sligo',
  'TIP': 'Tipperary',
  'WAT': 'Waterford',
  'WES': 'Westmeath',
  'WEX': 'Wexford',
  'WIC': 'Wicklow',

  // Special abbreviations that might appear in data
  'DLRD': 'Dún Laoghaire-Rathdown',
  'STHDUB': 'South Dublin',
  'FIN': 'Fingal',
};

/**
 * Inverted mapping for looking up county code from full name.
 * Automatically derived from COUNTY_NAMES for consistency.
 */
export const NAME_TO_CODE = Object.entries(COUNTY_NAMES).reduce(
  (acc, [code, name]) => {
    // Use the shortest/most standard code for each name
    if (!acc[name] || code.length < acc[name].length) {
      acc[name] = code;
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Get all unique county names (removes duplicates from alternative codes)
 */
export const UNIQUE_COUNTY_NAMES = Array.from(new Set(Object.values(COUNTY_NAMES))).sort();

/**
 * Get all standard 2-letter county codes
 */
export const STANDARD_COUNTY_CODES = Object.keys(COUNTY_NAMES).filter(code => 
  code.length === 2 && code === code.toUpperCase()
);

/**
 * Administrative regions for grouping counties
 */
export const COUNTY_REGIONS: Record<string, string[]> = {
  'Dublin Region': ['DCC', 'DLR', 'FL', 'SD'],
  'Cities': ['CC', 'DCC', 'GC'],
  'Western Counties': ['GY', 'MO', 'RN', 'SO', 'LK', 'DL'],
  'Eastern Counties': ['WW', 'WX', 'CW', 'KE', 'MH', 'LH'],
  'Southern Counties': ['CK', 'CC', 'KY', 'WD'],
  'Northern Counties': ['DL', 'SO', 'LM', 'CN', 'MN'],
  'Midland Counties': ['LD', 'WH', 'OY', 'LS', 'RN'],
};

/**
 * Population-based groupings (approximate for filtering)
 */
export const COUNTY_POPULATION_GROUPS: Record<string, string[]> = {
  'Large Population': ['DCC', 'CK', 'GY', 'LK', 'KE'],
  'Medium Population': ['WW', 'MH', 'DL', 'WX', 'TY'],
  'Small Population': ['CW', 'LS', 'LD', 'LM', 'MN'],
};

/**
 * Utility functions for county operations
 */
export const countyUtils = {
  /**
   * Get display name for a county code, with fallback
   */
  getDisplayName: (code: string): string => {
    return COUNTY_NAMES[code.toUpperCase()] || code;
  },

  /**
   * Get county code from display name
   */
  getCodeFromName: (name: string): string | undefined => {
    return NAME_TO_CODE[name];
  },

  /**
   * Validate if a county code exists
   */
  isValidCode: (code: string): boolean => {
    return code.toUpperCase() in COUNTY_NAMES;
  },

  /**
   * Normalize county code (handle variations)
   */
  normalizeCode: (code: string): string => {
    const upperCode = code.toUpperCase();
    
    // Handle common variations
    const variations: Record<string, string> = {
      'DUBLIN_CITY': 'DCC',
      'DUN_LAOGHAIRE': 'DLR',
      'SOUTH_DUBLIN': 'SD',
      'CORK_CITY': 'CC',
      'GALWAY_CITY': 'GC',
    };

    return variations[upperCode] || upperCode;
  },

  /**
   * Get counties by region
   */
  getCountiesByRegion: (region: keyof typeof COUNTY_REGIONS): string[] => {
    return COUNTY_REGIONS[region] || [];
  },

  /**
   * Get region for a county
   */
  getRegionForCounty: (code: string): string | undefined => {
    for (const [region, counties] of Object.entries(COUNTY_REGIONS)) {
      if (counties.includes(code)) {
        return region;
      }
    }
    return undefined;
  },

  /**
   * Sort counties by name
   */
  sortByName: (codes: string[]): string[] => {
    return [...codes].sort((a, b) => 
      countyUtils.getDisplayName(a).localeCompare(countyUtils.getDisplayName(b))
    );
  },

  /**
   * Filter counties by search term
   */
  filterBySearch: (codes: string[], searchTerm: string): string[] => {
    const term = searchTerm.toLowerCase();
    return codes.filter(code => {
      const name = countyUtils.getDisplayName(code).toLowerCase();
      return name.includes(term) || code.toLowerCase().includes(term);
    });
  },

  /**
   * Format county list for display
   */
  formatCountyList: (codes: string[], maxDisplay: number = 3): string => {
    if (codes.length === 0) return 'No counties';
    if (codes.length === 1) return countyUtils.getDisplayName(codes[0]);
    if (codes.length <= maxDisplay) {
      return codes.map(code => countyUtils.getDisplayName(code)).join(', ');
    }
    
    const displayed = codes.slice(0, maxDisplay).map(code => countyUtils.getDisplayName(code));
    return `${displayed.join(', ')} +${codes.length - maxDisplay} more`;
  },

  /**
   * Get all Dublin area codes (for special handling)
   */
  getDublinCodes: (): string[] => {
    return ['DCC', 'DLR', 'FL', 'SD'];
  },

  /**
   * Check if code represents Dublin area
   */
  isDublinArea: (code: string): boolean => {
    return countyUtils.getDublinCodes().includes(code);
  },

  /**
   * Get city council codes
   */
  getCityCodes: (): string[] => {
    return ['CC', 'DCC', 'GC'];
  },

  /**
   * Check if code represents a city council
   */
  isCityCouncil: (code: string): boolean => {
    return countyUtils.getCityCodes().includes(code);
  },
};