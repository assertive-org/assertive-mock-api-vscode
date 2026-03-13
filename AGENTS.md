# Agent Progress - Assertive Mock API VS Code Extension

## Project Overview
This extension provides a VS Code interface for managing and monitoring the `assertive-mock-api-server`. It mirrors the functionality of the server's web admin page, allowing developers to view stubs and incoming requests directly within their IDE.

## Phase 1: Setup (Completed)
- [x] Initialized project structure and `package.json`.
- [x] Set up TypeScript compilation and VS Code launch configurations.
- [x] Resolved dependency conflicts and optimized `.gitignore`.

## Phase 2: Stub & Request Management (Completed)
- [x] **Stub Tree View**:
    - Grouped by Scope (Global, Scoped).
    - Displays `METHOD Path` with `stub_id` as description.
    - Custom formatting for criteria (e.g., `$regex`).
    - Action: **Delete Stub** (Immediate, no confirmation).
    - Action: **Delete Scope** (Named: Deletes scope/stubs/requests; Global: Clears all stubs one-by-one).
    - Action: **View Details** (Opens JSON document).
    - Action: **Create Stub**: A 4-step Webview wizard (Match, Action, Details, Review).
- [x] **Request Log View**:
    - Grouped by Scope.
    - Displays `METHOD Path` with match status as description.
    - Visual indicators (check/warning) for matched vs unmatched requests.
    - Action: **View Details** (Opens JSON document).
    - **Filtering**: Ability to filter requests by "Matched" or "Unmatched" only.
- [x] **Adaptive Polling**:
    - 500ms refresh rate when the view is visible.
    - 3000ms refresh rate when hidden (matching server polling).
    - **Manual Toggle**: Buttons in the view title to start/stop polling.
    - **Backoff Polling**: Uses exponential backoff on connection failure; automatically disables after 5 attempts with a "Retry" option.
- [x] **Custom Server Port**:
    - Configurable via `assertive-mock-api-vscode.port` setting.
    - Prompts user on startup if not set.
    - Polling only starts once the port is configured.
    - Command `Update Port` to change it later.
- [x] **Admin Integration**:
    - Button to open the server's Web Admin UI in the browser (uses configured port).
- [x] **Development Tooling**:
    - `seed_data.js`: A JavaScript utility to populate the server with sample stubs and requests.
    - `Makefile`: A convenient entry point for common tasks (install-dev-deps, test, seed-data, start-server, launch).

## Phase 3: Session Refinements & Bug Fixes (Completed)
- [x] **Server Alignment**:
    - **Scoping Fix**: Aligned `MockApiClient` with server logic; now uses scope names as header keys (e.g., `team-a: 1`) instead of `X-Assertive-Scope`.
    - **Validation Fix**: Resolved 422 errors by ensuring exactly one of `body` or `template_body` is sent (defaulting empty bodies to `""` instead of `null`).
- [x] **UX Polish**:
    - **Contextual Actions**: Moved "Create Stub" and "Filter Requests" from the global title bar to their respective section headers (Stubs/Requests) for better ergonomics.
    - **Empty State Welcome View**: Implemented a "No stubs found" welcome view with a prominent "Create Stub" button.
    - **Loading States**: Added an initial "Connecting to Mock API..." loading state to eliminate UI flickering during startup.
- [x] **Enhanced Testing**:
    - Added `unifiedTreeView.test.ts` to verify tree state transitions (Loading -> Empty/Welcome -> Full).
    - Expanded `api.test.ts` to verify header-key scoping and server payload requirements.
    - Total verified test count: 14 passing.

## Phase 4: Code Quality (Completed)
- [x] **Linting**:
    - Integrated **ESLint** with TypeScript support.
    - Added `.eslintrc.json` with customized rules (e.g., allowing snake_case for API compatibility).
    - Added `make lint` target to the Makefile for automated code quality checks.

## Phase 5: Continuous Integration (Completed)
- [x] **GitHub Actions**:
    - Created `ci.yml` workflow to run on every push.
    - Automated **Linting**, **Compilation**, and **Extension Tests** (using `xvfb-run` for headless display).
    - Added `make ci` target to the Makefile as a unified entry point for local and CI validation.

## Architecture Notes
- **API Communication**: Uses standard `fetch` to communicate with `http://localhost:<port>`. Port is configurable.
- **Unified View**: Stubs and Requests are consolidated into a single "Assertive Mock API" tree view.
- **Context Management**: Extensive use of `setContext` to manage UI visibility (Welcome View, Polling state, Request filters).
- **Grouping Logic**: The server returns `global + scoped` items when a scope is requested. The extension performs client-side filtering (`item.scope === groupScope`) to ensure strict partitioning in the UI.
- **Polling**: Centralized in `UnifiedDataProvider` with adaptive intervals and exponential backoff.

## Future Considerations / Backlog
- [ ] Add support for complex matcher inputs (Regex, JSON criteria) in the UI form using a structured editor.
- [ ] Support for editing existing stubs.
- [ ] Multi-server profile support.
