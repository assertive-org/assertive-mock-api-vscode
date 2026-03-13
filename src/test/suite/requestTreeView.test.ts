import * as assert from 'assert';
import { RequestDataProvider, RequestScopeTreeItem, RequestTreeItem } from '../../requestTreeView';
import { MockApiClient, MockRequest } from '../../api';

class MockClient extends MockApiClient {
    requests: MockRequest[] = [];
    scopes: string[] = [];

    override async getScopes(): Promise<string[]> {
        return this.scopes;
    }

    override async getRequests(scope?: string | null): Promise<MockRequest[]> {
        return this.requests.filter(r => r.scope === (scope || null));
    }
}

suite('RequestDataProvider Test Suite', () => {
    const mockRequest1: MockRequest = {
        method: 'GET',
        path: '/matched',
        query: {},
        headers: {},
        body: null,
        host: 'localhost',
        scope: null,
        matched_stub_id: 'stub1'
    };

    const mockRequest2: MockRequest = {
        method: 'POST',
        path: '/unmatched',
        query: {},
        headers: {},
        body: null,
        host: 'localhost',
        scope: null,
        matched_stub_id: null
    };

    test('Filters "all" returns both matched and unmatched', async () => {
        const client = new MockClient();
        client.requests = [mockRequest1, mockRequest2];
        const provider = new RequestDataProvider(client);
        provider.filter = 'all';

        const rootItems = await provider.getChildren() as RequestScopeTreeItem[];
        assert.strictEqual(rootItems.length, 1);
        assert.strictEqual(rootItems[0].scope, null);
        
        const leafItems = await provider.getChildren(rootItems[0]) as RequestTreeItem[];
        assert.strictEqual(leafItems.length, 2);
    });

    test('Returns empty if no requests match filter', async () => {
        const client = new MockClient();
        client.requests = [mockRequest1]; // Only matched
        const provider = new RequestDataProvider(client);
        provider.filter = 'unmatched';

        const rootItems = await provider.getChildren() as RequestScopeTreeItem[];
        assert.strictEqual(rootItems.length, 0, 'Should not show Global scope if empty after filtering');
    });
});
