# Project Instructions

## Core principles

- Preserve existing architecture and conventions unless there is a clear reason to change them.
- Prefer simple, maintainable solutions over clever abstractions.
- Do not overengineer.
- Do not create abstractions before they are needed.
- Reuse existing components, utilities and patterns before creating new ones.
- Keep changes focused on the requested task.
- Do not refactor unrelated code without a concrete reason.
- When unsure how something should be implemented, inspect similar existing code first.

## Before implementation

Before writing significant code:

1. Understand the relevant existing architecture.
2. Find similar implementations in the repository.
3. Identify affected frontend, backend and data contracts.
4. Consider important edge cases and failure modes.
5. Make the smallest architectural change that solves the problem.

For larger features, briefly plan the implementation before editing files.

---

# Frontend

## General

- Use React + TypeScript conventions already established in the project.
- Keep presentation components focused on UI.
- Keep business logic and complex transformations outside presentation components.
- Prefer composition over large highly-configurable components.
- Avoid unnecessary global state.
- Avoid unnecessary `useEffect`.
- Avoid premature `useMemo` and `useCallback`.
- Do not create generic abstractions for a single use case.

## TypeScript

Keep TypeScript strict.

Avoid:
- `any`
- `@ts-ignore`
- unsafe casts
- unnecessary non-null assertions

Do not bypass the type system just to make code compile.

## UI consistency

- Reuse existing design tokens and components.
- Do not introduce arbitrary colors, spacing, radii or typography when an existing token exists.
- Maintain consistent information density across the application.
- Do not introduce generic AI/SaaS visual patterns unless requested.

Avoid without explicit request:
- oversized cards
- oversized headings
- excessive whitespace
- large border radii
- random gradients
- glassmorphism
- glowing borders
- excessive pills
- unnecessary decorative elements
- icons inside decorative boxes everywhere

## Design system

The locked design system is `DESIGN_SYSTEM.md` (values) and `UI_RULES.md` (rules). Tokens live in
`frontend/src/styles/tokens.css`; shared components are listed in `DESIGN_SYSTEM.md` §16.

---

# Visual references

Files inside:

`/references/ui/`

are visual references for the application.

When a screenshot/reference is supplied:

- Treat it as the primary visual source of truth.
- Reproduce its visual language rather than redesigning it.
- Fidelity is more important than creativity.
- Preserve unusual proportions and layout decisions visible in the reference.
- Do not "improve" the reference unless explicitly requested.

Match, in this order:

1. overall composition
2. component dimensions
3. spacing
4. alignment
5. typography hierarchy
6. information density
7. colors
8. borders and radii
9. visual details

The physical device, perspective, reflections or background around a UI screenshot are not part of the application unless explicitly requested.

---

# Browser verification

For all frontend/UI work:

- Never assume an implementation looks correct from code alone.
- Run the application after meaningful UI changes.
- Inspect the rendered result in the browser.
- Use screenshots for visual tasks.
- Check the browser console for errors.
- Verify relevant interactions.
- Compare screenshot-driven implementations against their reference.
- Iterate when meaningful visual discrepancies remain.

A frontend task is not complete until the rendered result has been inspected.

---

# Backend

- Keep controllers/endpoints thin.
- Business logic should not live in controllers.
- Do not introduce repository layers over EF Core automatically.
- Do not create interfaces with only one implementation unless there is a real architectural reason.
- Avoid service/manager/provider layers that only forward method calls.
- Put abstractions at real architectural boundaries.

For async operations:
- propagate `CancellationToken` where appropriate
- handle external-call timeouts
- handle failures explicitly

For database code:
- avoid N+1 queries
- avoid loading full entities when a projection is sufficient
- paginate unbounded collections
- consider indexes based on actual query patterns
- use transactions where atomicity is required

Errors must not be silently swallowed.

Never leave empty `catch` blocks.

---

# API contracts

Frontend and backend contracts must remain synchronized.

Prefer generated/shared API contracts where the project supports them.

When changing an API consider:

- request
- response
- validation
- authorization
- error responses
- backward compatibility
- database changes
- frontend consumers

Do not silently change an existing API contract.

---

# Security

Never:
- hardcode secrets
- trust client-side authorization
- expose sensitive internal data
- concatenate untrusted input into SQL
- disable security checks simply to make something work

Validate untrusted input at appropriate boundaries.

Authentication and authorization must be enforced server-side.

---

# Testing and verification

After meaningful changes, run the relevant checks.

Frontend:
- typecheck
- lint
- tests
- build
- browser verification when UI is affected

Backend:
- build
- unit tests
- integration tests when relevant

Do not claim a check passed unless it was actually run.

If something could not be tested, explicitly state what was not verified.

---

# Code quality

Prefer:
- clear names
- small cohesive functions
- explicit behavior
- straightforward control flow

Avoid:
- unnecessary wrappers
- excessive indirection
- premature generalization
- duplicate models
- magic strings
- hidden side effects

Comments should explain WHY, not restate obvious code.

After implementing a large feature, consider whether the same behavior can be expressed with less code.

---

# Context efficiency

- Search before reading large files.
- Read only the files relevant to the current task.
- Prefer symbol/reference search over scanning entire directories.
- Do not repeatedly reread unchanged documentation.
- Delegate broad repository exploration when appropriate.
- Keep tool output concise when full output is unnecessary.

---

# Completion

Before declaring a task complete:

1. confirm the requested behavior is implemented
2. check relevant errors and edge cases
3. run appropriate verification
4. inspect UI visually if frontend changed
5. review the diff for unnecessary complexity
6. ensure unrelated behavior was not changed

---

## Browser verification

For all frontend/UI work:

- Never assume an implementation looks correct from code alone.
- Run the application after meaningful UI changes.
- Inspect the rendered result in the browser.
- Use screenshots for visual tasks.
- Check browser console errors.
- Verify interactions when relevant.
- Compare screenshot-driven implementations against the reference.
- Iterate when visual discrepancies remain.

A frontend task is not complete until the rendered result has been inspected.