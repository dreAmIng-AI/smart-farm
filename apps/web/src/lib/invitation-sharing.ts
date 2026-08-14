export type InvitationLinkNavigator = {
  clipboard?: {
    writeText: (value: string) => Promise<void>;
  };
  share?: (data: ShareData) => Promise<void>;
};

export type InvitationShareResult = "shared" | "copied" | "cancelled" | "copy_unavailable";

export function createFarmInvitationShareData(inviteUrl: string): ShareData {
  return {
    title: "dreAmIng Smart Farm 초대",
    text: "Farm 참여 초대 링크입니다. 초대받은 이메일로 로그인한 뒤 열어 주세요.",
    url: inviteUrl,
  };
}

export async function copyFarmInvitationLink(
  browser: InvitationLinkNavigator,
  inviteUrl: string,
): Promise<boolean> {
  if (!browser.clipboard) {
    return false;
  }

  try {
    await browser.clipboard.writeText(inviteUrl);
    return true;
  } catch {
    return false;
  }
}

export async function shareFarmInvitationLink(
  browser: InvitationLinkNavigator,
  inviteUrl: string,
): Promise<InvitationShareResult> {
  if (!browser.share) {
    return (await copyFarmInvitationLink(browser, inviteUrl)) ? "copied" : "copy_unavailable";
  }

  try {
    await browser.share(createFarmInvitationShareData(inviteUrl));
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }

    return (await copyFarmInvitationLink(browser, inviteUrl)) ? "copied" : "copy_unavailable";
  }
}
