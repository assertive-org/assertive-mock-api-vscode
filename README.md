# Assertive Mock API VS Code Extension

A VS Code extension to manage and monitor your [Assertive Mock API](https://github.com/peter-daly/assertive-mock-api) server directly from your editor.

## Features

### 🛠 Stub Management
- View all active stubs grouped by **Scope** (Global, Scoped).
- Visualizes HTTP Method, Path, and Criteria (e.g., regex matchers).
- **Delete Stubs**: Remove stubs instantly from the sidebar.
- **View Details**: Inspect the full stub configuration in a JSON editor.

### 📝 Request Logging
- Monitor incoming requests in real-time.
- **Matched vs Unmatched**: Clear visual indicators (✅/⚠️) show if a request matched a stub.
- **Scope Grouping**: See requests partitioned by their respective scopes.
- **Deep Inspection**: Click any request to see headers, body, query params, and which stub ID it matched.

### ⚡️ Real-time Synchronization
- **Adaptive Polling**: The extension refreshes every **500ms** when the sidebar is visible and slows down to **3 seconds** when hidden to save resources while staying in sync with the server.