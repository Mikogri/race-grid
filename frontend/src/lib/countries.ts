/** OpenF1 driver country_code (3-letter, IOC style) → display name. Unknown codes are shown as the code itself. */
const NAMES: Record<string, string> = {
  ARG: "Argentina",
  AUS: "Australia",
  AUT: "Austria",
  BEL: "Belgium",
  BRA: "Brazil",
  CAN: "Canada",
  CHN: "China",
  DEN: "Denmark",
  ESP: "Spain",
  FIN: "Finland",
  FRA: "France",
  GBR: "United Kingdom",
  GER: "Germany",
  ITA: "Italy",
  JPN: "Japan",
  MEX: "Mexico",
  MON: "Monaco",
  NED: "Netherlands",
  NZL: "New Zealand",
  POL: "Poland",
  SUI: "Switzerland",
  SWE: "Sweden",
  THA: "Thailand",
  USA: "United States",
};

/**
 * Nationality by driver acronym, 2023–2026 grids. OpenF1 leaves `country_code` empty for almost every recent
 * session, so this is the fallback. Maintained by hand: add new drivers here.
 */
const DRIVER_COUNTRY: Record<string, string> = {
  ALB: "THA",
  ALO: "ESP",
  ANT: "ITA",
  BEA: "GBR",
  BOR: "BRA",
  BOT: "FIN",
  COL: "ARG",
  DEV: "NED",
  DOO: "AUS",
  GAS: "FRA",
  HAD: "FRA",
  HAM: "GBR",
  HUL: "GER",
  LAW: "NZL",
  LEC: "MON",
  LIN: "GBR",
  MAG: "DEN",
  NOR: "GBR",
  OCO: "FRA",
  PER: "MEX",
  PIA: "AUS",
  RIC: "AUS",
  RUS: "GBR",
  SAI: "ESP",
  SAR: "USA",
  STR: "CAN",
  TSU: "JPN",
  VER: "NED",
  ZHO: "CHN",
};

export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

/** Driver's country: OpenF1 when it has one, otherwise the acronym fallback above. */
export function driverCountry(
  driver: { countryCode: string | null; acronym: string } | undefined,
): string | null {
  if (!driver) return null;
  return countryName(
    driver.countryCode ?? DRIVER_COUNTRY[driver.acronym] ?? null,
  );
}
