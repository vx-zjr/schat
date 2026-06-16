# ADR 0002 - Repository Shape

## Status

Accepted

## Context

The backend should be an independent implementation while the root keeps project memory and deployment assets.

## Decision

Use the root directory as the control repository. Place backend code in `backend/`. Place deployment assets in `infra/` and long-lived project state in `docs/`.

## Consequences

- Future frontend work can be added separately without mixing concerns.
- Production deployment can reference backend and infrastructure from one repository.

