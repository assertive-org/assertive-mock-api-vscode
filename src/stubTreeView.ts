import * as vscode from 'vscode';
import { MockApiClient, Stub } from './api';

export class StubDataProvider implements vscode.TreeDataProvider<StubTreeItem | StubScopeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StubTreeItem | StubScopeTreeItem | undefined | null | void> = new vscode.EventEmitter<StubTreeItem | StubScopeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StubTreeItem | StubScopeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private apiClient: MockApiClient) {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StubTreeItem | StubScopeTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: StubTreeItem | StubScopeTreeItem): Promise<(StubTreeItem | StubScopeTreeItem)[]> {
        if (!element) {
            // Root level: fetch all scopes and then stubs for each
            try {
                const scopes = await this.apiClient.getScopes();
                const allScopes = [null, ...scopes]; // null for Global
                
                const results = await Promise.all(allScopes.map(async scope => {
                    const stubs = await this.apiClient.getStubs(scope);
                    // Filter to only include stubs that MATCH this scope exactly
                    const filteredStubs = stubs.filter(s => s.scope === scope);

                    if (filteredStubs.length === 0) {
                        return null; 
                    }
                    return new StubScopeTreeItem(scope, filteredStubs);
                }));

                return results.filter((item): item is StubScopeTreeItem => item !== null);
            } catch (error) {
                return [];
            }
        } else if (element instanceof StubScopeTreeItem) {
            // Return stubs within this scope
            return element.stubs.map(stub => new StubTreeItem(stub));
        }

        return [];
    }
}

export class StubScopeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly scope: string | null,
        public readonly stubs: Stub[]
    ) {
        super(scope === null ? 'Global' : scope, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'scope';
        this.iconPath = new vscode.ThemeIcon('symbol-namespace');
    }
}

export class StubTreeItem extends vscode.TreeItem {
    constructor(
        public readonly stub: Stub
    ) {
        const method = formatMatcher(stub.request.method)?.toUpperCase() || 'ANY';
        const path = formatMatcher(stub.request.path) || '/';
        
        super(`${method} ${path}`, vscode.TreeItemCollapsibleState.None);
        
        this.description = stub.stub_id;
        this.tooltip = `ID: ${stub.stub_id}\n\n${JSON.stringify(stub, null, 2)}`;
        this.contextValue = 'stub';
        this.iconPath = new vscode.ThemeIcon('symbol-method');

        this.command = {
            command: 'assertive-mock-api-vscode.viewStubDetails',
            title: 'View Stub Details',
            arguments: [stub]
        };
    }
}

function formatMatcher(matcher: any): string | undefined {
    if (!matcher) {
        return undefined;
    }
    if (typeof matcher === 'string') {
        return matcher;
    }
    if (typeof matcher === 'object') {
        const keys = Object.keys(matcher);
        if (keys.length === 1 && keys[0].startsWith('$')) {
            const op = keys[0];
            const val = matcher[op];
            
            // Handle specific operators with object payloads
            if (op === '$regex' && typeof val === 'object' && val.pattern) {
                return `$regex(${val.pattern})`;
            }
            if (op === '$json' && typeof val === 'object' && val.inner_criteria) {
                return `$json(...)`; // Keep it short for paths
            }

            return `${op}(${typeof val === 'object' ? JSON.stringify(val) : val})`;
        }
    }
    return JSON.stringify(matcher);
}
