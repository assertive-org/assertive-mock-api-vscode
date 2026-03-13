import * as vscode from 'vscode';
import { MockApiClient } from './api';
import { StubTreeItem } from './stubTreeView';
import { UnifiedDataProvider } from './unifiedTreeView';
import { CreateStubWebview } from './createStubWebview';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "assertive-mock-api-vscode" is now active!');

	const apiClient = new MockApiClient();
	const unifiedDataProvider = new UnifiedDataProvider(apiClient);

	const unifiedTreeView = vscode.window.createTreeView('assertive-mock-api-unified', {
		treeDataProvider: unifiedDataProvider
	});

	let pollingEnabled = true;
	vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.pollingEnabled', pollingEnabled);
	vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.requestFilter', 'all');
	vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.hasStubs', false);

	// Handle automatic polling disabling (e.g., connection lost)
	unifiedDataProvider.onDidAutoDisablePolling(() => {
		pollingEnabled = false;
		vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.pollingEnabled', pollingEnabled);
	});

	function startPollingIfEnabled() {
		if (!pollingEnabled) {
			return;
		}

		const config = vscode.workspace.getConfiguration('assertive-mock-api-vscode');
		const port = config.get<number | null>('port');
		if (!port) {
			return;
		}

		if (unifiedTreeView.visible) {
			unifiedDataProvider.startPolling(500);
		} else {
			unifiedDataProvider.startPolling(3000);
		}
	}

	function stopPolling() {
		unifiedDataProvider.stopPolling();
	}

	async function ensurePortConfigured() {
		const config = vscode.workspace.getConfiguration('assertive-mock-api-vscode');
		let port = config.get<number | null>('port');

		if (port === null || port === undefined) {
			const input = await vscode.window.showInputBox({
				prompt: 'Enter the port the Assertive Mock API server is running on',
				placeHolder: '8910',
				validateInput: (value) => {
					const num = parseInt(value);
					if (isNaN(num) || num <= 0 || num > 65535) {
						return 'Please enter a valid port number (1-65535)';
					}
					return null;
				}
			});

			if (input) {
				port = parseInt(input);
				await config.update('port', port, vscode.ConfigurationTarget.Global);
			}
		}

		if (port) {
			apiClient.setPort(port);
			unifiedDataProvider.refresh();
			startPollingIfEnabled();
		}
	}

	// Initial setup
	if (process.env.NODE_ENV === 'test') {
		console.log('Skipping port configuration in test environment');
	} else {
		await ensurePortConfigured();
	}

	// Adaptive Polling
	unifiedTreeView.onDidChangeVisibility(() => {
		startPollingIfEnabled();
	});

	context.subscriptions.push(unifiedTreeView);

	context.subscriptions.push(
		vscode.commands.registerCommand('assertive-mock-api-vscode.createStub', () => {
			CreateStubWebview.createOrShow(context.extensionUri, apiClient);
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.filterRequestsAll', () => {
			unifiedDataProvider.requestProvider.filter = 'all';
			vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.requestFilter', 'all');
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.filterRequestsMatched', () => {
			unifiedDataProvider.requestProvider.filter = 'matched';
			vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.requestFilter', 'matched');
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.filterRequestsUnmatched', () => {
			unifiedDataProvider.requestProvider.filter = 'unmatched';
			vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.requestFilter', 'unmatched');
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.startPolling', () => {
			pollingEnabled = true;
			vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.pollingEnabled', pollingEnabled);
			startPollingIfEnabled();
			vscode.window.showInformationMessage('Assertive Mock API polling started.');
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.stopPolling', () => {
			pollingEnabled = false;
			vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.pollingEnabled', pollingEnabled);
			stopPolling();
			vscode.window.showInformationMessage('Assertive Mock API polling stopped.');
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.updatePort', async () => {
			const config = vscode.workspace.getConfiguration('assertive-mock-api-vscode');
			const currentPort = config.get<number | null>('port');

			const input = await vscode.window.showInputBox({
				prompt: 'Enter the port the Assertive Mock API server is running on',
				value: currentPort?.toString() || '8910',
				validateInput: (value) => {
					const num = parseInt(value);
					if (isNaN(num) || num <= 0 || num > 65535) {
						return 'Please enter a valid port number (1-65535)';
					}
					return null;
				}
			});

			if (input) {
				const port = parseInt(input);
				await config.update('port', port, vscode.ConfigurationTarget.Global);
				apiClient.setPort(port);
				
				// Restart polling with new port
				startPollingIfEnabled();
				
				unifiedDataProvider.refresh();
				vscode.window.showInformationMessage(`Assertive Mock API port updated to ${port}`);
			}
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.refreshAll', () => {
			unifiedDataProvider.refresh();
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.deleteStub', async (item: StubTreeItem) => {
			if (!item || !item.stub) {
				return;
			}

			try {
				await apiClient.deleteStub(item.stub.stub_id, item.stub.scope);
				vscode.window.showInformationMessage(`Stub "${item.stub.stub_id}" deleted.`);
				unifiedDataProvider.stubProvider.refresh();
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete stub: ${error}`);
			}
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.deleteScope', async (item: any) => {
			if (!item || item.scope === undefined) {
				return;
			}

			try {
				if (item.scope === null) {
					// "Delete" Global scope: Delete all global stubs one by one
					// (Requests cannot be cleared individually via current API)
					const stubs = await apiClient.getStubs(null);
					await Promise.all(stubs.map(s => apiClient.deleteStub(s.stub_id, null)));
					vscode.window.showInformationMessage(`Global stubs cleared.`);
				} else {
					// Named scope: Server handles clearing stubs/requests automatically
					await apiClient.deleteScope(item.scope);
					vscode.window.showInformationMessage(`Scope "${item.scope}" deleted.`);
				}
				unifiedDataProvider.refresh();
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to clear scope: ${error}`);
			}
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.viewStubDetails', async (stub) => {
			const content = JSON.stringify(stub, null, 2);
			const document = await vscode.workspace.openTextDocument({
				content,
				language: 'json'
			});
			await vscode.window.showTextDocument(document);
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.viewRequestDetails', async (request) => {
			const content = JSON.stringify(request, null, 2);
			const document = await vscode.workspace.openTextDocument({
				content,
				language: 'json'
			});
			await vscode.window.showTextDocument(document);
		}),

		vscode.commands.registerCommand('assertive-mock-api-vscode.openAdminPage', async () => {
			const url = vscode.Uri.parse(`${apiClient.baseUrl}/__admin__`);
			await vscode.env.openExternal(url);
		})
	);
}

export function deactivate() {}
