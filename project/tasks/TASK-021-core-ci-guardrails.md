# TASK-021: Core CI guardrails

## Goal

Every pull request and merge to `main` automatically verifies the Core Platform before teammates build on it.

## Background

The Core v0.1 work cycle is implemented and has local scripts for linting, typechecking, tests, and production builds. Those checks were not yet enforced by GitHub Actions, so a contributor could merge a regression without the same verification.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/ARCHITECTURE.md`

## Scope

- Add one GitHub Actions workflow for pull requests and `main` pushes.
- Run the repository's existing `pnpm` verification scripts in their documented order.
- Use non-secret placeholder public Supabase values so the production build does not require a real project.

## Out of Scope

- Vercel project linking, deployment secrets, or preview deployment configuration.
- Database migration execution, Supabase credentials, or external integrations.
- Changes to Core domains, RLS, APIs, or fixtures.

## Allowed Files

- `.github/workflows/**`
- `README.md`
- `project/tasks/TASK-021-core-ci-guardrails.md`

## Restricted Files

- Supabase migrations and production environment secrets.
- Core domain and application behavior.

## Input

- Existing `pnpm` scripts and pinned package manager version.

## Output

- A visible required-quality signal for every teammate's pull request.

## Acceptance Criteria

- [ ] Pull requests trigger lint, typecheck, test, and build checks.
- [ ] Pushes to `main` trigger the same checks.
- [ ] CI never requires production Supabase credentials.
- [ ] The workflow uses the pinned `pnpm` version through Corepack.

## Required Tests

- [ ] workflow structure review
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`

## Security and Domain Safety

- This is a Core Platform delivery guardrail; it does not change Crop Pack or Lab behavior.
- No secret, user data, Farm data, crop-specific logic, or fixture changes are added.
- Labs remain independent of Core CI.

## Handoff

- Enable the workflow by merging this PR; GitHub will display checks on subsequent PRs.
- Repository administrators may optionally mark `Core CI / Verify Core Platform` as a required branch-protection check.
- Vercel preview deployment remains a separate setup task because it needs an authorized Vercel project.
