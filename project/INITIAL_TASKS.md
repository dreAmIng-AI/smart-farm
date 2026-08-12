# 초기 2주 Task

> **Status: REFERENCE**
>
> 이 문서는 초기 실행 초안입니다. 새로운 Task는 [PRODUCT_PLAN.md](../docs/PRODUCT_PLAN.md), [PRD_CORE_V0.1.md](../docs/PRD_CORE_V0.1.md), [AGENTS.md](../AGENTS.md)를 기준으로 작성하며, Core와 Lab의 범위를 혼합하지 않습니다.

## 공통 선행조건

- 기술 통합 주·백업 책임자 지정
- 패키지 관리자와 Node.js 버전 확정
- 설향 생육단계 초안 검토

## 팀 리더·PM

### T-001 제품 계약 검토

- 목적: MVP 포함·제외 범위 최종 확인
- 산출물: PRODUCT.md 승인 의견
- 완료: 범위 변경사항이 문서에 반영됨
- 우선순위: P0

### T-002 첫 검증 사용자 계획

- 목적: 실제 농가 데이터의 업무 흐름 검증 계획 수립
- 산출물: 대상·인터뷰·테스트 흐름 초안
- 완료: 최소 3~5명 후보와 검증 질문 정의
- 우선순위: P1

## 기술 통합 책임자

### T-003 Monorepo 골격

- 목적: 로컬 실행·테스트·CI 가능한 기반 생성
- 산출물: Next.js 프로젝트, scripts, env example, CI
- 완료: 신규 팀원이 README로 실행 가능
- 우선순위: P0

### T-004 Supabase 기본 구조

- 목적: Auth, RLS, migration 운영 기준 확정
- 산출물: 초기 migration과 seed
- 완료: 로컬/테스트 환경에서 적용 가능
- 우선순위: P0

## 데이터 엔지니어

### T-005 핵심 데이터 스키마 검토

- 목적: Farm–CropCycle–FarmTask–ActionLog 저장 구조 구체화
- 산출물: migration 검토안과 필드 매핑
- 완료: DATA_DICTIONARY와 migration이 일치
- 우선순위: P0

### T-006 외부 데이터 검토 템플릿 시험

- 목적: 날씨 데이터원 1개 후보를 실제 호출 기준으로 평가
- 산출물: DATA_SOURCE_REVIEW 완료본
- 완료: 인증·필드·제한·라이선스·fallback 확인
- 우선순위: P1

## 데이터 사이언티스트·AI 담당자

### T-007 규칙 기반 작업 생성 명세

- 목적: AI 없이 TaskTemplate을 FarmTask로 변환하는 규칙 정의
- 산출물: 입력·출력 fixture와 테스트 사례
- 완료: 동일 입력에서 결정적 작업 생성
- 우선순위: P0

### T-008 AI 안전 fixture 초안

- 목적: 이후 AI 기능의 금지·보류 사례 준비
- 산출물: 최소 30개 안전 테스트 사례
- 완료: AI_SAFETY 기준과 매핑
- 우선순위: P2

## 농업 전문가

### T-009 설향 생육단계 기준표

- 목적: 초기 growthStage와 확인 항목 검토
- 산출물: 단계 정의·특징·관찰 항목
- 완료: 기술팀이 코드 enum과 화면 문구에 반영 가능
- 우선순위: P0

### T-010 작업 템플릿 v1

- 목적: 첫 수직 기능에서 사용할 검토된 작업 생성
- 산출물: 단계별 TaskTemplate 10~20개
- 완료: 제목·이유·우선순위·결과 선택·안전 상태 포함
- 우선순위: P0
