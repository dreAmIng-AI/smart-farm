export type DeviceCoordinates = {
  latitude: number;
  longitude: number;
};

export type DeviceGeolocationError = {
  code?: number;
};

export type DevicePositionOptions = {
  enableHighAccuracy: boolean;
  maximumAge: number;
  timeout: number;
};

export type DevicePositionRequest = (
  options: DevicePositionOptions,
) => Promise<DeviceCoordinates>;

type DeviceLocationResult =
  | { ok: true; coordinates: DeviceCoordinates; usedHighAccuracy: boolean }
  | { ok: false; error: DeviceGeolocationError };

const GENERAL_POSITION_OPTIONS: DevicePositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 5 * 60_000,
  timeout: 15_000,
};

const HIGH_ACCURACY_POSITION_OPTIONS: DevicePositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30_000,
};

/**
 * First use the general Wi-Fi/network location many ordinary browsers can
 * provide. Only then retry a fresh GPS-quality request. Coordinates remain
 * in the browser; callers convert them directly to a KMA grid.
 */
export async function locateDevicePosition(
  requestPosition: DevicePositionRequest,
): Promise<DeviceLocationResult> {
  try {
    return { ok: true, coordinates: await requestPosition(GENERAL_POSITION_OPTIONS), usedHighAccuracy: false };
  } catch (error) {
    const firstError = error as DeviceGeolocationError;
    if (firstError.code === 1) {
      return { ok: false, error: firstError };
    }
  }

  try {
    return { ok: true, coordinates: await requestPosition(HIGH_ACCURACY_POSITION_OPTIONS), usedHighAccuracy: true };
  } catch (error) {
    return { ok: false, error: error as DeviceGeolocationError };
  }
}

export function requestBrowserPosition(options: DevicePositionOptions): Promise<DeviceCoordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      reject,
      options,
    );
  });
}
