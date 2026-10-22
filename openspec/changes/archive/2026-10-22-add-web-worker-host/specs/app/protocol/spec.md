# Spec Delta

## Purpose

The `init` worker message carries the content files to load (TDS-21.1).

## ADDED Requirements

### Requirement: Init content files
`WorkerInitRequestDto` SHALL carry an optional `content` array, each entry `{ root: string, files: readonly { path: string, text: string }[] }`, describing the content package sources the worker loads. A message without `content` SHALL still decode.

Source: TDS-21.1, TDS-22

#### Scenario: An init message with content decodes
- **WHEN** `decodeWorkerRequest({ kind: 'init', protocol_version: 1, content: [{ root: 'demo', files: [{ path: 'package.yaml', text: 'package: {}' }] }] })` is called
- **THEN** the result is ok and the value's `content` has one source

#### Scenario: An init message without content decodes
- **WHEN** `decodeWorkerRequest({ kind: 'init', protocol_version: 1 })` is called
- **THEN** the result is ok and the value has no `content`
