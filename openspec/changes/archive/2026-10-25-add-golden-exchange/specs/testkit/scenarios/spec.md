# Spec Delta

## ADDED Requirements

### Requirement: SCN-06 exchange golden
The exchange scenario SHALL exist as a theme-free fixture with a committed golden: a transport unit buys from an exchange in repeated steps, sells in repeated steps whose prices fall by the elasticity rule, waits through the configured recovery intervals, and sells again at a price recovered toward the base. The scenario SHALL run with zero invariant findings, checkpoint hashes SHALL match the committed golden on every run, and repeat runs SHALL be byte-identical.

Source: VER-9.3, SCN-06, GDD-17.3

#### Scenario: Repeated sales lower the price, which then recovers
- **WHEN** the scenario runs its buy phase (four buys of `100` at base buy price `12000`), its sell phase (three sells of `100` at base sell price `8000`), and a final sell of the remaining cargo after the recovery intervals
- **THEN** the traded prices are `12000`, `13200`, `14400`, `15600`, `8000`, `7200`, `6400`, and `8000`, with zero invariant findings and hashes equal to the golden

#### Scenario: The golden is stable across runs
- **WHEN** the scenario executes twice
- **THEN** both runs produce byte-identical reports and match the committed checkpoint hashes
