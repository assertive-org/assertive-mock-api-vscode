.PHONY: install-dev-deps test lint seed-data launch compile start-server stop-server clean

# Install development dependencies
install-dev-deps:
	@echo "Installing development dependencies..."
	@npm install

# Run extension tests
test:
	@echo "Running extension tests..."
	@npm test

# Lint the source code
lint:
	@echo "Linting the source code..."
	@npm run lint

# Run CI (lint, compile, and test)
ci: lint compile test
# Note: Ensure the server is running (make start-server) before seeding.
seed-data:
	@echo "Seeding sample data to the mock server..."
	@node seed_data.js

# Compile TypeScript
compile:
	@echo "Compiling TypeScript..."
	@npm run compile

# Start the Assertive Mock API server via Docker
start-server:
	@echo "Starting the Assertive Mock API server via Docker..."
	@docker compose up -d

# Stop the Assertive Mock API server
stop-server:
	@echo "Stopping the Assertive Mock API server..."
	@docker compose down

# Launch VS Code extension development host
# Requires 'code' to be in your PATH.
launch: compile
	@echo "Launching VS Code extension development host..."
	@code --extensionDevelopmentPath=$(PWD)

# Clean up build artifacts
clean:
	@echo "Cleaning up build artifacts..."
	@rm -rf out
