import { describe, expect, it } from "vitest";

import { geolocationFailureMessage } from "./geolocation-feedback";

describe("geolocationFailureMessage", () => {
  it("explains a denied permission without exposing browser details", () => {
    expect(geolocationFailureMessage({ code: 1 })).toContain("위치 권한이 꺼져 있습니다");
  });

  it("distinguishes unavailable position and timeout", () => {
    expect(geolocationFailureMessage({ code: 2 })).toContain("현재 위치를 확인하지 못했습니다");
    expect(geolocationFailureMessage({ code: 3 })).toContain("기상청 연결이 아니라");
  });
});
