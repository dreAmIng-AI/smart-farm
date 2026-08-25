const EARTH_RADIUS_KM = 6371.00877;
const GRID_SIZE_KM = 5;
const STANDARD_PARALLEL_1 = 30;
const STANDARD_PARALLEL_2 = 60;
const ORIGIN_LONGITUDE = 126;
const ORIGIN_LATITUDE = 38;
const ORIGIN_X = 43;
const ORIGIN_Y = 136;
const DEGREES_TO_RADIANS = Math.PI / 180;

export type KmaForecastGrid = {
  x: number;
  y: number;
};

export function isKmaForecastGrid(value: unknown): value is KmaForecastGrid {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.x === "number" &&
    Number.isInteger(candidate.x) &&
    candidate.x >= 1 &&
    candidate.x <= 149 &&
    typeof candidate.y === "number" &&
    Number.isInteger(candidate.y) &&
    candidate.y >= 1 &&
    candidate.y <= 253
  );
}

/**
 * Converts a one-time browser coordinate to the KMA 5 km forecast grid.
 * The input coordinate is intentionally not persisted or sent to the server.
 */
export function toKmaForecastGrid(latitude: number, longitude: number): KmaForecastGrid | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 31 || latitude > 44 || longitude < 123 || longitude > 133) {
    return null;
  }

  const re = EARTH_RADIUS_KM / GRID_SIZE_KM;
  const slat1 = STANDARD_PARALLEL_1 * DEGREES_TO_RADIANS;
  const slat2 = STANDARD_PARALLEL_2 * DEGREES_TO_RADIANS;
  const olon = ORIGIN_LONGITUDE * DEGREES_TO_RADIANS;
  const olat = ORIGIN_LATITUDE * DEGREES_TO_RADIANS;
  const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
  const sf = (Math.tan(Math.PI * 0.25 + slat1 * 0.5) ** sn * Math.cos(slat1)) / sn;
  const ro = (re * sf) / (Math.tan(Math.PI * 0.25 + olat * 0.5) ** sn);
  const ra = (re * sf) / (Math.tan(Math.PI * 0.25 + latitude * DEGREES_TO_RADIANS * 0.5) ** sn);
  let theta = longitude * DEGREES_TO_RADIANS - olon;

  if (theta > Math.PI) theta -= Math.PI * 2;
  if (theta < -Math.PI) theta += Math.PI * 2;
  theta *= sn;

  const grid = {
    x: Math.floor(ra * Math.sin(theta) + ORIGIN_X + 0.5),
    y: Math.floor(ro - ra * Math.cos(theta) + ORIGIN_Y + 0.5),
  };

  return isKmaForecastGrid(grid) ? grid : null;
}
