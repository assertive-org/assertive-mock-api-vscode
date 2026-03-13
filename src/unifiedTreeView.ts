import * as vscode from 'vscode';
import { MockApiClient } from './api';
import { StubDataProvider, StubScopeTreeItem, StubTreeItem } from './stubTreeView';
import { RequestDataProvider, RequestScopeTreeItem, RequestTreeItem } from './requestTreeView';

export type UnifiedElement = TopLevelItem | StubScopeTreeItem | RequestScopeTreeItem | StubTreeItem | RequestTreeItem | vscode.TreeItem;

export class UnifiedDataProvider implements vscode.TreeDataProvider<UnifiedElement> {
    private _onDidChangeTreeData: vscode.EventEmitter<UnifiedElement | undefined | null | void> = new vscode.EventEmitter<UnifiedElement | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<UnifiedElement | undefined | null | void> = this._onDidChangeTreeData.event;

    private _onDidAutoDisablePolling: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidAutoDisablePolling: vscode.Event<void> = this._onDidAutoDisablePolling.event;

    public readonly stubProvider: StubDataProvider;
    public readonly requestProvider: RequestDataProvider;

    private pollingTimeout: NodeJS.Timeout | undefined;
    private consecutiveFailures = 0;
    private maxFailures = 5;
    private currentBaseInterval = 3000;
    private _hasStubs = true;
    private _initialLoadComplete = false;

    constructor(private apiClient: MockApiClient) {
        this.stubProvider = new StubDataProvider(apiClient);
        this.requestProvider = new RequestDataProvider(apiClient);

        // Bubble up refreshes from sub-providers
        this.stubProvider.onDidChangeTreeData(() => this.refresh());
        this.requestProvider.onDidChangeTreeData(() => this.refresh());
    }

    refresh(): void {
        this.updateHasStubsContext();
        this._onDidChangeTreeData.fire(undefined);
    }

    private async updateHasStubsContext() {
        try {
            const stubs = await this.apiClient.getStubs();
            this._hasStubs = stubs.length > 0;
            this._initialLoadComplete = true;
            vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.hasStubs', this._hasStubs);
        } catch (e) {
            this._hasStubs = false;
            this._initialLoadComplete = true;
            vscode.commands.executeCommand('setContext', 'assertive-mock-api-vscode.hasStubs', false);
        }
    }

    startPolling(intervalMs: number): void {
        this.currentBaseInterval = intervalMs;
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout);
        }
        this.runPoll();
    }

    stopPolling(): void {
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout);
            this.pollingTimeout = undefined;
        }
        this.consecutiveFailures = 0;
    }

    private async runPoll() {
        try {
            // Health check
            await this.apiClient.getScopes();
            
            // Success
            this.consecutiveFailures = 0;
            this.refresh();
            
            this.pollingTimeout = setTimeout(() => this.runPoll(), this.currentBaseInterval);
        } catch (error) {
            this.consecutiveFailures++;
            
            if (this.consecutiveFailures >= this.maxFailures) {
                this.stopPolling();
                this._onDidAutoDisablePolling.fire();
                
                vscode.window.showErrorMessage(
                    `Assertive Mock API: Connection failed after ${this.maxFailures} attempts. Polling disabled.`,
                    'Retry',
                    'Check Settings'
                ).then(selection => {
                    if (selection === 'Retry') {
                        vscode.commands.executeCommand('assertive-mock-api-vscode.startPolling');
                    } else if (selection === 'Check Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'assertive-mock-api-vscode.port');
                    }
                });
                return;
            }

            // Exponential backoff: base * 2^failures
            const backoffDelay = this.currentBaseInterval * Math.pow(2, this.consecutiveFailures);
            console.log(`[Assertive Mock API] Polling failed, retrying in ${backoffDelay}ms (attempt ${this.consecutiveFailures}/${this.maxFailures})`);
            
            this.pollingTimeout = setTimeout(() => this.runPoll(), backoffDelay);
        }
    }

    getTreeItem(element: UnifiedElement): vscode.TreeItem {
        if (element instanceof TopLevelItem) {
            return element;
        }
        if (element instanceof StubScopeTreeItem || element instanceof StubTreeItem) {
             return this.stubProvider.getTreeItem(element);
        }
        if (element instanceof vscode.TreeItem) {
            return element;
        }
        return this.requestProvider.getTreeItem(element);
    }

    async getChildren(element?: UnifiedElement): Promise<UnifiedElement[]> {
        if (!this._initialLoadComplete) {
            return [new vscode.TreeItem('Connecting to Mock API...')];
        }

        if (!this._hasStubs) {
            return [];
        }

        if (!element) {
            return [
                new TopLevelItem('Stubs', 'stubs', vscode.TreeItemCollapsibleState.Expanded, new vscode.ThemeIcon('symbol-method')),
                new TopLevelItem('Requests', 'requests', vscode.TreeItemCollapsibleState.Expanded, new vscode.ThemeIcon('list-unordered'))
            ];
        }

        if (element instanceof TopLevelItem) {
            if (element.id === 'stubs') {
                return this.stubProvider.getChildren();
            } else {
                return this.requestProvider.getChildren();
            }
        }

        if (element instanceof StubScopeTreeItem || element instanceof StubTreeItem) {
            return this.stubProvider.getChildren(element as any);
        }
        
        return this.requestProvider.getChildren(element as any);
    }
}

class TopLevelItem extends vscode.TreeItem {
    constructor(
        public override readonly label: string,
        public override readonly id: string,
        public override readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public override readonly iconPath?: vscode.ThemeIcon
    ) {
        super(label, collapsibleState);
        this.contextValue = id;
    }
}
