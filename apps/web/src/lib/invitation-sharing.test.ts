import { describe, expect, it, vi } from "vitest";

import {
  copyFarmInvitationLink,
  createFarmInvitationShareData,
  shareFarmInvitationLink,
} from "@/lib/invitation-sharing";

const inviteUrl = "https://app.example.com/?invite=11111111-1111-4111-8111-111111111111";

describe("Farm invitation sharing", () => {
  it("creates share data that instructs the invited user to sign in with the invited email", () => {
    expect(createFarmInvitationShareData(inviteUrl)).toEqual({
      title: "dreAmIng Smart Farm 초대",
      text: "Farm 참여 초대 링크입니다. 초대받은 이메일로 로그인한 뒤 열어 주세요.",
      url: inviteUrl,
    });
  });

  it("uses the native share sheet when it is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(shareFarmInvitationLink({ share, clipboard: { writeText } }, inviteUrl)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(createFarmInvitationShareData(inviteUrl));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link when native sharing is unavailable or fails", async () => {
    const unavailableCopy = vi.fn().mockResolvedValue(undefined);
    await expect(shareFarmInvitationLink({ clipboard: { writeText: unavailableCopy } }, inviteUrl)).resolves.toBe("copied");
    expect(unavailableCopy).toHaveBeenCalledWith(inviteUrl);

    const failedShare = vi.fn().mockRejectedValue(new Error("share failed"));
    const fallbackCopy = vi.fn().mockResolvedValue(undefined);
    await expect(shareFarmInvitationLink({ share: failedShare, clipboard: { writeText: fallbackCopy } }, inviteUrl)).resolves.toBe(
      "copied",
    );
    expect(fallbackCopy).toHaveBeenCalledWith(inviteUrl);
  });

  it("does not copy the link when the user cancels the native share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("Share cancelled", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(shareFarmInvitationLink({ share, clipboard: { writeText } }, inviteUrl)).resolves.toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports unavailable copy access without throwing", async () => {
    await expect(copyFarmInvitationLink({}, inviteUrl)).resolves.toBe(false);
    await expect(shareFarmInvitationLink({}, inviteUrl)).resolves.toBe("copy_unavailable");
  });
});
