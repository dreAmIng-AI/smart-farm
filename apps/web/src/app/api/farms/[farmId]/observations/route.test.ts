import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET, POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("/api/farms/:farmId/observations", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const otherFarmId = "99999999-9999-4999-8999-999999999999";
  const farmAreaId = "22222222-2222-4222-8222-222222222222";
  const cropCycleId = "33333333-3333-4333-8333-333333333333";
  const farmMaybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle: farmMaybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const observationOrder = vi.fn();
  const observationEq = vi.fn(() => ({ order: observationOrder }));
  const observationSelect = vi.fn(() => ({ eq: observationEq }));
  const issueIn = vi.fn();
  const issueSelect = vi.fn(() => ({ in: issueIn }));
  const observationInsertSingle = vi.fn();
  const observationInsertSelect = vi.fn(() => ({ single: observationInsertSingle }));
  const observationInsert = vi.fn(() => ({ select: observationInsertSelect }));
  const farmAreaMaybeSingle = vi.fn();
  const farmAreaEq = vi.fn(() => ({ maybeSingle: farmAreaMaybeSingle }));
  const farmAreaSelect = vi.fn(() => ({ eq: farmAreaEq }));
  const cropCycleMaybeSingle = vi.fn();
  const cropCycleEq = vi.fn(() => ({ maybeSingle: cropCycleMaybeSingle }));
  const cropCycleSelect = vi.fn(() => ({ eq: cropCycleEq }));
  const from = vi.fn((table: string) => {
    if (table === "farms") {
      return { select: farmSelect };
    }
    if (table === "observations") {
      return { insert: observationInsert, select: observationSelect };
    }
    if (table === "issue_records") {
      return { select: issueSelect };
    }
    if (table === "farm_areas") {
      return { select: farmAreaSelect };
    }
    if (table === "crop_cycles") {
      return { select: cropCycleSelect };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    farmAreaMaybeSingle.mockResolvedValue({ data: { id: farmAreaId, farm_id: farmId }, error: null });
    cropCycleMaybeSingle.mockResolvedValue({ data: { id: cropCycleId, farm_id: farmId }, error: null });
    observationOrder.mockResolvedValue({
      data: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          farm_area_id: farmAreaId,
          crop_cycle_id: cropCycleId,
          observed_by: "55555555-5555-4555-8555-555555555555",
          observed_at: "2026-08-24T01:00:00.000Z",
          content: "잎에서 갈색 반점이 보임",
          created_at: "2026-08-24T01:01:00.000Z",
        },
      ],
      error: null,
    });
    observationInsertSingle.mockResolvedValue({
      data: {
        id: "44444444-4444-4444-8444-444444444444",
        farm_area_id: null,
        crop_cycle_id: null,
        observed_by: "55555555-5555-4555-8555-555555555555",
        observed_at: "2026-08-24T01:00:00.000Z",
        content: "잎에서 갈색 반점이 보임",
        created_at: "2026-08-24T01:01:00.000Z",
      },
      error: null,
    });
    issueIn.mockResolvedValue({ data: [], error: null });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from },
      userId: "55555555-5555-4555-8555-555555555555",
    } as never);
  });

  it("lists the newest observations from an accessible Farm", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/observations`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(200);
    expect(observationEq).toHaveBeenCalledWith("farm_id", farmId);
    expect(issueIn).toHaveBeenCalledWith("observation_id", ["44444444-4444-4444-8444-444444444444"]);
    await expect(response.json()).resolves.toMatchObject({
      items: [{ id: "44444444-4444-4444-8444-444444444444", content: "잎에서 갈색 반점이 보임", issue: null }],
      meta: { count: 1 },
    });
  });

  it("allows a Farm member to add an Observation without a FarmTask", async () => {
    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/observations`, {
        method: "POST",
        body: JSON.stringify({
          content: "잎에서 갈색 반점이 보임",
          cropCycleId: null,
          farmAreaId: null,
          observedAt: "2026-08-24T01:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(201);
    expect(observationInsert).toHaveBeenCalledWith({
      farm_id: farmId,
      farm_area_id: null,
      crop_cycle_id: null,
      observed_by: "55555555-5555-4555-8555-555555555555",
      observed_at: "2026-08-24T01:00:00.000Z",
      content: "잎에서 갈색 반점이 보임",
    });
  });

  it("does not query Observations when RLS hides the Farm", async () => {
    farmMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/observations`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(404);
    expect(observationSelect).not.toHaveBeenCalled();
  });

  it("rejects a FarmArea from another Farm before creating an Observation", async () => {
    farmAreaMaybeSingle.mockResolvedValue({ data: { id: farmAreaId, farm_id: otherFarmId }, error: null });

    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/observations`, {
        method: "POST",
        body: JSON.stringify({
          content: "잎에서 갈색 반점이 보임",
          cropCycleId: null,
          farmAreaId,
          observedAt: "2026-08-24T01:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(404);
    expect(observationInsert).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_AREA_NOT_FOUND" } });
  });
});
