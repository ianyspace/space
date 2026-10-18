# Fix React Rules of Hooks Violation in i18n Formatting

Resolve the React Rules of Hooks error in `BlogIndex` and across the application by ensuring all context-reading localization helpers (`formatMessage` and `formatDate`) execute unconditionally at the top level of component renders rather than inside conditional JSX branches, early-return paths, or `.map()` loops.

## User Review & Critical Decisions

> [!NOTE]
> The root cause of the error is deterministic and self-contained within the localization helper usage pattern, so no user configuration changes or visual trade-offs are required.

- **Unconditional Hook Resolution**: Keep the existing `LanguageContext` and localization message definitions intact while hoisting all hook-backed message lookups to the top level of each component render cycle.

## 1. Overview & Core Concept

- **What It Does**: Eliminates runtime crashes (`React has detected a change in the order of Hooks called by BlogIndex`) when scrolling through the post list, switching between infinite scroll and pagination modes, or interacting with tag views and breadcrumbs.
- **Target Audience / Persona**: Blog readers browsing the home feed, paginating or infinite-scrolling through posts, and exploring tag graphs or article pages.
- **Key Value**: Guarantees a stable, predictable hook execution order across every render and state transition (such as when `loadedAll` or `scrollMode` flips after hydration or intersection observer events).

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **Home Feed & Infinite Scroll**: When a reader loads the home page or scrolls to the bottom of the article list (`loadedAll` transitions from `false` to `true`), the "all posts loaded" footer message renders smoothly without triggering a React hook order mismatch.
  - **List Mode Switching**: When a user switches between infinite scroll and pagination in Settings, `BlogIndex` transitions cleanly on mount (`useLayoutEffect`) without hook count discrepancies.
  - **Tag Exploration & Breadcrumbs**: Hovering nodes in the interactive tag graph, viewing related tags on a tag detail page, or rendering conditional breadcrumbs and related posts maintains consistent hook invocation order.
- **Visual Identity & Theme**: Preserves the existing blog visual design, typography, and light/dark theme behavior without alteration.
- **Interactive Feedback & Motion**: Smooth infinite scroll loading and interactive tag node inspection without runtime error overlays.

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hoist Hook-Backed Localization Calls to Component Top Level**
  - *Chosen Approach*: Resolve all `formatMessage` calls unconditionally at the top of `BlogIndex` and other affected components (before any early returns, conditional JSX expressions, or `.map()` iterations).
  - *Why*: `formatMessage` internally calls `useLang()`, which invokes `useContext(LanguageContext)`. Calling `formatMessage` inside `{loadedAll ? ... : null}`, `{activeTagData && ...}`, `.map()` loops, or after early `if (...) return null` statements causes React to see a different number of `useContext` calls between renders. Hoisting them aligns every component with the pattern already documented in `SettingForm`.
  - *Alternatives Considered*: Only fixing the single conditional call in `BlogIndex` while leaving identical conditional/loop calls in `TagGraph`, `TagPage`, `Breadcrumbs`, and `RelativePosts` would leave latent Rules of Hooks bugs on other pages.

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────┐
│                       LanguageContext                        │
│          Provides: { lang, homeLink, messages, refresh }     │
└──────────────────────────────┬───────────────────────────────┘
                               │ useLang() / formatMessage()
                               ▼
┌──────────────────────────────────────────────────────────────┐
│         Top-Level Unconditional Hook Resolution Layer        │
│  All context reads & message formatters execute before any   │
│  early returns, conditional branches, or array iterations    │
└──────┬───────────────────────┬────────────────────────┬──────┘
       │                       │                        │
       ▼                       ▼                        ▼
┌──────────────┐       ┌───────────────┐        ┌──────────────┐
│  BlogIndex   │       │ Tag Views     │        │ Navigation   │
│  • Post count│       │ • TagGraph    │        │ • Breadcrumbs│
│  • Loaded all│       │ • TagPage     │        │ • Relative   │
│    banner    │       │ • Cloud/Grid  │        │   Posts      │
└──────────────┘       └───────────────┘        └──────────────┘
```

- **Data Model & State**:
  - `BlogIndex` manages `simpleTheme`, `listMode`, and `visibleCount`. Both the post-count header and the `tfLoadedAll` banner text are computed unconditionally at the top of the render function so toggling `scrollMode` or `loadedAll` never changes the hook call sequence.
- **Interactive Component & State Mapping**:
  - **Home Feed (`BlogIndex`)**: Hoist `formatMessage('tfIndCountPosts', ...)` and `formatMessage('tfLoadedAll', allPosts.length)` above the JSX return statement so they run unconditionally on every render.
  - **Tag Views (`TagPage`, `TagGraph`, `TagCloud`, `TagGrid`)**: Hoist `formatMessage` calls out of conditional blocks (`relatedTags.length > 0`, `activeTagData`) and `.map()` callbacks so `useContext` is invoked once at component top level rather than per-item or per-hover state.
  - **Conditional Navigation (`Breadcrumbs`, `RelativePosts`)**: Move `formatMessage('tHome')` and `formatMessage('tRelativePosts')` above early `return null` guards so hook count remains constant even when props toggle between empty and populated states.
