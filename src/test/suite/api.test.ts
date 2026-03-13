import * as assert from 'assert';
import { MockApiClient } from '../../api';

suite('MockApiClient Test Suite', () => {
    let originalFetch: any;

    setup(() => {
        originalFetch = global.fetch;
    });

    teardown(() => {
        global.fetch = originalFetch;
    });

	test('Default baseUrl is set to 8911', () => {
		const client = new MockApiClient();
		assert.strictEqual(client.baseUrl, 'http://localhost:8911');
	});

	test('setPort updates baseUrl', () => {
		const client = new MockApiClient();
		client.setPort(1234);
		assert.strictEqual(client.baseUrl, 'http://localhost:1234');
	});

    test('createScope calls correct endpoint', async () => {
        let calledUrl = '';
        let calledOptions: any = {};

        global.fetch = (async (url: string, options: any) => {
            calledUrl = url;
            calledOptions = options;
            return { ok: true, status: 201 };
        }) as any;

        const client = new MockApiClient();
        await client.createScope('test-scope');

        assert.strictEqual(calledUrl, 'http://localhost:8911/__mock__/scopes');
        assert.strictEqual(calledOptions.method, 'POST');
        assert.deepStrictEqual(JSON.parse(calledOptions.body), { name: 'test-scope' });
    });

    test('createStub calls correct endpoint with scope header', async () => {
        let calledUrl = '';
        let calledOptions: any = {};

        global.fetch = (async (url: string, options: any) => {
            calledUrl = url;
            calledOptions = options;
            return { ok: true, status: 200, text: async () => 'ok' };
        }) as any;

        const client = new MockApiClient();
        const payload = { request: { path: '/test' }, action: { response: { status_code: 200 } } };
        await client.createStub(payload, 'test-scope');

        assert.strictEqual(calledUrl, 'http://localhost:8911/__mock__/stubs');
        assert.strictEqual(calledOptions.method, 'POST');
        assert.strictEqual(calledOptions.headers['test-scope'], '1');
        assert.deepStrictEqual(JSON.parse(calledOptions.body), payload);
    });
});
