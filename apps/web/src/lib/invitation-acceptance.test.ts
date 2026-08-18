import { describe, expect, it } from "vitest";

import { parseInvitationAccountSetupInput, removeFarmInvitationToken } from "@/lib/invitation-acceptance";

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

  it("normalizes a self-service invitation account and requires a confirmed password", () => {
    expect(
      parseInvitationAccountSetupInput({
        email: "FARMER@example.com",
        password: "fieldwork8",
        passwordConfirmation: "fieldwork8",
      }),
    ).toEqual({ ok: true, data: { email: "farmer@example.com", password: "fieldwork8" } });

    expect(
      parseInvitationAccountSetupInput({
        email: "farmer.example.com",
        password: "fieldwork8",
        passwordConfirmation: "fieldwork8",
      }),
    ).toMatchObject({ ok: false, error: "초대받은 이메일을 올바르게 입력해 주세요." });

    expect(
      parseInvitationAccountSetupInput({
        email: "farmer@example.com",
        password: "short",
        passwordConfirmation: "short",
      }),
    ).toMatchObject({ ok: false, error: "비밀번호는 8자 이상으로 설정해 주세요." });

    expect(
      parseInvitationAccountSetupInput({
        email: "farmer@example.com",
        password: "fieldwork8",
        passwordConfirmation: "different8",
      }),
    ).toMatchObject({ ok: false, error: "비밀번호 확인이 일치하지 않습니다." });
  });
});
