# Spec Delta

## ADDED Requirements

### Requirement: Scenario commands are applied
The scenario runner SHALL submit each scenario command at its declared tick through the application command gateway before advancing that tick. A rejected command SHALL add a `command_rejected` finding at that tick and the run SHALL continue.

Source: VER-9.1, VER-9.2, TDS-16.1

#### Scenario: A due command is applied
- **WHEN** a scenario declares `CreateTransportOrder` at tick `1`
- **THEN** the order exists when tick `1` advances

#### Scenario: A rejected command is reported
- **WHEN** a scenario command is rejected by the gateway
- **THEN** the report has a `command_rejected` finding at that tick

### Requirement: SCN-02 logistics loop golden
SCN-02 SHALL provide a theme-free fixture in which a resource exists at only one of two connected locations and a transport route moves it to the other. The scenario SHALL run with invariants after every tick, produce transport load and unload events, and match a committed golden.

Source: VER-9.3, GDD-23.2, GDD-4.5, SCN-02

#### Scenario: The logistics loop matches its golden
- **WHEN** the SCN-02 scenario runs for `200` ticks with a `10`-tick hash interval
- **THEN** there are no findings, transport load and unload events occur, and every checkpoint matches the committed hash

#### Scenario: The logistics loop is deterministic
- **WHEN** the scenario runs twice
- **THEN** both reports are identical
