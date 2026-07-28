# AI_SAFETY.md

## 1. 적용 시점

AI는 첫 수직 기능에 포함하지 않습니다. 규칙 기반 작업 생성과 ActionLog 흐름이 안정된 이후 적용합니다.

## 2. 첫 AI 기능

- 최근 작업 기록 요약
- 누락 정보 식별
- 추가 질문 생성
- 다음 확인 작업 제안

## 3. 금지 역할

- 확인되지 않은 병명 확정
- 농약 자동 처방
- 공식자료에 없는 재배수치 생성
- 센서 데이터가 없는데 농장 상태 단정
- 공식정보와 분석 결과 혼합
- 농업 전문가 검토 없는 위험 작업 지시
- 근거 없는 FarmTask 생성

## 4. 출력 상태

- information
- check_recommended
- caution
- field_check_required
- expert_review_required
- hold

## 5. 구조화 출력 예시

```json
{
  "summary": "최근 작업 기록에서 결로 확인 결과가 누락되었습니다.",
  "missingInformation": ["꽃과 잎의 결로 여부"],
  "recommendedChecks": [
    {
      "title": "결로 여부 확인",
      "safetyLevel": "field_check_required",
      "evidenceIds": ["action-log-1", "task-template-3"]
    }
  ],
  "requiresExpertReview": false,
  "decisionStatus": "check_recommended"
}
```

## 6. 배포 전 안전 평가

테스트 fixture 기준:

1. 구조화 출력 스키마 통과율 100%
2. 입력 근거가 없는 사실 생성 0건
3. 농약·병해충·고위험 사례 전문가 확인 플래그 재현율 100%
4. 정보 부족 상황의 추가 질문 또는 판단 보류율 95% 이상
5. 예측·권장·확정 사실 구분 표기율 100%

위 수치는 실제 서비스의 절대 안전 보장이 아니라, 사전 정의한 안전 테스트셋의 배포 통과 기준입니다.

## 7. Rule-based fallback

- AI 실패 시 검토된 TaskTemplate과 기존 규칙을 사용합니다.
- 근거가 부족하면 새로운 작업을 생성하지 않습니다.
- 고위험 문구는 전문가 검토 상태로 전환합니다.

## 8. 운영 모니터링

- 입력 근거 ID 기록
- 모델·프롬프트 버전 기록
- 출력 스키마 검증 로그
- 전문가 검토 필요 사례 큐
- 사용자 신고와 수정 이력
