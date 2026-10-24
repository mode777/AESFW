# Spec Delta

## MODIFIED Requirements

### Requirement: World locations and owners
A world definition SHALL instantiate every listed location from its template in ascending world-location ID order, and SHALL instantiate every listed owner in ascending owner-ID order as handles `0..n-1`. Each location SHALL belong to the owner that lists it in `established_locations`, and SHALL have no owner when no owner establishes it. Owner `initial_resources` SHALL become account entries ordered by ascending resource handle, and `established_locations` and `known_locations` SHALL seed knowledge at `established` and `discovered` respectively.

Source: CONT-6.6, GDD-6.1, GDD-16.1, GDD-16.3

#### Scenario: Two owners receive their declared locations and resources
- **WHEN** a world declares owners `owner.a` and `owner.b`, owner `owner.a` has `1000` of `test.resource.credits`, and each owner has one location
- **THEN** handle `0` owns the first location with a `1000` account and handle `1` owns the second

#### Scenario: Knowledge is seeded from the world definition
- **WHEN** an owner lists one location in `established_locations` and another in `known_locations`
- **THEN** the owner's knowledge is `established` and `discovered` for those locations

#### Scenario: An unestablished location has no owner
- **WHEN** a world lists a location no owner establishes
- **THEN** the location's owner is null and the location is not active
