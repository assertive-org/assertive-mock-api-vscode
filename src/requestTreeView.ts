import * as vscode from 'vscode';
import { MockApiClient, MockRequest } from './api';

export class RequestDataProvider implements vscode.TreeDataProvider<RequestTreeItem | RequestScopeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RequestTreeItem | RequestScopeTreeItem | undefined | null | void> = new vscode.EventEmitter<RequestTreeItem | RequestScopeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RequestTreeItem | RequestScopeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private _filter: 'all' | 'matched' | 'unmatched' = 'all';

    constructor(private apiClient: MockApiClient) {
    }

    get filter(): 'all' | 'matched' | 'unmatched' {
        return this._filter;
    }

    set filter(value: 'all' | 'matched' | 'unmatched') {
        this._filter = value;
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: RequestTreeItem | RequestScopeTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: RequestTreeItem | RequestScopeTreeItem): Promise<(RequestTreeItem | RequestScopeTreeItem)[]> {
        if (!element) {
            try {
                const scopes = await this.apiClient.getScopes();
                const allScopes = [null, ...scopes];

                const results = await Promise.all(allScopes.map(async scope => {
                    const requests = await this.apiClient.getRequests(scope);
                    // Filter to only include requests that MATCH this scope exactly
                    // (Server returns global + scoped when scope is requested)
                    let filteredRequests = requests.filter(r => r.scope === scope);

                    if (this._filter === 'matched') {
                        filteredRequests = filteredRequests.filter(r => r.matched_stub_id !== null);
                    } else if (this._filter === 'unmatched') {
                        filteredRequests = filteredRequests.filter(r => r.matched_stub_id === null);
                    }

                    if (filteredRequests.length === 0) {
                        return null;
                    }
                    // Filter and reverse for newest-first within scope
                    return new RequestScopeTreeItem(scope, filteredRequests.reverse());
                }));

                return results.filter((item): item is RequestScopeTreeItem => item !== null);
            } catch (error) {
                return [];
            }
        } else if (element instanceof RequestScopeTreeItem) {
            return element.requests.map(req => new RequestTreeItem(req));
        }

        return [];
    }
}

export class RequestScopeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly scope: string | null,
        public readonly requests: MockRequest[]
    ) {
        super(scope === null ? 'Global' : scope, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'scope';
        this.iconPath = new vscode.ThemeIcon('symbol-namespace');
    }
}

export class RequestTreeItem extends vscode.TreeItem {
    constructor(
        public readonly request: MockRequest
    ) {
        super(`${request.method.toUpperCase()} ${request.path}`, vscode.TreeItemCollapsibleState.None);
        
        this.description = request.matched_stub_id ? `Matched: ${request.matched_stub_id}` : 'No Match';
        this.tooltip = JSON.stringify(request, null, 2);
        this.contextValue = 'request';
        this.iconPath = request.matched_stub_id 
            ? new vscode.ThemeIcon('check', new vscode.ThemeColor('debugIcon.startForeground'))
            : new vscode.ThemeIcon('warning', new vscode.ThemeColor('debugIcon.stopForeground'));

        this.command = {
            command: 'assertive-mock-api-vscode.viewRequestDetails',
            title: 'View Request Details',
            arguments: [request]
        };
    }
}
