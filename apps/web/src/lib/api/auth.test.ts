import { describe, expect, it } from "vitest";

import { unauthenticatedResponse } from "@/lib/api/auth";

describe("authentication guard", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const response = unauthenticatedResponse();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: "Sign in is required." },
    });
  });
});
