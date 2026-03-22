import * as vscode from 'vscode';
import { LLMClient } from '../llm/LLMClient';
import { AuthManager } from '../auth/AuthManager';
import { StatusBarManager } from './StatusBarManager';

let currentPanel: vscode.WebviewPanel | undefined;
let isProcessing: boolean = false;
let statusBarMgr: StatusBarManager;

export function setStatusBarManager(mgr: StatusBarManager) {
    statusBarMgr = mgr;
}

export function createWebviewPanel(
    context: vscode.ExtensionContext,
    llmClient: LLMClient,
    authManager: AuthManager,
    statusBarManager: StatusBarManager
): vscode.WebviewPanel {
    statusBarMgr = statusBarManager;

    if (currentPanel) {
        currentPanel.reveal();
        return currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
        'codingMaster',
        'Coding Master',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri]
        }
    );

    currentPanel = panel;
    panel.webview.html = getHtml();

    panel.webview.onDidReceiveMessage(async (message) => {
        console.log('Received message from webview:', message);
        await handleMessage(message, panel, llmClient, authManager, statusBarManager);
    });

    panel.onDidDispose(() => {
        currentPanel = undefined;
    });

    // 发送 providers 数据给前端
    setTimeout(() => {
        panel.webview.postMessage({
            type: 'initProviders',
            providers: authManager.providers
        });
        checkAuth(panel, authManager, llmClient);
    }, 100);

    return panel;
}

async function handleMessage(
    message: any,
    panel: vscode.WebviewPanel,
    llmClient: LLMClient,
    authManager: AuthManager,
    statusBarManager: StatusBarManager
) {
    switch (message.type) {
        case 'checkAuth':
            await checkAuth(panel, authManager, llmClient);
            break;
        case 'setApiKey':
            await setApiKey(message.value, panel, authManager, llmClient);
            break;
        case 'switchProvider':
            await switchProvider(message.provider, panel, authManager, llmClient, statusBarManager, message.apiKey);
            break;
        case 'switchModel':
            await switchModel(message.model, panel, authManager, llmClient, statusBarManager);
            break;
        case 'setBaseUrl':
            await setBaseUrl(message.baseUrl, panel, authManager);
            break;
        case 'optimizeCode':
            await optimizeCode(message.code, message.language, message.instruction, panel, llmClient, authManager);
            break;
        case 'explainCode':
            await explainCode(message.code, message.language, panel, llmClient, authManager);
            break;
        case 'generateTests':
            await generateTests(message.code, message.language, panel, llmClient, authManager);
            break;
        case 'generateCode':
            await generateCodeFromRequirement(message.requirement, panel, llmClient, authManager);
            break;
        case 'copyToClipboard':
            await vscode.env.clipboard.writeText(message.content);
            vscode.window.showInformationMessage('已复制到剪贴板');
            break;
        case 'insertToEditor':
            await insertToEditor(message.content);
            break;
        case 'getSelectedCode':
            await getSelectedCode(panel);
            break;
    }
}

async function checkAuth(panel: vscode.WebviewPanel, authManager: AuthManager, llmClient: LLMClient) {
    const hasApiKey = authManager.hasApiKey();
    const provider = authManager.getProvider();
    const model = authManager.getModel();
    const providerInfo = authManager.getCurrentProvider();

    panel.webview.postMessage({
        type: 'authStatus',
        hasApiKey,
        provider,
        model,
        modelName: authManager.getModelDisplayName(model),
        currentModels: providerInfo?.models || [],
        baseUrl: authManager.getBaseUrl(),
        providerName: providerInfo?.name || provider
    });
}

async function setApiKey(apiKey: string, panel: vscode.WebviewPanel, authManager: AuthManager, llmClient: LLMClient) {
    try {
        await authManager.setApiKey(apiKey);
        panel.webview.postMessage({ type: 'apiKeySet', success: true });
        vscode.window.showInformationMessage('API Key 设置成功');
    } catch (error: any) {
        panel.webview.postMessage({ type: 'apiKeySet', success: false, error: error.message });
    }
}

async function switchProvider(provider: string, panel: vscode.WebviewPanel, authManager: AuthManager, llmClient: LLMClient, statusBarManager: StatusBarManager, apiKey?: string | null) {
    try {
        await llmClient.setCurrentProvider(provider);
        if (apiKey) {
            await authManager.setApiKey(apiKey);
        }
        const providerInfo = authManager.getCurrentProvider();
        const model = providerInfo?.defaultModel || '';

        panel.webview.postMessage({
            type: 'providerSwitched',
            provider,
            models: providerInfo?.models || [],
            model,
            baseUrl: providerInfo?.baseUrl || '',
            hasApiKey: authManager.hasApiKey()
        });

        statusBarMgr.updateStatusBar(model, providerInfo?.name || '');
    } catch (error: any) {
        vscode.window.showErrorMessage('设置失败: ' + error.message);
    }
}

