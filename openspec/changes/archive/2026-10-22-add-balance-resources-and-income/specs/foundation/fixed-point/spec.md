# Spec Delta

## Purpose

Pure fixed-point evaluation of compiled curves (CONT-8, TDS-14.4) moves into the `fx` module so simulation phases can evaluate curves without importing `@aesfw/content`.

## ADDED Requirements

### Requirement: Curve evaluation
The fixed-point module SHALL evaluate a compiled curve — `constant`, `piecewise_linear`, `step`, or `lookup` over sorted integer points, with `clamp`, `linear`, or `error` extrapolation — at an integer input, returning an integer. Piecewise-linear interpolation SHALL floor through `fx.mulDiv`; evaluation SHALL be pure and identical for identical inputs. Under the `error` policy an out-of-domain input SHALL clamp to the boundary value.

Source: CONT-8, TDS-14.4

#### Scenario: Piecewise-linear interpolation floors
- **WHEN** a piecewise-linear curve over points `(0, 0)` and `(3, 1000)` is evaluated at `1`
- **THEN** the result is `333`

#### Scenario: Step curves hold the left point
- **WHEN** a step curve over points `(0, 100)` and `(10, 500)` is evaluated at `10`
- **THEN** the result is `500`, and at `9` the result is `100`

#### Scenario: Clamp extrapolation holds the boundary
- **WHEN** a piecewise-linear curve over points `(0, 0)` and `(3, 1000)` is evaluated at `-5` and at `9`
- **THEN** the results are `0` and `1000`

#### Scenario: Linear extrapolation extends the last segment
- **WHEN** a curve with `linear` extrapolation over points `(0, 0)` and `(3, 1000)` is evaluated at `6`
- **THEN** the result is `2000`
