# TASK-020: Farm owner creation policy

## Goal

Only Farm owners can create a new Farm. Invited admins and farmers work in a shared Farm without receiving independent Farm creation permission.

## Background

Farm memberships already distinguish `owner`, `admin`, and `farmer`, but every authenticated user could create a Farm and every member could change Farm planning data. That allowed an invited teammate to start a separate Farm instead of collaborating in the invited Farm.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- Add the minimal owner-creation permission record and seed existing Farm owners.
- Restrict Farm creation to that permission in RLS and `/api/farms`.
- Restrict Farm, CropCycle, plan, issue-status, and follow-up planning changes to `owner` or `admin`.
- Preserve `farmer` access to read shared work, record results, report observed issues, and add allowed attachments.
- Show or hide management controls in the UI based on the selected Farm role.

## Out of Scope

- Owner transfer or self-service owner provisioning.
- Automatic email delivery for invitations.
- New domain entities, crop-specific Core logic, Weather, AI, Disease, Sensor, or Market work.

## Allowed Files

- `apps/web/src/app/**`
- `apps/web/src/lib/api/**`
- `supabase/migrations/**`
- `docs/**`
- `README.md`
- `project/USER_VALIDATION_GUIDE.md`
- `project/tasks/TASK-020-farm-owner-creation-policy.md`

## Restricted Files

- Existing domain entity names and public invitation-account password boundary.
- Supabase service-role credentials and RLS bypasses.

## Input

- An existing owner account and a separately invited admin or farmer account.
- An existing shared Farm with at least one CropCycle and FarmTask.

## Output

- Owner can create a Farm.
- Admin can manage the assigned Farm and plan, but cannot create another Farm.
- Farmer can see shared schedule/Today and record results or observed issues, but cannot create Farms or change plans.

## Acceptance Criteria

- [ ] Existing owners retain Farm creation ability after migration.
- [ ] An invited admin/farmer receives `FARM_CREATION_FORBIDDEN` from the API and cannot see the Farm creation form.
- [ ] Only owner/admin can change Farm/CropCycle/plan, issue status, or follow-up work.
- [ ] Farmer can still record a task result or observed issue without direct FarmTask update permission.
- [ ] The role boundary is enforced by RLS and checked server-side for Farm and CropCycle management routes.

## Required Tests

- [ ] unit: owner Farm creation and invited-member denial.
- [ ] unit: Farm manager access and farmer denial.
- [ ] manual: owner/admin/farmer role scenarios after applying the migration.
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build

## Security and Domain Safety

- The new `farm_creator_permissions` relation only represents global Farm creation entitlement; it does not replace FarmMembership roles.
- Role-checked security-definer RPCs retain `auth.uid()` membership checks so farmers can write action results/observations while direct schedule changes remain protected by RLS.
- No password, token, or service role key is written to Core tables or client code.
- Crop-independent Template/Crop Pack behavior and draft fixture status stay unchanged.

## Handoff

- Apply the new Supabase migration before testing a newly invited account.
- Confirm owner/admin/farmer UI and API behavior with two accounts.
- Automatic invitation email delivery remains the next separately scoped decision because it needs a configured mail provider.
