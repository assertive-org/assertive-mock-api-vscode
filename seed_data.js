const BASE_URL = 'http://localhost:8911';

async function createStub(payload, scope = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (scope) {
        headers[scope] = '1';
    }
    const resp = await fetch(`${BASE_URL}/__mock__/stubs`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to create stub: ${resp.status} ${resp.statusText} - ${text}`);
    }
    return await resp.json();
}

async function createScope(name) {
    const resp = await fetch(`${BASE_URL}/__mock__/scopes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!resp.ok && resp.status !== 409) throw new Error(`Failed to create scope: ${resp.statusText}`);
}

async function makeRequest(path, method = 'GET', body = null, headers = {}) {
    console.log(`Making request: ${method} ${path}...`);
    try {
        await fetch(`${BASE_URL}${path}`, {
            method: method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: body ? JSON.stringify(body) : null,
            signal: AbortSignal.timeout(1000)
        });
    } catch (e) {
        console.log(`Request to ${path} finished.`);
    }
}

async function main() {
    console.log("Setting up stubs...");

    // 1. Global GET stub (literal path)
    await createStub({
        request: { method: 'GET', path: '/api/users' },
        action: { response: { status_code: 200, headers: {}, body: [{ id: 1, name: 'Alice' }] } }
    });

    // 2. Global POST stub (JSON body matching)
    await createStub({
        request: {
            method: 'POST',
            path: '/api/users',
            body: { "$json": { "inner_criteria": { "name": "Charlie" } } }
        },
        action: { response: { status_code: 201, headers: {}, body: { id: 3, name: 'Charlie' } } }
    });

    // 3. Regex path stub
    await createStub({
        request: {
            method: 'GET',
            path: { "$regex": { "pattern": "^/api/v1/.*" } }
        },
        action: { response: { status_code: 200, headers: {}, body: "Regex match!" } }
    });

    // 4. Global Slow stub
    await createStub({
        request: { method: 'GET', path: '/api/slow' },
        action: { response: { status_code: 200, headers: {}, body: "Slow response" } },
        chaos: { latency: { base_ms: 2000, jitter_ms: 0 } }
    });

    // 5. Scoped stub
    await createScope('dev-team');
    await createStub({
        request: { method: 'GET', path: '/api/config' },
        action: { response: { status_code: 200, headers: {}, body: { env: 'dev' } } }
    }, 'dev-team');

    console.log("Generating request log...");

    await makeRequest('/api/users', 'GET');
    await makeRequest('/api/users', 'POST', { name: 'Charlie' });
    await makeRequest('/api/v1/test', 'GET');
    await makeRequest('/api/config', 'GET', null, { 'dev-team': '1' });

    // Failures
    await makeRequest('/api/users', 'POST', { name: 'Dave' });
    await makeRequest('/api/not-found', 'GET');
    await makeRequest('/api/config', 'GET');
    await makeRequest('/api/slow', 'GET');

    console.log("Done! Check your VS Code views.");
}

main().catch(console.error);
