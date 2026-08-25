import { describe, expect, it, vi } from "vitest";

import { locateDevicePosition } from "./device-geolocation";

describe("locateDevicePosition", () => {
  it("uses ordinary browser location before requesting high accuracy", async () => {
    const request = vi.fn().mockResolvedValue({ latitude: 35.8, longitude: 127.1 });

    await expect(locateDevicePosition(request)).resolves.toMatchObject({ ok: true, usedHighAccuracy: false });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({ enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 });
  });

  it("retries a fresh high-accuracy position after ordinary location is unavailable", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce({ code: 2 })
      .mockResolvedValueOnce({ latitude: 35.8, longitude: 127.1 });

    await expect(locateDevicePosition(request)).resolves.toMatchObject({ ok: true, usedHighAccuracy: true });
    expect(request).toHaveBeenNthCalledWith(2, { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 });
  });

  it("does not retry when the user has denied the location permission", async () => {
    const request = vi.fn().mockRejectedValue({ code: 1 });

    await expect(locateDevicePosition(request)).resolves.toEqual({ ok: false, error: { code: 1 } });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
