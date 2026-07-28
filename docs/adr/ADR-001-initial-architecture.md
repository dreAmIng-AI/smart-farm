# ADR-001: 초기 기술 스택과 저장소 구조

- Status: Accepted

## Context

소규모 팀이 서로 다른 LLM을 사용해 MVP를 개발합니다. 화면·API·DB 계약을 빠르게 연결하고 초기 운영비용을 낮춰야 합니다.

## Decision

- Next.js + TypeScript
- Supabase Auth/PostgreSQL/Storage
- Vercel
- Monorepo
- Python AI 기능은 필요 시 별도 서비스로 분리

## Rationale

- 초기 배포 단위를 줄일 수 있습니다.
- TypeScript 계약을 화면과 서버에서 공유할 수 있습니다.
- Supabase로 인증·DB·파일 저장을 한 번에 구성할 수 있습니다.
- AI 기능이 핵심 수직 기능을 막지 않도록 뒤로 분리할 수 있습니다.

## Consequences

- Python 중심 모델 기능은 별도 서비스 경계가 필요할 수 있습니다.
- Next.js 서버 기능이 과도하게 커지지 않도록 Domain·Integration 책임을 분리해야 합니다.
- Supabase RLS와 migration 운영 기준이 필요합니다.
