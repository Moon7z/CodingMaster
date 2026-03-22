import * as vscode from 'vscode';

export interface AuthConfig {
    apiKey: string | undefined;
    model: string;
    baseUrl: string;
    provider: string;
}

export interface Provider {
    id: string;
    name: string;
    baseUrl: string;
    defaultModel: string;
    apiKeyPrefix: string;
    models: { id: string; name: string }[];
}

export class AuthManager {
    private context: vscode.ExtensionContext;
    private static readonly API_KEY_KEY = 'apiKey';
    private static readonly PROVIDER_KEY = 'provider';
    private static readonly MODEL_KEY = 'model';
    private static readonly BASE_URL_KEY = 'baseUrl';

    // 支持的厂商列表
    public readonly providers: Provider[] = [
        {
            id: 'anthropic',
            name: 'Anthropic (Claude)',
            baseUrl: 'https://api.anthropic.com',
            defaultModel: 'claude-sonnet-4-6',
            apiKeyPrefix: 'sk-ant-',
            models: [
                { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
                { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
                { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' }
            ]
        },
        {
            id: 'openai',
            name: 'OpenAI',
            baseUrl: 'https://api.openai.com/v1',
            defaultModel: 'gpt-4o',
            apiKeyPrefix: 'sk-',
            models: [
                { id: 'gpt-4o', name: 'GPT-4o' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
            ]
        },
        {
            id: 'azure',
            name: 'Azure OpenAI',
            baseUrl: '', // 用户需要填写
            defaultModel: 'gpt-4',
            apiKeyPrefix: '',
            models: [
                { id: 'gpt-4', name: 'GPT-4' },
                { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo' }
            ]
        },
        {
            id: 'google',
            name: 'Google AI (Gemini)',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            defaultModel: 'gemini-1.5-pro',
            apiKeyPrefix: 'AIza',
            models: [
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
                { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
                { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' }
            ]
        },
        {
            id: 'custom',
            name: '自定义 API',
            baseUrl: '', // 用户需要填写
            defaultModel: 'gpt-3.5-turbo',
            apiKeyPrefix: '',
            models: [
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
                { id: 'gpt-4', name: 'GPT-4' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                { id: 'claude-3-opus', name: 'Claude 3 Opus' },
                { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }
            ]
        },
        // 国内厂商
        {
            id: 'dashscope',
            name: '阿里云百炼 (通义千问)',
            baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            defaultModel: 'qwen-turbo',
            apiKeyPrefix: 'sk-',
            models: [
                { id: 'qwen-turbo', name: 'Qwen Turbo' },
                { id: 'qwen-plus', name: 'Qwen Plus' },
                { id: 'qwen-max', name: 'Qwen Max' },
                { id: 'qwen-max-longcontext', name: 'Qwen Max LongContext' },
                { id: 'qwen-coder-turbo', name: 'Qwen Coder Turbo' },
                { id: 'qwen2.5-coder-32b-instruct', name: 'Qwen2.5 Coder 32B' }
            ]
        },
        {
            id: 'zhipu',
            name: '智谱 AI (GLM)',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            defaultModel: 'glm-4-flash',
            apiKeyPrefix: '',
            models: [
                { id: 'glm-4-flash', name: 'GLM-4 Flash' },
                { id: 'glm-4-plus', name: 'GLM-4 Plus' },
                { id: 'glm-4', name: 'GLM-4' },
                { id: 'glm-4v-flash', name: 'GLM-4V Flash' },
                { id: 'glm-4v-plus', name: 'GLM-4V Plus' },
                { id: 'glm-4-long', name: 'GLM-4-Long' }
            ]
        },
        {
            id: 'baidu',
            name: '百度智能云 (文心一言)',
            baseUrl: 'https://qianfan.baidubce.com/v2',
            defaultModel: 'ernie-4.0-8k',
            apiKeyPrefix: '',
            models: [
                { id: 'ernie-4.0-8k', name: 'ERNIE 4.0 8K' },
                { id: 'ernie-4.0-8k-preview', name: 'ERNIE 4.0 8K Preview' },
                { id: 'ernie-3.5-8k', name: 'ERNIE 3.5 8K' },
                { id: 'ernie-speed-8k', name: 'ERNIE Speed 8K' },
                { id: 'ernie-speed-128k', name: 'ERNIE Speed 128K' }
            ]
        },
        {
            id: 'tencent',
            name: '腾讯云 (混元)',
            baseUrl: 'https://hunyuan.tencentcloudapi.com',
            defaultModel: 'hunyuan-pro',
            apiKeyPrefix: '',
            models: [
                { id: 'hunyuan-pro', name: 'Hunyuan Pro' },
                { id: 'hunyuan-standard', name: 'Hunyuan Standard' },
                { id: 'hunyuan-lite', name: 'Hunyuan Lite' }
            ]
        },
        {
            id: 'iflytek',
            name: '讯飞星火',
            baseUrl: 'https://spark-api.xf-yun.com',
            defaultModel: 'generalv3.5',
            apiKeyPrefix: '',
            models: [
                { id: 'generalv3.5', name: '星火 V3.5' },
                { id: 'generalv3', name: '星火 V3.0' },
                { id: 'generalv2', name: '星火 V2.0' },
                { id: 'generalv1.1', name: '星火 V1.1' }
            ]
        },
        {
            id: 'moonshot',
            name: '月之暗面 (Moonshot)',
            baseUrl: 'https://api.moonshot.cn/v1',
            defaultModel: 'moonshot-v1-8k',
            apiKeyPrefix: '',
            models: [
                { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K' },
                { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K' },
                { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K' }
            ]
        },
        {
            id: 'deepseek',
            name: 'DeepSeek',
            baseUrl: 'https://api.deepseek.com/v1',
            defaultModel: 'deepseek-chat',
            apiKeyPrefix: '',
            models: [
                { id: 'deepseek-chat', name: 'DeepSeek Chat' },
                { id: 'deepseek-coder', name: 'DeepSeek Coder' }
            ]
        },
        {
            id: 'minimax',
            name: 'MiniMax (稀宇科技)',
            baseUrl: 'https://api.minimax.chat/v1',
            defaultModel: 'MiniMax-M2.1',
            apiKeyPrefix: '',
            models: [
                { id: 'MiniMax-M2.1', name: 'MiniMax 2.1' },
                { id: 'MiniMax-M2.5', name: 'MiniMax 2.5' },
                { id: 'abab6.5s-chat', name: 'ABAB 6.5S Chat' },
                { id: 'abab6.5g-chat', name: 'ABAB 6.5G Chat' },
                { id: 'abab6-chat', name: 'ABAB 6 Chat' }
            ]
        },
        {
            id: 'volcengine',
            name: '火山引擎 (豆包)',
            baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
            defaultModel: 'doubao-pro-4k',
            apiKeyPrefix: '',
            models: [
                { id: 'doubao-pro-4k', name: '豆包 Pro 4K' },
                { id: 'doubao-pro-32k', name: '豆包 Pro 32K' },
                { id: 'doubao-lite-4k', name: '豆包 Lite 4K' },
                { id: 'doubao-lite-32k', name: '豆包 Lite 32K' }
            ]
        },
        {
            id: 'siliconflow',
            name: 'SiliconFlow (硅基流动)',
            baseUrl: 'https://api.siliconflow.cn/v1',
            defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
            apiKeyPrefix: 'sk-',
            models: [
                { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B' },
                { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
                { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B' },
                { id: '01-ai/Yi-1.5-9B-Chat', name: 'Yi 1.5 9B' }
            ]
        }
    ];

    private static readonly DEFAULT_PROVIDER = 'anthropic';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * 获取 API Key
     */
    public getApiKey(): string | undefined {
        return this.context.globalState.get<string>(AuthManager.API_KEY_KEY);
    }

    /**
     * 检查是否已配置 API Key
     */
    public hasApiKey(): boolean {
        const apiKey = this.getApiKey();
        return !!apiKey && apiKey.length > 0;
    }

    /**
     * 设置 API Key
     */
    public async setApiKey(apiKey: string): Promise<void> {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new Error('API Key 不能为空');
        }
        await this.context.globalState.update(AuthManager.API_KEY_KEY, apiKey.trim());
    }

    /**
     * 提示用户输入 API Key
     */
    public async promptForApiKey(): Promise<string | undefined> {
        const provider = this.getProvider();
        const currentProvider = this.providers.find(p => p.id === provider);

        const apiKey = await vscode.window.showInputBox({
            title: '设置 API Key',
            prompt: `请输入您的 ${currentProvider?.name || 'API'} API Key`,
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API Key 不能为空';
                }
                return null;
            }
        });

        if (apiKey) {
            await this.setApiKey(apiKey);
            vscode.window.showInformationMessage('✅ API Key 设置成功！');
        }

        return apiKey;
    }

    /**
     * 获取当前厂商
     */
    public getProvider(): string {
        return this.context.globalState.get<string>(AuthManager.PROVIDER_KEY) || AuthManager.DEFAULT_PROVIDER;
    }

    /**
     * 设置厂商
     */
    public async setProvider(provider: string): Promise<void> {
        await this.context.globalState.update(AuthManager.PROVIDER_KEY, provider);
        // 重置模型为默认值
        const providerInfo = this.providers.find(p => p.id === provider);
        if (providerInfo) {
            await this.setModel(providerInfo.defaultModel);
            await this.setBaseUrl(providerInfo.baseUrl);
        }
    }

    /**
     * 获取当前选择的模型
     */
    public getModel(): string {
        return this.context.globalState.get<string>(AuthManager.MODEL_KEY) || this.getDefaultModel();
    }

    /**
     * 获取默认模型
     */
    public getDefaultModel(): string {
        const provider = this.providers.find(p => p.id === this.getProvider());
        return provider?.defaultModel || '';
    }

    /**
     * 设置模型
     */
    public async setModel(model: string): Promise<void> {
        await this.context.globalState.update(AuthManager.MODEL_KEY, model);
    }

    /**
     * 获取 Base URL
     */
    public getBaseUrl(): string {
        return this.context.globalState.get<string>(AuthManager.BASE_URL_KEY) || this.getDefaultBaseUrl();
    }

    /**
     * 获取默认 Base URL
     */
    public getDefaultBaseUrl(): string {
        const provider = this.providers.find(p => p.id === this.getProvider());
        return provider?.baseUrl || '';
    }

    /**
     * 设置 Base URL
     */
    public async setBaseUrl(baseUrl: string): Promise<void> {
        await this.context.globalState.update(AuthManager.BASE_URL_KEY, baseUrl);
    }

    /**
     * 获取完整的认证配置
     */
    public getConfig(): AuthConfig {
        return {
            apiKey: this.getApiKey(),
            provider: this.getProvider(),
            model: this.getModel(),
            baseUrl: this.getBaseUrl(),
        };
    }

    /**
     * 获取当前厂商信息
     */
    public getCurrentProvider(): Provider | undefined {
        return this.providers.find(p => p.id === this.getProvider());
    }

    /**
     * 获取厂商显示名称
     */
    public getProviderDisplayName(providerId: string): string {
        const provider = this.providers.find(p => p.id === providerId);
        return provider?.name || providerId;
    }

    /**
     * 获取模型显示名称
     */
    public getModelDisplayName(modelId: string): string {
        const provider = this.getCurrentProvider();
        if (provider) {
            const model = provider.models.find(m => m.id === modelId);
            return model?.name || modelId;
        }
        return modelId;
    }

    /**
     * 清除所有认证信息
     */
    public async clearAuth(): Promise<void> {
        await this.context.globalState.update(AuthManager.API_KEY_KEY, undefined);
        await this.context.globalState.update(AuthManager.PROVIDER_KEY, undefined);
        await this.context.globalState.update(AuthManager.MODEL_KEY, undefined);
        await this.context.globalState.update(AuthManager.BASE_URL_KEY, undefined);
        vscode.window.showInformationMessage('已清除所有认证信息');
    }

    /**
     * 获取 providers 的 JSON 字符串
     */
    public getProvidersJson(): string {
        return JSON.stringify(this.providers);
    }
}
