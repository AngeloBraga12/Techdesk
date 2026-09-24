# Engineering Context

TechDesk is a production-oriented technical-service management application. The backend is the authority for authenticated business data.

## Proactive implementation rules

Infer low-risk implementation details from the existing architecture instead of requiring a specification for every component. Preserve the React/Vite + Express + PostgreSQL + Prisma boundaries already established.

Security decisions are conservative by default:

- The browser is not a security boundary.
- Authorization is enforced server-side.
- Sensitive business data must not be treated as durable browser storage merely for convenience.
- Validation and error handling belong at trust boundaries.
- New authenticated endpoints must preserve session, role, CORS and rate-limit guarantees.

## Product behavior

A feature is not complete when its happy path works once. Consider loading, empty, validation, authorization, network failure and recovery states as part of the implementation.

The API remains the source of truth. Client state is a presentation cache, not a second database.

## Change strategy

Prefer incremental changes that preserve existing workflows. After a coherent change, verify type-check/build behavior and security-sensitive paths before considering the work complete.
