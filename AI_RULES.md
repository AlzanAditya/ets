# AI Development Rules

These rules apply to all future work in this repository.

---

# Communication Language

All communication with the user must be written in Indonesian.

Includes:

* analysis
* plans
* approvals
* summaries
* reports
* architecture reviews

Code may remain in English.

---

# Approval First

Before modifying files:

1. Analyze
2. Present plan
3. List affected files
4. Explain benefits
5. Explain risks
6. Wait for approval

Valid approvals:

* APPROVED
* CONTINUE
* PROCEED
* LANJUTKAN
* SETUJU

Without approval:

Analysis only.

---

# Architecture Layers

## ui/

Must remain:

* reusable
* business-agnostic
* presentation-focused

Do not refactor unnecessarily.

---

## components/

Shared components should be reusable whenever practical.

Avoid embedding:

* business labels
* titles
* descriptions
* module names
* business data

Use props instead.

---

## features/

Feature-specific components belong here.

Before creating a feature-specific component:

evaluate whether a reusable abstraction is beneficial.

Prefer reusability when it improves maintainability without introducing excessive complexity.

Avoid over-engineering.

---

# Page Owns Data

Pages and features should own:

* business data
* labels
* titles
* descriptions
* configuration
* API responses

Shared components receive values through props.

---

# TypeScript Standards

Prefer:

* interfaces
* generics
* strong typing
* reusable types

Avoid:

* any
* duplicated types
* unnecessary casts

---

# Component Documentation

Every reusable component should contain a concise documentation block at the top of the TSX file.

Include:

* purpose
* responsibilities
* expected props
* usage notes

Keep documentation concise.

---

# Development Preview Support

Reusable components should render independently.

Provide placeholder/default values when appropriate.

Allowed:

* placeholder titles
* placeholder descriptions
* placeholder cards
* placeholder charts
* placeholder tables

Placeholder content must be generic and clearly for development purposes.

Never use realistic business data.

---

# Reuse Before Creating

Before creating a new component:

1. Search for existing reusable components.
2. Determine whether extension is possible.
3. Create a new component only when necessary.

---

# Preserve Functionality

Do not alter business behavior unless explicitly requested.

---

# Refactor Policy

Refactor incrementally.

Prefer safe changes over large rewrites.


---

# Primary Goal

Build a scalable SaaS / ERP architecture with:

* reusable UI
* maintainable code
* clear separation of concerns
* strong TypeScript practices
* future module scalability

---

# Page Generation Policy

When generating new pages:

- Use existing reusable components whenever possible.
- Do not create page-specific components by default.
- Compose pages from existing building blocks first.
- New components require justification.
- Reuse is the default strategy.