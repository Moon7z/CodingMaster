import * as vscode from 'vscode';
import { AuthManager } from './auth/AuthManager';
import { LLMClient } from './llm/LLMClient';
import { createWebviewPanel } from './ui/WebviewPanel';
import { StatusBarManager } from './ui/StatusBarManager';

let authManager: AuthManager;
let llmClient: LLMClient;
let statusBarManager: StatusBarManager;
let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    // 初始化核心服务
    authManager = new AuthManager(context);
    llmClient = new LLMClient(authManager);
    statusBarManager = new StatusBarManager();

    // 注册命令：打开面板
    const openPanelCommand = vscode.commands.registerCommand('codingMaster.openPanel', () => {
        if (panel) {
            panel.reveal();
        } else {
            panel = createWebviewPanel(context, llmClient, authManager, statusBarManager);
        }
    });

    // 注册命令：设置 API Key
    const setApiKeyCommand = vscode.commands.registerCommand('codingMaster.setApiKey', async () => {
        await authManager.promptForApiKey();
    });

    // 注册命令：切换模型
    const switchModelCommand = vscode.commands.registerCommand('codingMaster.switchModel', async () => {
        if (!panel) {
            panel = createWebviewPanel(context, llmClient, authManager, statusBarManager);
        }
        panel.reveal();
    });

    context.subscriptions.push(
        openPanelCommand,
        setApiKeyCommand,
        switchModelCommand,
        statusBarManager
    );

    // 更新状态栏显示当前模型
    const providerInfo = authManager.getCurrentProvider();
    statusBarManager.updateStatusBar(llmClient.getCurrentModel(), providerInfo?.name);

    // 启动时自动打开面板
    panel = createWebviewPanel(context, llmClient, authManager, statusBarManager);

    vscode.window.showInformationMessage('🤖 Coding Master 已启动！');
}

export function deactivate() {
    if (panel) {
        panel.dispose();
    }
}
