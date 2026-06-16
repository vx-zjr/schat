# ADR 0001 - Document Driven Development

## Status

Accepted

## Context

This project is expected to evolve over multiple tasks. Relying on model memory alone would lose context and make iteration brittle.

## Decision

Use `docs/` as the durable project memory. Every task starts by reading the technical baseline, roadmap, iteration log, and relevant decisions. Every task ends by updating the iteration log and any affected architecture, API, or runbook document.

## Consequences

- The repository itself carries project state.
- Agents can resume work without reconstructing intent from chat history.
- Documentation updates are part of development, not cleanup.

