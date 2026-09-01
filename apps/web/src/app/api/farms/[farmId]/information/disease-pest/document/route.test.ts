import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireAuthenticatedSupabaseUser: vi.fn() }));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("GET /api/farms/:farmId/information/disease-pest/document", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const farmMaybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle: farmMaybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const from = vi.fn(() => ({ select: farmSelect }));
  const officialAttachment = "https://www.nongsaro.go.kr/cms_contents/example.pdf";

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from }, userId: "test-user" } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("streams an official Nongsaro PDF inline for an accessible farm", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(pdf, {
      headers: { "content-type": "application/pdf", "content-length": String(pdf.length) },
      status: 200,
    })));

    const query = new URLSearchParams({ attachment: officialAttachment });
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest/document?${query}`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(pdf));
  });

  it("rejects non-official document URLs before making an external request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const query = new URLSearchParams({ attachment: "https://example.test/not-a-bulletin.pdf" });
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest/document?${query}`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an attachment that redirects away from the official Nongsaro host", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const redirectedResponse = new Response(pdf, { headers: { "content-type": "application/pdf" }, status: 200 });
    Object.defineProperty(redirectedResponse, "url", { value: "https://example.test/redirected.pdf" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(redirectedResponse));

    const query = new URLSearchParams({ attachment: officialAttachment });
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest/document?${query}`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(502);
  });

  it("renders a safe in-service fallback instead of raw error JSON when the embedded reader cannot load a PDF", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    const query = new URLSearchParams({ attachment: officialAttachment, view: "embed" });
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest/document?${query}`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("농사로에서 원문 열기");
  });

  it("does not fetch a document when the farm is not accessible", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    farmMaybeSingle.mockResolvedValue({ data: null, error: null });

    const query = new URLSearchParams({ attachment: officialAttachment });
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest/document?${query}`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
