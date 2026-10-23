# Tasks

## 1. Rules

- [x] 1.1 [GDD-15.3] Implement `fixed`, `up_to_capacity`, and `all` targets in `actionTarget`. Verify: quantity tests.
- [x] 1.2 [GDD-15.3] Implement `excess_above`, `deficit_below`, `maintain_origin_minimum`, and `maintain_destination_target`. Verify: quantity tests.
- [x] 1.3 [GDD-15.3] Implement first-fit `priority_list` and acting-side clamping. Verify: quantity tests.

## 2. Tests and documentation

- [x] 2.1 [GDD-15.3] Test every rule, both directions where applicable, and the no-fit boundary. Verify: quantity tests.
- [x] 2.2 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record the `all` clarification. Verify: no unintended document change.
- [x] 2.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
