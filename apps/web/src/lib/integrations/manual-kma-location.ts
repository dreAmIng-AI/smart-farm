import { toKmaForecastGrid, type KmaForecastGrid } from "./kma-grid";

type ManualKmaLocationResult =
  | { ok: true; grid: KmaForecastGrid }
  | { ok: false; message: string };

/**
 * Converts a one-time administrator-supplied coordinate to a KMA grid in the
 * browser. Callers must not send the source coordinate to an API or persist it.
 */
export function manualKmaLocationToGrid(
  latitudeText: string,
  longitudeText: string,
): ManualKmaLocationResult {
  const latitude = Number(latitudeText.trim());
  const longitude = Number(longitudeText.trim());

  if (!latitudeText.trim() || !longitudeText.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, message: "위도와 경도를 숫자로 모두 입력해 주세요." };
  }

  const grid = toKmaForecastGrid(latitude, longitude);
  if (!grid) {
    return { ok: false, message: "대한민국 안의 위치인지 위도와 경도를 다시 확인해 주세요." };
  }

  return { ok: true, grid };
}
