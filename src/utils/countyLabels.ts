// src/utils/countyLabels.ts

/**
 * Authoritative map of 2-letter county codes to full county names.
 * This is the single source of truth for county data in the application.
 */
export const COUNTY_NAMES: Record<string, string> = {
  CW: 'Carlow',
  CN: 'Cavan',
  CE: 'Clare',
  CK: 'Cork',
  CC: 'Cork City',
  DCC: 'Dublin City',
  DLR: 'Dún Laoghaire-Rathdown',
  DL: 'Donegal',
  FL: 'Fingal',
  GC: 'Galway City',
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
  SD: 'South Dublin',
  TY: 'Tipperary',
  WD: 'Waterford',
  WH: 'Westmeath',
  WX: 'Wexford',
  WW: 'Wicklow',
};

/**
 * Inverted map for looking up a 2-letter code from a full county name.
 * Automatically derived from COUNTY_NAMES.
 */
export const NAME_TO_CODE = Object.entries(COUNTY_NAMES).reduce(
  (acc, [code, name]) => {
    acc[name] = code;
    return acc;
  },
  {} as Record<string, string>
);