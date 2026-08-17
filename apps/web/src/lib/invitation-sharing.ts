export type InvitationLinkNavigator = {
  clipboard?: {
    writeText: (value: string) => Promise<void>;
  };
  share?: (data: ShareData) => Promise<void>;
};

export type InvitationShareResult = "shared" | "copied" | "cancelled" | "copy_unavailable";

type FarmInvitationEmailComposeInput = {
  farmName: string;
  inviteUrl: string;
  recipientEmail: string;
};

export function createFarmInvitationShareData(inviteUrl: string): ShareData {
  return {
    title: "dreAmIng Smart Farm 초대",
    text: "Farm 참여 초대 링크입니다. 초대받은 이메일로 로그인한 뒤 열어 주세요.",
    url: inviteUrl,
  };
}

export function createFarmInvitationEmailComposeUrl({
  farmName,
  inviteUrl,
  recipientEmail,
}: FarmInvitationEmailComposeInput): string {
  const search = new URLSearchParams({
    subject: `[dreAmIng Smart Farm] ${farmName} 참여 초대`,
    body: `${farmName} 참여 초대입니다.\n\n아래 링크를 열기 전에 ${recipientEmail}로 로그인해 주세요.\n${inviteUrl}\n\n이 링크는 7일 뒤 만료됩니다.`,
  });

  return `mailto:${encodeURIComponent(recipientEmail)}?${search.toString()}`;
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