async function switchModel(model: string, panel: vscode.WebviewPanel, authManager: AuthManager, llmClient: LLMClient, statusBarManager: StatusBarManager) {
    try {
        await llmClient.setCurrentModel(model);
        const providerInfo = authManager.getCurrentProvider();
        const modelName = authManager.getModelDisplayName(model);

        panel.webview.postMessage({ type: 'modelSwitched', model, modelName });
        statusBarMgr.updateStatusBar(model, providerInfo?.name || '');
    } catch (error: any) {
        vscode.window.showErrorMessage('设置失败: ' + error.message);
    }
}

async function setBaseUrl(baseUrl: string, panel: vscode.WebviewPanel, authManager: AuthManager) {
    try {
        await authManager.setBaseUrl(baseUrl);
        panel.webview.postMessage({ type: 'baseUrlSet', success: true });
        vscode.window.showInformationMessage('Base URL 设置成功');
    } catch (error: any) {
        panel.webview.postMessage({ type: 'baseUrlSet', success: false, error: error.message });
    }
}

async function optimizeCode(code: string, language: string, instruction: string, panel: vscode.WebviewPanel, llmClient: LLMClient, authManager: AuthManager) {
    if (!code.trim()) {
        vscode.window.showWarningMessage('请先输入代码');
        return;
    }

    isProcessing = true;
    panel.webview.postMessage({ type: 'processing', value: true });

    try {
        const result = await llmClient.optimizeCode({ code, language, instruction });
        panel.webview.postMessage({ type: 'optimizeResult', content: result });
    } catch (error: any) {
        panel.webview.postMessage({ type: 'error', message: error.message });
        vscode.window.showErrorMessage('优化失败: ' + error.message);
    } finally {
        isProcessing = false;
        panel.webview.postMessage({ type: 'processing', value: false });
    }
}

async function explainCode(code: string, language: string, panel: vscode.WebviewPanel, llmClient: LLMClient, authManager: AuthManager) {
    if (!code.trim()) {
        vscode.window.showWarningMessage('请先输入代码');
        return;
    }

    isProcessing = true;
    panel.webview.postMessage({ type: 'processing', value: true });

    try {
        const result = await llmClient.explainCode(code, language);
        panel.webview.postMessage({ type: 'explainResult', content: result });
    } catch (error: any) {
        panel.webview.postMessage({ type: 'error', message: error.message });
        vscode.window.showErrorMessage('解释失败: ' + error.message);
    } finally {
        isProcessing = false;
        panel.webview.postMessage({ type: 'processing', value: false });
    }
}

async function generateTests(code: string, language: string, panel: vscode.WebviewPanel, llmClient: LLMClient, authManager: AuthManager) {
    if (!code.trim()) {
        vscode.window.showWarningMessage('请先输入代码');
        return;
    }

    isProcessing = true;
    panel.webview.postMessage({ type: 'processing', value: true });

    try {
        const result = await llmClient.generateTests(code, language);
        panel.webview.postMessage({ type: 'testResult', content: result });
    } catch (error: any) {
        panel.webview.postMessage({ type: 'error', message: error.message });
        vscode.window.showErrorMessage('生成测试失败: ' + error.message);
    } finally {
        isProcessing = false;
        panel.webview.postMessage({ type: 'processing', value: false });
    }
}

async function generateCodeFromRequirement(requirement: string, panel: vscode.WebviewPanel, llmClient: LLMClient, authManager: AuthManager) {
    if (!requirement.trim()) {
        vscode.window.showWarningMessage('请输入需求描述');
        return;
    }

    isProcessing = true;
    panel.webview.postMessage({ type: 'processing', value: true });

    try {
        const result = await llmClient.generateCodeFromRequirement(requirement);
        panel.webview.postMessage({ type: 'generateCodeResult', content: result });
    } catch (error: any) {
        panel.webview.postMessage({ type: 'error', message: error.message });
        vscode.window.showErrorMessage('生成代码失败: ' + error.message);
    } finally {
        isProcessing = false;
        panel.webview.postMessage({ type: 'processing', value: false });
    }
}

