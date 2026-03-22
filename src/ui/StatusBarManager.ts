import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private currentModel: string = '';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.text = '🤖 Coding Master: 未设置';
        this.statusBarItem.tooltip = '点击切换 AI 模型';
        this.statusBarItem.command = 'codingMaster.switchModel';

        this.statusBarItem.show();
    }

    /**
     * 更新状态栏显示
     */
    public updateStatusBar(model: string, providerName?: string): void {
        this.currentModel = model;
        const displayName = providerName || this.getShortModelName(model);
        this.statusBarItem.text = `🤖 ${displayName}`;
    }

    /**
     * 获取简短模型名称
     */
    private getShortModelName(model: string): string {
        const modelMap: { [key: string]: string } = {
            'claude-sonnet-4-6': 'Sonnet',
            'claude-opus-4-6': 'Opus',
            'claude-haiku-4-5': 'Haiku',
            'gpt-4o': 'GPT-4o',
            'gpt-4-turbo': 'GPT-4T',
            'gpt-3.5-turbo': 'GPT-3.5',
            'gemini-1.5-pro': 'Gemini Pro',
            'gemini-1.5-flash': 'Gemini Flash',
        };
        return modelMap[model] || model;
    }

    /**
     * 显示加载状态
     */
    public showLoading(): void {
        this.statusBarItem.text = '⏳ Coding Master: 处理中...';
    }

    /**
     * 显示错误状态
     */
    public showError(message: string): void {
        this.statusBarItem.text = `❌ 错误`;
        setTimeout(() => {
            this.updateStatusBar(this.currentModel);
        }, 5000);
    }

    /**
     * 显示成功状态
     */
    public showSuccess(message: string): void {
        this.statusBarItem.text = `✅ ${message}`;
        setTimeout(() => {
            this.updateStatusBar(this.currentModel);
        }, 3000);
    }

    /**
     * 隐藏状态栏
     */
    public hide(): void {
        this.statusBarItem.hide();
    }

    /**
     * 显示状态栏
     */
    public show(): void {
        this.statusBarItem.show();
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
