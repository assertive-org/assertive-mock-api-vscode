import * as assert from 'assert';
import * as vscode from 'vscode';
import { UnifiedDataProvider } from '../../unifiedTreeView';
import { MockApiClient } from '../../api';

suite('UnifiedDataProvider Test Suite', () => {
    let apiClient: MockApiClient;
    let provider: UnifiedDataProvider;

    setup(() => {
        apiClient = new MockApiClient();
        provider = new UnifiedDataProvider(apiClient);
    });

    test('updateHasStubsContext sets context to true when stubs exist', async () => {
        // Mock getStubs to return one stub
        (apiClient as any).getStubs = async () => [{ stub_id: '1' }];
        
        let capturedContextKey = '';
        let capturedValue: any = null;

        // Mock executeCommand to capture setContext calls
        const originalExecuteCommand = vscode.commands.executeCommand;
        (vscode.commands as any).executeCommand = async (command: string, ...args: any[]) => {
            if (command === 'setContext') {
                capturedContextKey = args[0];
                capturedValue = args[1];
            }
            return Promise.resolve();
        };

        try {
            await (provider as any).updateHasStubsContext();
            assert.strictEqual(capturedContextKey, 'assertive-mock-api-vscode.hasStubs');
            assert.strictEqual(capturedValue, true);
        } finally {
            (vscode.commands as any).executeCommand = originalExecuteCommand;
        }
    });

    test('getChildren returns loading item before initial load complete', async () => {
        const children = await provider.getChildren();
        assert.strictEqual(children.length, 1);
        assert.strictEqual((children[0] as any).label, 'Connecting to Mock API...');
    });

    test('updateHasStubsContext sets context to false when no stubs exist', async () => {
        // Mock getStubs to return empty
        (apiClient as any).getStubs = async () => [];
        
        let capturedValue: any = null;

        const originalExecuteCommand = vscode.commands.executeCommand;
        (vscode.commands as any).executeCommand = async (command: string, ...args: any[]) => {
            if (command === 'setContext' && args[0] === 'assertive-mock-api-vscode.hasStubs') {
                capturedValue = args[1];
            }
            return Promise.resolve();
        };

        try {
            await (provider as any).updateHasStubsContext();
            assert.strictEqual(capturedValue, false);
        } finally {
            (vscode.commands as any).executeCommand = originalExecuteCommand;
        }
    });

    test('getChildren returns empty array when no stubs exist and load complete', async () => {
        (apiClient as any).getStubs = async () => [];
        await (provider as any).updateHasStubsContext();
        
        const children = await provider.getChildren();
        assert.strictEqual(children.length, 0);
    });

    test('getChildren returns top level items when stubs exist and load complete', async () => {
        (apiClient as any).getStubs = async () => [{ stub_id: '1' }];
        await (provider as any).updateHasStubsContext();
        
        const children = await provider.getChildren();
        assert.strictEqual(children.length, 2);
        assert.strictEqual((children[0] as any).label, 'Stubs');
        assert.strictEqual((children[1] as any).label, 'Requests');
    });
});
