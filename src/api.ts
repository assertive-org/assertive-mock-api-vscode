export interface Stub {
    stub_id: string;
    request: any;
    action: any;
    scope: string | null;
}

export interface MockRequest {
    method: string;
    path: string;
    query: any;
    headers: any;
    body: any;
    host: string;
    scope: string | null;
    matched_stub_id: string | null;
}

export interface StubsResponse {
    stubs: Stub[];
}

export interface RequestsResponse {
    requests: MockRequest[];
}

export interface ScopesResponse {
    scopes: string[];
}

export class MockApiClient {
    private _baseUrl = 'http://localhost:8911';

    setPort(port: number) {
        this._baseUrl = `http://localhost:${port}`;
    }

    get baseUrl(): string {
        return this._baseUrl;
    }

    async getStubs(scope?: string | null): Promise<Stub[]> {
        const headers: Record<string, string> = {};
        if (scope) {
            headers[scope] = '1';
        }
        const response = await fetch(`${this.baseUrl}/__mock__/stubs`, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch stubs: ${response.statusText}`);
        }
        const data = await response.json() as StubsResponse;
        return data.stubs;
    }

    async getRequests(scope?: string | null): Promise<MockRequest[]> {
        const headers: Record<string, string> = {};
        if (scope) {
            headers[scope] = '1';
        }
        const response = await fetch(`${this.baseUrl}/__mock__/requests`, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch requests: ${response.statusText}`);
        }
        const data = await response.json() as RequestsResponse;
        return data.requests;
    }

    async getScopes(): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/__mock__/scopes`);
        if (!response.ok) {
            throw new Error(`Failed to fetch scopes: ${response.statusText}`);
        }
        const data = await response.json() as ScopesResponse;
        return data.scopes;
    }

    async createScope(name: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/__mock__/scopes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok && response.status !== 409) {
            throw new Error(`Failed to create scope ${name}: ${response.statusText}`);
        }
    }

    async deleteScope(name: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/__mock__/scopes/${name}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to delete scope ${name}: ${response.statusText}`);
        }
    }

    async deleteStub(stubId: string, scope?: string | null): Promise<void> {
        const headers: Record<string, string> = {};
        if (scope) {
            headers[scope] = '1';
        }
        const response = await fetch(`${this.baseUrl}/__mock__/stubs/${stubId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) {
            throw new Error(`Failed to delete stub ${stubId}: ${response.statusText}`);
        }
    }

    async createStub(payload: any, scope?: string | null): Promise<void> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (scope) {
            headers[scope] = '1';
        }
        const response = await fetch(`${this.baseUrl}/__mock__/stubs`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to create stub: ${response.status} ${response.statusText} - ${text}`);
        }
    }
}
