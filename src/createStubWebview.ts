import * as vscode from 'vscode';
import { MockApiClient } from './api';

export class CreateStubWebview {
    public static currentPanel: CreateStubWebview | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, private apiClient: MockApiClient) {
        this._panel = panel;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'createStub':
                        try {
                            const { scope, payload, isNewScope } = message.data;
                            
                            if (isNewScope && scope) {
                                await this.apiClient.createScope(scope);
                            }

                            const actualScope = scope === 'Global' ? null : scope;
                            await this.apiClient.createStub(payload, actualScope);
                            
                            vscode.window.showInformationMessage(`Stub created successfully${actualScope ? ` in ${actualScope} scope` : ''}.`);
                            vscode.commands.executeCommand('assertive-mock-api-vscode.refreshAll');
                            this._panel.dispose();
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to create stub: ${error}`);
                        }
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static async createOrShow(extensionUri: vscode.Uri, apiClient: MockApiClient) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (CreateStubWebview.currentPanel) {
            CreateStubWebview.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'createStub',
            'Create Mock Stub',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        CreateStubWebview.currentPanel = new CreateStubWebview(panel, apiClient);
    }

    public dispose() {
        CreateStubWebview.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update() {
        this._panel.webview.html = await this._getHtmlForWebview();
    }

    private async _getHtmlForWebview() {
        let scopes: string[] = [];
        try {
            scopes = await this.apiClient.getScopes();
        } catch (e) {
            console.error('Failed to fetch scopes for webview', e);
        }

        const scopeOptions = ['Global', ...scopes].map(s => `<option value="${s}">${s}</option>`).join('');

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Create Mock Stub</title>
                <style>
                    :root {
                        --spacing: 12px;
                    }
                    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 20px; line-height: 1.4; }
                    h2 { margin-top: 0; border-bottom: 1px solid var(--vscode-settings-headerBorder); padding-bottom: 8px; }
                    .step { display: none; }
                    .step.active { display: block; }
                    .form-group { margin-bottom: var(--spacing); }
                    label { display: block; font-weight: bold; margin-bottom: 4px; font-size: 0.9em; }
                    .hint { font-size: 0.8em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
                    input, select, textarea { 
                        width: 100%; 
                        padding: 6px 8px; 
                        box-sizing: border-box; 
                        background: var(--vscode-input-background); 
                        color: var(--vscode-input-foreground); 
                        border: 1px solid var(--vscode-input-border);
                        font-family: inherit;
                        border-radius: 2px;
                    }
                    input:focus, select:focus, textarea:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
                    textarea { min-height: 60px; resize: vertical; font-family: var(--vscode-editor-font-family); }
                    .actions { display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px solid var(--vscode-settings-headerBorder); padding-top: 16px; }
                    button { 
                        background: var(--vscode-button-background); 
                        color: var(--vscode-button-foreground); 
                        border: none; 
                        padding: 6px 14px; 
                        cursor: pointer; 
                        border-radius: 2px;
                    }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
                    button:disabled { opacity: 0.5; cursor: not-allowed; }
                    .row { display: flex; gap: var(--spacing); }
                    .row > div { flex: 1; }
                    .error { color: var(--vscode-errorForeground); font-size: 0.85em; margin-top: 2px; display: none; }
                    pre { background: var(--vscode-textCodeBlock-background); padding: 10px; overflow: auto; border-radius: 3px; font-size: 0.9em; max-height: 300px; }
                    .stepper { display: flex; gap: 8px; margin-bottom: 20px; }
                    .step-indicator { flex: 1; height: 4px; background: var(--vscode-widget-border); border-radius: 2px; }
                    .step-indicator.active { background: var(--vscode-progressBar-background); }
                    .tab-container { display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid var(--vscode-settings-headerBorder); }
                    .tab { padding: 4px 12px; cursor: pointer; font-size: 0.85em; border-bottom: 2px solid transparent; margin-bottom: -1px; }
                    .tab.active { border-bottom-color: var(--vscode-focusBorder); font-weight: bold; }
                    .helper-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
                    .chip { font-size: 0.75em; padding: 2px 6px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; cursor: pointer; }
                    .chip:hover { filter: brightness(1.2); }
                </style>
            </head>
            <body>
                <div class="stepper">
                    <div class="step-indicator active" id="ind-0"></div>
                    <div class="step-indicator" id="ind-1"></div>
                    <div class="step-indicator" id="ind-2"></div>
                    <div class="step-indicator" id="ind-3"></div>
                </div>

                <form id="stubForm">
                    <!-- STEP 1: Request Match -->
                    <section class="step active" id="step-0">
                        <h2>1. Request Match</h2>
                        <div class="row">
                            <div class="form-group">
                                <label for="scope">Scope</label>
                                <select id="scope">
                                    ${scopeOptions}
                                    <option value="NEW">-- Create New Scope --</option>
                                </select>
                                <input type="text" id="newScope" placeholder="Enter scope name..." style="display:none; margin-top:4px;">
                            </div>
                            <div class="form-group">
                                <label for="maxCalls">Max Calls</label>
                                <input type="number" id="maxCalls" placeholder="Infinite" min="1">
                            </div>
                        </div>

                        <div class="row">
                            <div class="form-group" style="flex: 0 0 100px;">
                                <label for="method">Method</label>
                                <select id="method">
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                    <option value="PATCH">PATCH</option>
                                    <option value="ANY">ANY</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="path">Path Matcher</label>
                                <input type="text" id="path" placeholder="/api/v1/users/{id}" required>
                                <div class="hint">Supports {id} parameters or regex if wrapped in {"$regex":...}</div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="host">Host Matcher (Optional)</label>
                            <input type="text" id="host" placeholder="localhost">
                        </div>

                        <div class="form-group">
                            <label for="reqHeaders">Request Headers (Optional)</label>
                            <textarea id="reqHeaders" placeholder="Content-Type: application/json&#10;Authorization: Bearer .*"></textarea>
                            <div class="hint">Key: Value (one per line). Values can be JSON criteria.</div>
                        </div>

                        <div class="form-group">
                            <label for="reqQuery">Query Params (Optional)</label>
                            <textarea id="reqQuery" placeholder="search=term&#10;limit=10"></textarea>
                            <div class="hint">key=value (one per line).</div>
                        </div>

                        <div class="form-group">
                            <label for="reqBody">Request Body Matcher (Optional)</label>
                            <textarea id="reqBody" placeholder='e.g. { "id": 123 } or { "$json": { "inner_criteria": { "active": true } } }'></textarea>
                            <div id="req-body-error" class="error">Invalid JSON criteria</div>
                        </div>
                    </section>

                    <!-- STEP 2: Action Type -->
                    <section class="step" id="step-1">
                        <h2>2. Action Type</h2>
                        <div class="form-group">
                            <label>How should the mock respond?</label>
                            <div class="tab-container">
                                <div class="tab active" data-action="response">Response</div>
                                <div class="tab" data-action="proxy">Proxy</div>
                                <div class="tab" data-action="sse">SSE</div>
                            </div>
                            <input type="hidden" id="actionType" value="response">
                        </div>

                        <div id="action-details">
                            <!-- Response Sub-form -->
                            <div id="action-response">
                                <div class="row">
                                    <div class="form-group">
                                        <label for="resStatus">Status Code</label>
                                        <input type="number" id="resStatus" value="200">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="resHeaders">Response Headers</label>
                                    <textarea id="resHeaders" placeholder="Content-Type: application/json"></textarea>
                                    <div class="helper-chips">
                                        <span class="chip" data-target="resHeaders" data-val="Content-Type: application/json">JSON</span>
                                        <span class="chip" data-target="resHeaders" data-val="Content-Type: text/plain">Text</span>
                                        <span class="chip" data-target="resHeaders" data-val="Access-Control-Allow-Origin: *">CORS</span>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <div class="tab-container">
                                        <div class="tab active" data-body-type="static">Static Body</div>
                                        <div class="tab" data-body-type="template">Template Body</div>
                                    </div>
                                    <input type="hidden" id="bodyType" value="static">
                                    <textarea id="resBody" placeholder="Response body content..."></textarea>
                                    <div class="hint" id="body-hint">Static content. Parses as JSON if valid.</div>
                                    <div id="res-body-error" class="error">Invalid JSON</div>
                                </div>
                            </div>

                            <!-- Proxy Sub-form -->
                            <div id="action-proxy" style="display:none;">
                                <div class="form-group">
                                    <label for="proxyUrl">Proxy URL</label>
                                    <input type="text" id="proxyUrl" placeholder="https://api.actual-service.com">
                                </div>
                                <div class="form-group">
                                    <label for="proxyHeaders">Override Headers</label>
                                    <textarea id="proxyHeaders" placeholder="Authorization: Bearer dev-token"></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="proxyTimeout">Timeout (seconds)</label>
                                    <input type="number" id="proxyTimeout" value="5" min="1">
                                </div>
                            </div>

                            <!-- SSE Sub-form -->
                            <div id="action-sse" style="display:none;">
                                <div class="form-group">
                                    <label for="sseDelay">Default Event Delay (ms)</label>
                                    <input type="number" id="sseDelay" value="0" min="0">
                                </div>
                                <div class="form-group">
                                    <label for="sseEvents">Events</label>
                                    <textarea id="sseEvents" placeholder="event: update; data: processing&#10;event: update; data: finished; delay_ms: 1000"></textarea>
                                    <div class="hint">key: value; key: value (one event per line). Keys: id, event, data, retry, delay_ms.</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- STEP 3: Chaos -->
                    <section class="step" id="step-2">
                        <h2>3. Chaos & Latency</h2>
                        <div class="row">
                            <div class="form-group">
                                <label for="chaosBase">Base Delay (ms)</label>
                                <input type="number" id="chaosBase" value="0" min="0">
                            </div>
                            <div class="form-group">
                                <label for="chaosJitter">Jitter (ms)</label>
                                <input type="number" id="chaosJitter" value="0" min="0">
                            </div>
                        </div>
                        <div class="hint">Simulates network latency. Actual delay is sampled from [base, base + jitter].</div>
                    </section>

                    <!-- STEP 4: Review -->
                    <section class="step" id="step-3">
                        <h2>4. Review JSON</h2>
                        <pre id="payload-preview"></pre>
                    </section>

                    <div class="actions">
                        <button type="button" class="secondary" id="prevBtn" style="visibility:hidden;">Back</button>
                        <button type="button" id="nextBtn">Next</button>
                        <button type="submit" id="submitBtn" style="display:none;">Create Stub</button>
                    </div>
                </form>

                <script>
                    const vscode = acquireVsCodeApi();
                    let currentStep = 0;
                    const totalSteps = 4;

                    // Form Elements
                    const form = document.getElementById('stubForm');
                    const nextBtn = document.getElementById('nextBtn');
                    const prevBtn = document.getElementById('prevBtn');
                    const submitBtn = document.getElementById('submitBtn');
                    const scopeSelect = document.getElementById('scope');
                    const newScopeInput = document.getElementById('newScope');
                    const actionTypeInput = document.getElementById('actionType');
                    const bodyTypeInput = document.getElementById('bodyType');

                    // Tab Logic
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.addEventListener('click', () => {
                            const group = tab.parentElement;
                            group.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                            tab.classList.add('active');

                            if (tab.dataset.action) {
                                actionTypeInput.value = tab.dataset.action;
                                document.getElementById('action-response').style.display = tab.dataset.action === 'response' ? 'block' : 'none';
                                document.getElementById('action-proxy').style.display = tab.dataset.action === 'proxy' ? 'block' : 'none';
                                document.getElementById('action-sse').style.display = tab.dataset.action === 'sse' ? 'block' : 'none';
                            }

                            if (tab.dataset.bodyType) {
                                bodyTypeInput.value = tab.dataset.bodyType;
                                document.getElementById('body-hint').textContent = tab.dataset.bodyType === 'static' 
                                    ? 'Static content. Parses as JSON if valid.' 
                                    : 'Jinja2 template. Access request fields via {{ request.path }}, etc.';
                            }
                        });
                    });

                    // Chip Logic
                    document.querySelectorAll('.chip').forEach(chip => {
                        chip.addEventListener('click', () => {
                            const target = document.getElementById(chip.dataset.target);
                            const val = chip.dataset.val;
                            if (target.value && !target.value.endsWith('\\n')) target.value += '\\n';
                            target.value += val;
                        });
                    });

                    scopeSelect.addEventListener('change', () => {
                        newScopeInput.style.display = scopeSelect.value === 'NEW' ? 'block' : 'none';
                    });

                    function showStep(step) {
                        document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i === step));
                        document.querySelectorAll('.step-indicator').forEach((s, i) => s.classList.toggle('active', i <= step));
                        
                        prevBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
                        nextBtn.style.display = step === totalSteps - 1 ? 'none' : 'block';
                        submitBtn.style.display = step === totalSteps - 1 ? 'block' : 'none';

                        if (step === 3) {
                            try {
                                document.getElementById('payload-preview').textContent = JSON.stringify(buildPayload(), null, 2);
                            } catch (e) {
                                document.getElementById('payload-preview').textContent = 'Error building payload: ' + e.message;
                            }
                        }
                    }

                    nextBtn.addEventListener('click', () => {
                        if (currentStep < totalSteps - 1) {
                            currentStep++;
                            showStep(currentStep);
                        }
                    });

                    prevBtn.addEventListener('click', () => {
                        if (currentStep > 0) {
                            currentStep--;
                            showStep(currentStep);
                        }
                    });

                    function parseMaybeJson(rawValue) {
                        const value = rawValue.trim();
                        if (!value) {
                            return "";
                        }
                        const first = value[0];
                        const mightBeJson = first === "{" || first === "[" || first === '"' || /^-?\\d/.test(first) || value === "true" || value === "false" || value === "null";
                        if (!mightBeJson) {
                            return value;
                        }
                        try {
                            return JSON.parse(value);
                        } catch (_) {
                            return value;
                        }
                    }

                    function maybeAssign(obj, key, value) {
                        if (value === null || value === undefined || value === "") {
                            return;
                        }
                        obj[key] = value;
                    }

                    function parseKeyValueLines(text, delimiter = ':') {
                        const result = {};
                        if (!text) return result;
                        text.split('\\n').forEach(line => {
                            const idx = line.indexOf(delimiter);
                            if (idx > -1) {
                                const key = line.substring(0, idx).trim();
                                let val = line.substring(idx + 1).trim();
                                val = parseMaybeJson(val);
                                if (key) result[key] = val;
                            }
                        });
                        return result;
                    }

                    function parseSseEvents(text) {
                        if (!text) return [];
                        return text.split('\\n').map(line => {
                            const event = {};
                            line.split(';').forEach(part => {
                                const [key, ...rest] = part.split(':');
                                if (key && rest.length) {
                                    const k = key.trim();
                                    let v = rest.join(':').trim();
                                    if (k === 'retry' || k === 'delay_ms') v = parseInt(v);
                                    event[k] = v;
                                }
                            });
                            return event;
                        }).filter(e => Object.keys(e).length > 0);
                    }

                    function buildPayload() {
                        const methodVal = document.getElementById('method').value;
                        const pathVal = document.getElementById('path').value.trim();
                        const hostVal = document.getElementById('host').value.trim();
                        const reqHeaders = parseKeyValueLines(document.getElementById('reqHeaders').value);
                        const reqQuery = parseKeyValueLines(document.getElementById('reqQuery').value, '=');
                        const reqBodyRaw = document.getElementById('reqBody').value.trim();

                        const request = {};
                        maybeAssign(request, 'method', methodVal === 'ANY' ? null : methodVal);
                        maybeAssign(request, 'path', parseMaybeJson(pathVal));
                        maybeAssign(request, 'host', hostVal);
                        if (Object.keys(reqHeaders).length) request.headers = reqHeaders;
                        if (Object.keys(reqQuery).length) request.query = reqQuery;
                        maybeAssign(request, 'body', parseMaybeJson(reqBodyRaw));

                        const payload = {
                            request: request,
                            action: {}
                        };

                        const maxCalls = parseInt(document.getElementById('maxCalls').value);
                        if (!isNaN(maxCalls)) payload.max_calls = maxCalls;

                        // Action
                        const type = actionTypeInput.value;
                        if (type === 'response') {
                            const res = {
                                status_code: parseInt(document.getElementById('resStatus').value) || 200,
                                headers: parseKeyValueLines(document.getElementById('resHeaders').value)
                            };
                            const bodyVal = document.getElementById('resBody').value.trim();
                            if (bodyTypeInput.value === 'template') {
                                res.template_body = bodyVal;
                            } else {
                                res.body = parseMaybeJson(bodyVal);
                            }
                            payload.action.response = res;
                        } else if (type === 'proxy') {
                            payload.action.proxy = {
                                url: document.getElementById('proxyUrl').value.trim(),
                                headers: parseKeyValueLines(document.getElementById('proxyHeaders').value),
                                timeout: parseInt(document.getElementById('proxyTimeout').value) || 5
                            };
                        } else if (type === 'sse') {
                            payload.action.sse = {
                                default_delay_ms: parseInt(document.getElementById('sseDelay').value) || 0,
                                events: parseSseEvents(document.getElementById('sseEvents').value)
                            };
                        }

                        // Chaos
                        const base = parseInt(document.getElementById('chaosBase').value) || 0;
                        const jitter = parseInt(document.getElementById('chaosJitter').value) || 0;
                        if (base > 0 || jitter > 0) {
                            payload.chaos = { latency: { base_ms: base, jitter_ms: jitter } };
                        }

                        return payload;
                    }

                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const isNewScope = scopeSelect.value === 'NEW';
                        const scopeValue = isNewScope ? newScopeInput.value.trim() : scopeSelect.value;

                        if (isNewScope && !scopeValue) {
                            alert('Please enter a scope name');
                            return;
                        }

                        vscode.postMessage({
                            command: 'createStub',
                            data: {
                                scope: scopeValue,
                                isNewScope: isNewScope,
                                payload: buildPayload()
                            }
                        });
                    });
                </script>
            </body>
            </html>`;
    }
}
