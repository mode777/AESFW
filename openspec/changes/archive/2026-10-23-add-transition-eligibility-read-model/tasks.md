# Tasks

- [x] 1.1 [PIC-10.1] Add `TransitionEligibilityDto` and `TransitionConditionDto` and pass `residence` through the entity-detail codec. Verify: protocol tests pass.
- [x] 1.2 [PIC-10.1, GDD-13.1] Implement `transitionEligibility` and populate the residence summary. Verify: `[PIC-10.1]` below-threshold and at-threshold tests.
- [x] 1.3 [GDD-12.6] Gate advancement (not decline) by `advancement_enabled`. Verify: gate test.
- [x] 1.4 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