async function insertToEditor(content: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, content);
        });
    } else {
        vscode.window.showWarningMessage('没有活动的编辑器');
    }
}

async function getSelectedCode(panel: vscode.WebviewPanel) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const selection = editor.selection;
        const code = editor.document.getText(selection);
        const language = editor.document.languageId;
        panel.webview.postMessage({ type: 'selectedCode', code, language });
    } else {
        vscode.window.showWarningMessage('请先选择代码');
    }
}

function getHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; margin: 0; color: #333; background: #fff; }
.hidden { display: none; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h2 { margin: 0; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin: 2px; }
.btn-primary { background: #007acc; color: white; }
.btn-secondary { background: #6c757d; color: white; }
textarea { width: 100%; height: 150px; padding: 10px; margin: 10px 0; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
.form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.result { background: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap; margin-top: 15px; }
.status-bar { display: flex; align-items: center; gap: 10px; padding: 10px; background: #e9ecef; border-radius: 4px; margin-bottom: 15px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.green { background: #28a745; }
.status-dot.red { background: #dc3545; }
</style>
</head>
<body>
<div class="header">
<h2>Coding Master</h2>
<button class="btn btn-secondary" id="settingsBtn">Settings</button>
</div>

<div class="status-bar">
<span class="status-dot red" id="statusDot"></span>
<span id="statusText">Not connected</span>
</div>

<div id="authSection">
<h3>Please configure API settings</h3>
<div class="form-group">
<label>Provider:</label>
<select id="providerSelect"></select>
</div>
<div class="form-group">
<label>Model:</label>
<select id="modelSelect"><option value="">Select provider first</option></select>
</div>
<div class="form-group hidden" id="baseUrlSection">
<label>Base URL:</label>
<input type="text" id="baseUrlInput" placeholder="https://api.example.com">
</div>
<div class="form-group">
<label>API Key:</label>
<input type="password" id="apiKeyInput" placeholder="Enter API Key">
</div>
<button class="btn btn-primary" id="saveBtn">Save Settings</button>
</div>

<div id="mainSection" class="hidden">
<div class="form-group">
<label>需求描述:</label>
<textarea id="requirementInput" placeholder="描述你想要的功能，例如：给我生成一个新增订单的Modal弹窗表单"></textarea>
</div>
<button class="btn btn-primary" id="generateBtn" style="background: #28a745;">生成 Claude Code 指令</button>
<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
<div class="form-group">
<label>或输入现有代码:</label>
<textarea id="codeInput" placeholder="输入需要优化/解释/测试的代码..."></textarea>
</div>
<button class="btn btn-secondary" id="getSelectedBtn">Get Selected Code</button>
<div style="margin: 15px 0;">
<button class="btn btn-primary" id="optimizeBtn">Optimize</button>
<button class="btn btn-primary" id="explainBtn">Explain</button>
<button class="btn btn-primary" id="testBtn">Generate Tests</button>
</div>
<div class="result hidden" id="resultSection">
<h3 id="resultTitle">Result:</h3>
<div id="resultContent"></div>
<button class="btn btn-secondary" id="copyBtn">Copy</button>
</div>
</div>

<div id="loading" class="hidden">Processing...</div>

<script>
let providers = [];
let currentModels = [];
const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired');
    var btn = document.getElementById('generateBtn');
    console.log('generateBtn element:', btn);
    if (btn) {
        btn.addEventListener('click', generateCode);
        console.log('Event listener attached to generateBtn');
    } else {
        console.error('generateBtn not found!');
    }
    document.getElementById('settingsBtn').addEventListener('click', showSettings);
    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    document.getElementById('providerSelect').addEventListener('change', onProviderChange);
    document.getElementById('modelSelect').addEventListener('change', onModelChange);
    document.getElementById('getSelectedBtn').addEventListener('click', getSelectedCode);
    document.getElementById('optimizeBtn').addEventListener('click', () => optimizeCode('optimize'));
    document.getElementById('explainBtn').addEventListener('click', () => optimizeCode('explain'));
    document.getElementById('testBtn').addEventListener('click', () => optimizeCode('test'));
    document.getElementById('copyBtn').addEventListener('click', copyResult);
});

function showSettings() {
    document.getElementById('mainSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
}

function saveSettings() {
    const provider = document.getElementById('providerSelect').value;
    const model = document.getElementById('modelSelect').value;
    const apiKey = document.getElementById('apiKeyInput').value;
    const baseUrl = document.getElementById('baseUrlInput').value;

    vscode.postMessage({
        type: 'switchProvider',
        provider: provider,
        apiKey: apiKey || null
    });

    if (baseUrl) {
        vscode.postMessage({ type: 'setBaseUrl', baseUrl: baseUrl });
    }
}

function onProviderChange(e) {
    const provider = providers.find(p => p.id === e.target.value);
    if (provider && provider.models) {
        const opts = provider.models.map(m => '<option value="' + m.id + '">' + m.name + '</option>').join('');
        document.getElementById('modelSelect').innerHTML = opts;
    }
    document.getElementById('baseUrlSection').classList.toggle('hidden', !['azure', 'custom'].includes(e.target.value));
}

function onModelChange(e) {
    vscode.postMessage({ type: 'switchModel', model: e.target.value });
}

function getSelectedCode() {
    vscode.postMessage({ type: 'getSelectedCode' });
}

function generateCode() {
    const requirement = document.getElementById('requirementInput').value;
    if (!requirement.trim()) { alert('请输入需求描述'); return; }
    console.log('Generating code for:', requirement);
    try {
        vscode.postMessage({
            type: 'generateCode',
            requirement: requirement
        });
        console.log('Message sent successfully');
    } catch (err) {
        console.error('Error sending message:', err);
        alert('Error: ' + err);
    }
}

function optimizeCode(type) {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) { alert('Please enter code'); return; }
    vscode.postMessage({
        type: type === 'optimize' ? 'optimizeCode' : type === 'explain' ? 'explainCode' : 'generateTests',
        code: code,
        language: 'auto'
    });
}

function copyResult() {
    const content = document.getElementById('resultContent').textContent;
    vscode.postMessage({ type: 'copyToClipboard', content: content });
}

window.addEventListener('message', function(event) {
    const msg = event.data;
    switch (msg.type) {
        case 'initProviders':
            providers = msg.providers;
            var opts = providers.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('');
            document.getElementById('providerSelect').innerHTML = opts;
            break;
        case 'authStatus':
            document.getElementById('providerSelect').value = msg.provider;
            if (msg.currentModels && msg.currentModels.length > 0) {
                var modelOpts = msg.currentModels.map(m => '<option value="' + m.id + '">' + m.name + '</option>').join('');
                document.getElementById('modelSelect').innerHTML = modelOpts;
                document.getElementById('modelSelect').value = msg.model;
            }
            document.getElementById('baseUrlInput').value = msg.baseUrl || '';
            var baseUrlSection = document.getElementById('baseUrlSection');
            if (msg.provider === 'azure' || msg.provider === 'custom') {
                baseUrlSection.classList.remove('hidden');
            } else {
                baseUrlSection.classList.add('hidden');
            }
            if (msg.hasApiKey) {
                document.getElementById('statusDot').className = 'status-dot green';
                document.getElementById('statusText').textContent = 'Connected - ' + msg.providerName;
                document.getElementById('authSection').classList.add('hidden');
                document.getElementById('mainSection').classList.remove('hidden');
            } else {
                document.getElementById('statusDot').className = 'status-dot red';
                document.getElementById('statusText').textContent = 'Not connected';
                document.getElementById('authSection').classList.remove('hidden');
                document.getElementById('mainSection').classList.add('hidden');
            }
            break;
        case 'processing':
            document.getElementById('loading').classList.toggle('hidden', !msg.value);
            break;
        case 'optimizeResult':
        case 'explainResult':
        case 'testResult':
        case 'generateCodeResult':
            document.getElementById('resultSection').classList.remove('hidden');
            document.getElementById('resultTitle').textContent = msg.type === 'optimizeResult' ? '优化结果:' : msg.type === 'explainResult' ? '代码解释:' : msg.type === 'testResult' ? '测试代码:' : '生成的代码:';
            document.getElementById('resultContent').textContent = msg.content;
            break;
        case 'providerSwitched':
            if (msg.models && msg.models.length > 0) {
                var modelOpts = msg.models.map(m => '<option value="' + m.id + '">' + m.name + '</option>').join('');
                document.getElementById('modelSelect').innerHTML = modelOpts;
                if (msg.model) {
                    document.getElementById('modelSelect').value = msg.model;
                }
            }
            if (msg.hasApiKey) {
                document.getElementById('statusDot').className = 'status-dot green';
                document.getElementById('statusText').textContent = 'Connected';
                document.getElementById('authSection').classList.add('hidden');
                document.getElementById('mainSection').classList.remove('hidden');
            }
            break;
        case 'error':
            alert('Error: ' + msg.message);
            break;
    }
});
</script>
</body>
</html>`;
}
