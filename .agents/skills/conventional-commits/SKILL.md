---
name: conventional-commits
description: >-
  Use this skill when drafting, formatting, reviewing, or creating git commit messages and git commits following the Conventional Commits v1.0.0 specification.
---

# Conventional Commits v1.0.0 Skill

This guide provides complete instructions for crafting and validating commit messages and executing git commits strictly adhering to the **[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/#summary)** specification.

---

## 1. Commit Message Specification

Every commit message must follow this exact structural format:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Components

| Component | Required? | Description & Constraints |
| :--- | :--- | :--- |
| **`<type>`** | **Required** | A lowercase noun designating the intent of the patch (e.g., `feat`, `fix`, `refactor`). |
| **`[optional scope]`** | Optional | A noun enclosed in parentheses describing the affected codebase area (e.g., `(category)`, `(auth)`). |
| **`!`** (Breaking Change) | Optional | Placed immediately before the `:` to denote a breaking change (e.g., `feat!: ...` or `feat(api)!: ...`). |
| **`: `** | **Required** | A colon followed by a single space must follow the type/scope prefix. |
| **`<description>`** | **Required** | A succinct imperative summary of the code changes. Must be lowercase start, no trailing period. |
| **`[optional body]`** | Optional | Detailed explanation of motivation and context. Must start one blank line after the description. |
| **`[optional footer(s)]`** | Optional | Structured trailers (e.g., `BREAKING CHANGE: ...`, `Closes: #123`). Must start one blank line after body/description. |

---

## 2. Commit Types & SemVer Impact

The commit type communicates the nature of the change and aligns directly with Semantic Versioning (SemVer):

| Type | SemVer Impact | Definition & Intent |
| :--- | :--- | :--- |
| **`feat`** | `MINOR` | Adds a new feature or capability for consumers/users. |
| **`fix`** | `PATCH` | Fixes a bug or defect in existing functionality. |
| **`refactor`** | None | Code changes that neither fix a bug nor add a feature (e.g., restructuring, simplifying logic, renaming). |
| **`perf`** | `PATCH` / None | Code changes specifically aimed at improving runtime performance or resource usage. |
| **`chore`** | None | Routine maintenance, config tweaks, auxiliary changes with no production code modification. |
| **`docs`** | None | Documentation updates only (e.g., `README.md`, JSDoc, API docs). |
| **`style`** | None | Formatting, whitespace, semicolon corrections; no logic or behavioral modifications. |
| **`test`** | None | Adding missing unit/integration tests or refactoring existing tests. |
| **`build`** | None | Changes affecting build tooling, packaging, bundler, or dependencies (`vite.config.js`, `package.json`). |
| **`ci`** | None | Changes to CI/CD pipeline definitions and automation scripts (e.g., GitHub Actions workflows). |
| **`revert`** | Depends | Reverts a previously merged commit. Must specify the reverted commit SHA or title. |

---

## 3. Scopes

Scopes contextualize the change to a specific section, module, or layer of the application.

### Recommended Project Scopes

- **Features / Domains**: `(menu)`, `(category)`, `(upsell)`, `(auth)`, `(order)`, `(tables)`, `(analytics)`, `(restaurant)`
- **UI / Frontend Layers**: `(ui)`, `(sidebar)`, `(modal)`, `(navbar)`, `(hooks)`, `(routes)`, `(components)`
- **Core / Tooling**: `(api)`, `(deps)`, `(vite)`, `(eslint)`, `(styles)`, `(config)`

### Examples:
- `feat(category): add drag-and-drop ordering for category items`
- `fix(sidebar): prevent duplicate category group rendering`
- `refactor(hooks): extract useCategories query into shared hook`

---

## 4. Breaking Changes

A breaking change alters an API contract or expected behavior, requiring downstream callers to modify their code (correlates with `MAJOR` in SemVer).

A breaking change **MUST** be signaled using at least one of these two methods (both are recommended):

### Method 1: The `!` Token
Include an exclamation mark `!` immediately preceding the colon:
```text
feat(api)!: require restaurantId query param on category endpoints
```

### Method 2: The `BREAKING CHANGE:` Footer
Include a footer starting with `BREAKING CHANGE:` (or `BREAKING-CHANGE:`), in all-caps, followed by a space and description:
```text
feat(category): migrate category ID to UUIDv4 format

BREAKING CHANGE: Category IDs are now formatted as UUID strings instead of numeric integers.
```

### Combined Example (Best Practice)
```text
feat(auth)!: require JWT bearer token on all dashboard API routes

BREAKING CHANGE: Session cookie authentication has been removed. All API requests must include an Authorization header with Bearer token.
```

---

## 5. Message Formatting Rules

1. **Imperative, Present-Tense Description**:
   - ✅ `feat(order): add print bill button to modal`
   - ❌ `feat(order): added print bill button to modal`
   - ❌ `feat(order): adds print bill button to modal`
   - ❌ `feat(order): adding print bill button to modal`

2. **Casing & Punctuation**:
   - The `<description>` starts with a lowercase letter (unless starting with a proper noun, acronym, or code identifier).
   - Do **NOT** put a period (`.`) at the end of the summary line.
   - `BREAKING CHANGE` token must be entirely uppercase.

3. **Body Guidelines**:
   - Separate the subject line from the body with exactly one blank line.
   - Explain the **why** and **what** behind the change, not just the code mechanics.
   - Free-form text; multiple paragraphs or bullet points are permitted.

4. **Footer Guidelines**:
   - Separate the body from the footers with exactly one blank line.
   - Each footer must be a valid trailer: `<token>: <value>` or `<token> #<value>`.
   - Token words must be hyphen-separated (e.g., `Closes-Issue: #123`, `Reviewed-by: Jane Doe`), with the sole exception of `BREAKING CHANGE`.
   - Examples:
     ```text
     Closes: #42
     Refs: #108
     Co-authored-by: Alex <alex@example.com>
     ```

5. **Atomic Commits**:
   - Each commit should encapsulate a single, coherent logical change.
   - Separate unrelated bug fixes, feature work, and code formatting into distinct commits.

---

## 6. Step-by-Step Commit Workflow

Execute these steps in order when creating a commit:

### Step 1: Inspect Changes
```bash
git status
git diff
```

### Step 2: Validate Quality & Linting
Ensure the project builds cleanly and passes linter checks before committing:
```bash
npm run lint
# or npm run build if validating compilation
```

### Step 3: Stage Files Atomically
Stage only the relevant files for the logical unit of work:
```bash
git add src/components/CategoryModal.jsx src/hooks/useCategory.js
```

### Step 4: Craft & Execute Commit

**Single-line commit:**
```bash
git commit -m "feat(category): add confirmation dialog before deleting category group"
```

**Multi-line commit with body and footer:**
```bash
git commit -m "fix(menu): prevent race condition when fetching item list" \
  -m "Debounce the search input handler and cancel in-flight API requests when the search term changes." \
  -m "Closes: #56"
```

### Step 5: Verify the Created Commit
Inspect the latest commit log:
```bash
git log -1 --stat
```

---

## 7. Concrete Examples

### Feature Addition
```text
feat(menu): add bulk discount selector to combo items
```

### Bug Fix with Issue Reference
```text
fix(table): correct table capacity calculation during reservation

Ensure party size does not exceed maximum seating allowance when split tables are selected.

Fixes: #89
```

### Refactor
```text
refactor(auth): simplify role verification logic across route guards
```

### Build / Dependency Update
```text
chore(deps): update vite to version 5.4.2
```

### Breaking Change
```text
refactor(api)!: standardize response payload envelope to { success, data, error }

BREAKING CHANGE: Raw JSON responses are now wrapped inside a standard payload envelope with `success` boolean and `data` object.
```
