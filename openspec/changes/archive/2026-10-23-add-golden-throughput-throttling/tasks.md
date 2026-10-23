# Tasks

## 1. Fixture content

- [x] 1.1 Create `fixtures/content/demo-throughput` (package manifest + content) with the throughput-limited location, two sources, and a refiner. Verify: `aesfw validate --strict` and a short manual CLI run with no findings.

## 2. Scenario and golden

- [x] 2.1 Create `fixtures/scenarios/throughput_throttling.yaml` (SCN-10, 120 ticks, hash interval 10, invariants). Verify: the scenario runs with no findings.
- [x] 2.2 Generate `fixtures/scenarios/throughput_throttling.hashes.json` with the golden tool and record the reason. Verify: the file is committed and the double run matches.

## 3. Test

- [x] 3.1 Add the host test: no findings, at least one `ThroughputThrottled`, every checkpoint matches the golden, and a second run is identical. Verify: the test passes.

## 4. Verification

- [x] 4.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
