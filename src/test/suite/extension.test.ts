import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', function() {
	this.timeout(10000);
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension activates without error', async () => {
		const ext = vscode.extensions.getExtension('assertive.assertive-mock-api-vscode');
		assert.ok(ext, 'Extension should be present');
		await ext!.activate();
		assert.strictEqual(ext!.isActive, true, 'Extension should be active');
	});

	test('Commands are registered', async () => {
		// Activate the extension
		const ext = vscode.extensions.getExtension('assertive.assertive-mock-api-vscode');
		await ext?.activate();

		const commands = await vscode.commands.getCommands(true);
		const expectedCommands = [
			'assertive-mock-api-vscode.refreshAll',
			'assertive-mock-api-vscode.createStub',
			'assertive-mock-api-vscode.updatePort',
			'assertive-mock-api-vscode.openAdminPage',
			'assertive-mock-api-vscode.deleteStub',
			'assertive-mock-api-vscode.deleteScope',
			'assertive-mock-api-vscode.startPolling',
			'assertive-mock-api-vscode.stopPolling',
			'assertive-mock-api-vscode.filterRequestsAll',
			'assertive-mock-api-vscode.filterRequestsMatched',
			'assertive-mock-api-vscode.filterRequestsUnmatched',
			'assertive-mock-api-vscode.viewStubDetails',
			'assertive-mock-api-vscode.viewRequestDetails'
		];

		for (const cmd of expectedCommands) {
			assert.ok(commands.includes(cmd), `Command ${cmd} is not registered`);
		}
	});
});
