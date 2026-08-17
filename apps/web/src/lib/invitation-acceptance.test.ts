import { describe, expect, it } from "vitest";

import { removeFarmInvitationToken } from "@/lib/invitation-acceptance";

describe("Farm invitation acceptance", () => {
  it("removes only the accepted invitation token while preserving other URL state", () => {
    expect(
      removeFarmInvitationToken(
        "https://app.example.com/?tab=plan&invite=11111111-1111-4111-8111-111111111111#today",
      ),
    ).toBe("https://app.example.com/?tab=plan#today");
  });

  it("does not change a URL that has no invitation token", () => {
    expect(removeFarmInvitationToken("https://app.example.com/?tab=plan#today")).toBe(
      "https://app.example.com/?tab=plan#today",
    );
  });
});
