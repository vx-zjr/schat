# ADR 0003 - Prisma

## Status

Accepted

## Context

The backend needs PostgreSQL persistence, migrations, type-safe access, and tests that can set up known data quickly.

## Decision

Use Prisma as the database access layer. Keep business rules in NestJS services rather than scattering them inside controllers or raw SQL helpers.

## Consequences

- Prisma schema becomes the source of truth for database shape.
- Migrations and seed scripts are explicit project artifacts.

