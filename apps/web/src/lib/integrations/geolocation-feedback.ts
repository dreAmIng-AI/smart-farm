type GeolocationFailure = {
  code?: number;
};

/**
 * Turns browser location failures into an action a farm operator can take.
 * The original coordinates and browser error text intentionally never leave
 * the browser or appear in the UI.
 */
export function geolocationFailureMessage(error: GeolocationFailure): string {
  switch (error.code) {
    case 1:
      return "위치 권한이 꺼져 있습니다. 브라우저 주소창의 자물쇠 아이콘에서 위치를 ‘허용’으로 바꾼 뒤, 농장에 있는 휴대전화에서 다시 시도해 주세요.";
    case 2:
      return "기기가 현재 위치를 확인하지 못했습니다. 휴대전화의 위치 서비스와 인터넷 연결을 확인하고, 농장 주변의 창가나 실외에서 다시 시도해 주세요.";
    case 3:
      return "기상청 연결이 아니라 기기 위치 확인 시간이 초과되었습니다. 이 브라우저가 위치를 제공하지 않는 경우가 많으니, 농장에 있는 휴대전화의 Chrome 또는 Safari에서 위치 권한을 허용한 뒤 다시 시도해 주세요. 위도·경도 입력은 일반 사용자에게 필요한 단계가 아닙니다.";
    default:
      return "기기 위치를 가져오지 못했습니다. 위치 권한과 휴대전화의 위치 서비스를 확인한 뒤 다시 시도해 주세요.";
  }
}
