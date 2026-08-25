import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET, POST } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireAuthenticatedSupabaseUser: vi.fn() }));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("/api/farms/:farmId/measurements", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const farmMaybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle: farmMaybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const measurementOrder = vi.fn();
  const measurementEq = vi.fn(() => ({ order: measurementOrder }));
  const measurementSelect = vi.fn(() => ({ eq: measurementEq }));
  const measurementSingle = vi.fn();
  const measurementInsert = vi.fn(() => ({ select: () => ({ single: measurementSingle }) }));
  const from = vi.fn((table: string) => {
    if (table === "farms") return { select: farmSelect };
    if (table === "measurements") return { select: measurementSelect, insert: measurementInsert };
    if (table === "farm_areas" || table === "crop_cycles") return { select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) };
    throw new Error(`Unexpected table: ${table}`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    measurementOrder.mockResolvedValue({ data: [], error: null });
    measurementSingle.mockResolvedValue({
      data: { id: "22222222-2222-4222-8222-222222222222", farm_area_id: null, crop_cycle_id: null, recorded_by: "33333333-3333-4333-8333-333333333333", observed_at: "2026-08-24T01:00:00.000Z", metric_code: "manual_temperature", value_numeric: "28.5", unit: "celsius", note: null, created_at: "2026-08-24T01:01:00.000Z" },
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from }, userId: "33333333-3333-4333-8333-333333333333" } as never);
  });

  it("lists measurements for an accessible Farm", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/measurements`), { params: Promise.resolve({ farmId }) });
    expect(response.status).toBe(200);
    expect(measurementEq).toHaveBeenCalledWith("farm_id", farmId);
  });

  it("creates a standalone numeric measurement for a Farm member", async () => {
    const response = await POST(new Request(`http://localhost/api/farms/${farmId}/measurements`, { method: "POST", body: JSON.stringify({ metricCode: "manual_temperature", valueNumeric: 28.5, unit: "celsius", note: null, farmAreaId: null, cropCycleId: null, observedAt: "2026-08-24T01:00:00.000Z" }) }), { params: Promise.resolve({ farmId }) });
    expect(response.status).toBe(201);
    expect(measurementInsert).toHaveBeenCalledWith(expect.objectContaining({ farm_id: farmId, value_numeric: 28.5 }));
  });

  it("does not query measurements when RLS hides the Farm", async () => {
    farmMaybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/measurements`), { params: Promise.resolve({ farmId }) });
    expect(response.status).toBe(404);
    expect(measurementSelect).not.toHaveBeenCalled();
  });

  it("rejects a FarmArea that belongs to another Farm", async () => {
    const otherFarmAreaId = "44444444-4444-4444-8444-444444444444";
    from.mockImplementation((table: string) => {
      if (table === "farms") return { select: farmSelect };
      if (table === "measurements") return { select: measurementSelect, insert: measurementInsert };
      if (table === "farm_areas") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: otherFarmAreaId, farm_id: "other-farm" }, error: null }),
            }),
          }),
        };
      }
      if (table === "crop_cycles") return { select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/measurements`, {
        method: "POST",
        body: JSON.stringify({
          metricCode: "manual_temperature",
          valueNumeric: 28.5,
          unit: "celsius",
          note: null,
          farmAreaId: otherFarmAreaId,
          cropCycleId: null,
          observedAt: "2026-08-24T01:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(404);
    expect(measurementInsert).not.toHaveBeenCalled();
  });
});
