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

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (to run the mock server)

### Setup
1. Clone the repository.
2. Navigate to the extension directory:
   ```bash
   cd assertive-mock-api-vscode
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Extension
1. Start the mock API server:
   ```bash
   docker-compose up -d
   ```
2. Open this folder in VS Code.
3. Press `F5` to launch the **Extension Development Host**.
4. Look for the **Assertive Mock API** icon in the Activity Bar.

---

## Development

### Seeding Data
To test the extension with various stubs and requests, run the included seeding script:
```bash
node seed_data.js
```
This will create a mix of global/scoped stubs and generate a request history with both matches and failures.

### Project Structure
- `src/api.ts`: API client for the mock server.
- `src/stubTreeView.ts`: Logic for the Stubs sidebar.
- `src/requestTreeView.ts`: Logic for the Requests sidebar.
- `src/extension.ts`: Extension entry point and command registration.

### Building
The project uses the TypeScript compiler. Run `npm run compile` for a one-time build or use the `F5` launch task which handles this automatically.
