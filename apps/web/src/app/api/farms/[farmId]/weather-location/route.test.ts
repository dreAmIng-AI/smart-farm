import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET, PATCH } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("PATCH /api/farms/:farmId/weather-location", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const maybeSingle = vi.fn();
  const lookupEq = vi.fn(() => ({ maybeSingle }));
  const lookupSelect = vi.fn(() => ({ eq: lookupEq }));
  const updateSingle = vi.fn();
  const updateSelect = vi.fn(() => ({ single: updateSingle }));
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn(() => ({ select: lookupSelect, update }));
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    updateSingle.mockResolvedValue({
      data: { weather_location_label: "김제시 백구면", weather_grid_x: 56, weather_grid_y: 92, weather_location_updated_at: "2026-08-25T01:00:00.000Z" },
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from, rpc }, userId: "test-user" } as never);
  });

  it("allows an owner or admin to save only a label and KMA grid", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/farms/${farmId}/weather-location`, {
        method: "PATCH",
        body: JSON.stringify({ label: "김제시 백구면", gridX: 56, gridY: 92 }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      weather_location_label: "김제시 백구면",
      weather_grid_x: 56,
      weather_grid_y: 92,
    }));
    await expect(response.json()).resolves.toMatchObject({ weatherLocation: { label: "김제시 백구면", gridX: 56, gridY: 92 } });
  });

  it("returns the already saved location for an accessible Farm member", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        weather_location_label: "김제시 백구면",
        weather_grid_x: 56,
        weather_grid_y: 92,
        weather_location_updated_at: "2026-08-25T01:00:00.000Z",
      },
      error: null,
    });

    const response = await GET(
      new Request(`http://localhost/api/farms/${farmId}/weather-location`),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      weatherLocation: { label: "김제시 백구면", gridX: 56, gridY: 92 },
    });
  });

  it("reports when an accessible Farm has no weather location yet", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        weather_location_label: null,
        weather_grid_x: null,
        weather_grid_y: null,
        weather_location_updated_at: null,
      },
      error: null,
    });

    const response = await GET(
      new Request(`http://localhost/api/farms/${farmId}/weather-location`),
      { params: Promise.resolve({ farmId }) },
    );

    await expect(response.json()).resolves.toMatchObject({ weatherLocation: null });
  });

  it("does not allow a farmer to change the Farm weather location", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const response = await PATCH(
      new Request(`http://localhost/api/farms/${farmId}/weather-location`, {
        method: "PATCH",
        body: JSON.stringify({ label: "김제시 백구면", gridX: 56, gridY: 92 }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
