# Assertive Mock API for VS Code

This extension provides a sidebar interface for managing and monitoring the [Assertive Mock API](https://github.com/peter-daly/assertive-mock-api) server within VS Code.

## Features

*   **Request Log**: Displays a history of incoming requests with visual indicators for matches (✅) and failures (⚠️).
*   **Stub Management**: Tree view for browsing, inspecting, and deleting global or scoped stubs.
*   **Stub Wizard**: A multi-step interface for creating new stubs.
*   **Adaptive Polling**: Synchronizes with the local server based on view visibility (higher frequency when the sidebar is open).

## Setup

1.  **Start the server**: Ensure the mock server is running (e.g., `docker compose up -d`).
2.  **Configure Port**: Open the **Assertive Mock API** view in the Activity Bar. You will be prompted for the server port (default is `8910`).
3.  **Usage**: Stubs and request history will populate automatically once the port is set.

## Available Commands

| Command | Action |
| :--- | :--- |
| `Update Port` | Updates the connection port for the server. |
| `Open in browser` | Opens the server's web admin interface. |
| `Create Stub` | Launches the stub creation wizard. |
| `Filter Requests` | Filters the request log by all, matched, or unmatched. |
