export function removeFarmInvitationToken(currentUrl: string): string {
  const nextUrl = new URL(currentUrl);
  nextUrl.searchParams.delete("invite");
  return nextUrl.toString();
}

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type InvitationAccountSetupInput = {
  email: string;
  password: string;
};

function requiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function parseInvitationAccountSetupInput(value: {
  email: unknown;
  password: unknown;
  passwordConfirmation: unknown;
}): Parsed<InvitationAccountSetupInput> {
  const email = requiredText(value.email)?.toLowerCase();
  const password = typeof value.password === "string" ? value.password : null;
  const passwordConfirmation = typeof value.passwordConfirmation === "string" ? value.passwordConfirmation : null;

  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "초대받은 이메일을 올바르게 입력해 주세요." };
  }

  if (!password || password.length < 8) {
    return { ok: false, error: "비밀번호는 8자 이상으로 설정해 주세요." };
  }

  if (password !== passwordConfirmation) {
    return { ok: false, error: "비밀번호 확인이 일치하지 않습니다." };
  }

  return { ok: true, data: { email, password } };
}
