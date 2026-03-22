import * as vscode from 'vscode';
import { AuthManager, AuthConfig } from '../auth/AuthManager';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface LLMResponse {
    content: string;
    model: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

export interface OptimizeRequest {
    code: string;
    language?: string;
    instruction?: string;
}

export class LLMClient {
    private authManager: AuthManager;
    private currentProvider: string;
    private currentModel: string;

    constructor(authManager: AuthManager) {
        this.authManager = authManager;
        this.currentProvider = authManager.getProvider();
        this.currentModel = authManager.getModel();
    }

    /**
     * 获取当前厂商
     */
    public getCurrentProvider(): string {
        return this.currentProvider;
    }

    /**
     * 获取当前模型
     */
    public getCurrentModel(): string {
        return this.currentModel;
    }

    /**
     * 设置当前厂商
     */
    public async setCurrentProvider(provider: string): Promise<void> {
        this.currentProvider = provider;
        await this.authManager.setProvider(provider);
        // 更新默认模型
        this.currentModel = this.authManager.getModel();
    }

    /**
     * 设置当前模型
     */
    public async setCurrentModel(model: string): Promise<void> {
        this.currentModel = model;
        await this.authManager.setModel(model);
    }

    /**
     * 发送消息到 LLM
     */
    public async sendMessage(
        messages: Message[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<LLMResponse> {
        const config = this.authManager.getConfig();

        if (!config.apiKey) {
            throw new Error('请先设置 API Key。点击左下角设置按钮或运行命令 "Coding Master: 设置 API Key"');
        }

        return await this.callAPI(config, messages, options);
    }

    /**
     * 优化代码
     */
    public async optimizeCode(request: OptimizeRequest): Promise<string> {
        const config = this.authManager.getConfig();

        if (!config.apiKey) {
            throw new Error('请先设置 API Key。点击左下角设置按钮或运行命令 "Coding Master: 设置 API Key"');
        }

        const instruction = request.instruction || '请优化这段代码，提升可读性和性能';
        const language = request.language || '代码';

        const systemPrompt = `你是一个专业的代码优化助手。请根据用户提供的代码，按照要求进行优化。

要求：
1. 只返回优化后的代码，不要添加任何解释
2. 保持代码的功能不变
3. 优化时考虑：代码风格、性能、可读性、最佳实践
4. 如果是 Markdown 代码块，请直接返回优化后的代码（保留语言标识）`;

        const userMessage = `请优化以下${language}代码：

\`\`\`
${request.code}
\`\`\`

优化要求：${instruction}`;

        const messages: Message[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        const response = await this.callAPI(config, messages, {
            temperature: 0.3,
        });

        return response.content;
    }

    /**
     * 解释代码
     */
    public async explainCode(code: string, language?: string): Promise<string> {
        const config = this.authManager.getConfig();

        if (!config.apiKey) {
            throw new Error('请先设置 API Key');
        }

        const lang = language || '代码';
        const userMessage = `请详细解释以下${lang}代码的作用：

\`\`\`
${code}
\`\`\``;

        const messages: Message[] = [
            { role: 'user', content: userMessage }
        ];

        const response = await this.callAPI(config, messages);
        return response.content;
    }

    /**
     * 生成测试代码
     */
    public async generateTests(code: string, language?: string): Promise<string> {
        const config = this.authManager.getConfig();

        if (!config.apiKey) {
            throw new Error('请先设置 API Key');
        }

        const lang = language || '代码';
        const userMessage = `请为以下${lang}代码生成单元测试：

\`\`\`
${code}
\`\`\`

请生成完整、可运行的测试代码。`;

        const messages: Message[] = [
            { role: 'user', content: userMessage }
        ];

        const response = await this.callAPI(config, messages, {
            temperature: 0.2,
        });
        return response.content;
    }

    /**
     * 根据需求描述生成 Markdown 格式指令
     */
    public async generatePromptFromRequirement(requirement: string): Promise<string> {
        const config = this.authManager.getConfig();

        if (!config.apiKey) {
            throw new Error('请先设置 API Key');
        }

        const systemPrompt = `你是一个需求分析师。请根据用户用自然语言描述的需求，生成一个结构化的 Markdown 格式指令，这个指令要让 AI 程序员能够准确理解并生成代码。

要求：
1. 分析需求的业务场景、用户交互、功能点
2. 转换为标准化的 Markdown 格式指令
3. 包含：功能描述、技术要求、UI/UX 要求、执行步骤
4. 只返回 Markdown 格式指令，不要添加解释`;

        const userMessage = `请将以下需求转换为 Claude Code 能理解的 Markdown 格式指令：

需求：${requirement}`;

        const messages: Message[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        const response = await this.callAPI(config, messages, {
            temperature: 0.3,
            maxTokens: 2048
        });

        return response.content;
    }

    /**
     * 根据需求描述生成开发任务书（PRD）
     */
    public async generateCodeFromRequirement(requirement: string): Promise<string> {
        const config = this.authManager.getConfig();

        if (!config.apiKey) {
            throw new Error('请先设置 API Key');
        }

        const promptSystem = "你是一个专业的开发指令生成器。将用户需求转换为指令级开发文档，格式如下：\n\n" +
            "# Role: [角色名称]\n" +
            "# Context: [项目名称] - 基于用户需求\n\n" +
            "## 1. 核心技术栈 (Strict Tech Stack)\n" +
            "- Frontend: React 18 + Vite\n" +
            "- UI: Tailwind CSS + shadcn/ui 风格组件\n" +
            "- 状态: Zustand\n" +
            "- 图标: lucide-react\n" +
            "- 路由: react-router-dom\n" +
            "- 动画: framer-motion\n\n" +
            "## 2. UI设计规范 (UI Design Standards)\n" +
            "### 2.1 视觉风格\n" +
            "- 风格: 现代简洁、类似 shadcn/ui 的极简质感\n" +
            "- 圆角: rounded-lg (8px) 或 rounded-xl (12px)\n" +
            "- 阴影: shadow-sm / shadow-md，柔和不刺眼\n" +
            "- 间距: 使用 4px 基准网格 (p-4, m-4, gap-4)\n\n" +
            "### 2.2 色彩方案\n" +
            "- 主色: 使用 slate-900 或 zinc-900 深色\n" +
            "- 辅色: slate-500 或 zinc-500\n" +
            "- 背景: white 或 slate-50\n" +
            "- 强调色: blue-600, emerald-600, violet-600 等\n" +
            "- 避免: 过于鲜艳的高饱和度颜色\n\n" +
            "### 2.3 组件设计\n" +
            "- 按钮: 简洁矩形或微圆角，hover 有微妙颜色变化\n" +
            "- 卡片: 白色背景 + 柔和阴影 + 适当内边距\n" +
            "- 输入框: 细边框 + focus 蓝色边框 + 过渡动画\n" +
            "- 列表: 简洁的卡片式或紧凑的列表项\n\n" +
            "### 2.4 动效设计\n" +
            "- 过渡: duration-200 ~ duration-300，ease-out\n" +
            "- hover: 微妙的 scale(1.02) 或颜色变化\n" +
            "- 页面切换: fade-in + slide-in 组合\n" +
            "- 加载: 简洁的 spin 动画或骨架屏\n\n" +
            "## 3. 目录结构 (Strict Directory Structure)\n" +
            "/项目名\n" +
            "  /client/src/components/ui (基础组件)\n" +
            "  /client/src/components (业务组件)\n" +
            "  /client/src/pages\n" +
            "  /client/src/store\n\n" +
            "## 4. 分阶段执行 (Phased Execution)\n\n" +
            "### Phase 1: 项目初始化\n" +
            "1. 使用 Vite 创建项目\n" +
            "2. 安装依赖: tailwindcss, lucide-react, zustand, react-router-dom, framer-motion\n" +
            "3. 配置 Tailwind + 创建基础 UI 组件库\n\n" +
            "### Phase 2: 核心功能\n" +
            "1. 实现页面布局和路由\n" +
            "2. 实现核心组件（卡片、按钮、输入框等）\n" +
            "3. 实现业务逻辑和数据展示\n\n" +
            "### Phase 3: 视觉优化\n" +
            "1. 应用 UI 设计规范\n" +
            "2. 添加动效和交互反馈\n" +
            "3. 优化响应式适配\n\n" +
            "## 5. 关键约束 (Operational Guardrails)\n" +
            "- **Environment**: 每次关键修改后，运行 `npm run dev` 确保项目可访问\n" +
            "- **Mock First**: 严禁引入外部数据库，所有数据从本地 JSON 或内存对象读取\n" +
            "- **UI优先级**: 界面美观与功能同等重要，必须按照 UI 设计规范执行\n" +
            "- **Code Style**: 函数式组件 + Hooks + Zustand，保持组件纯粹可复用\n\n" +
            "---\n" +
            "[指令：请开始执行 Phase 1]";

        const promptUser = "需求：" + requirement + "\n\n请严格按照上述格式生成指令级开发文档。信息不足时做合理假设。";

        const promptMessages: Message[] = [
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ];

        const promptResponse = await this.callAPI(config, promptMessages, {
            temperature: 0.1,
            maxTokens: 4096
        });

        return promptResponse.content;
    }

    /**
     * 调用 API
     */
    private async callAPI(
        config: AuthConfig,
        messages: Message[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<LLMResponse> {
        switch (config.provider) {
            case 'anthropic':
                return await this.callAnthropicAPI(config, messages, options);
            case 'openai':
            case 'dashscope':
            case 'zhipu':
            case 'baidu':
            case 'tencent':
            case 'iflytek':
            case 'moonshot':
            case 'deepseek':
            case 'minimax':
            case 'volcengine':
            case 'siliconflow':
                return await this.callOpenAIAPI(config, messages, options);
            case 'azure':
                return await this.callAzureAPI(config, messages, options);
            case 'google':
                return await this.callGoogleAPI(config, messages, options);
            case 'custom':
                return await this.callCustomAPI(config, messages, options);
            default:
                throw new Error(`不支持的厂商: ${config.provider}，请在设置中选择支持的厂商`);
        }
    }

    /**
     * Anthropic API
     */
    private async callAnthropicAPI(
        config: AuthConfig,
        messages: Message[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<LLMResponse> {
        const apiUrl = `${config.baseUrl}/v1/messages`;

        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const userMessages = messages.filter(m => m.role !== 'system');

        const requestBody: any = {
            model: config.model,
            max_tokens: options?.maxTokens || 4096,
            temperature: options?.temperature ?? 0.7,
            system: systemMessage,
            messages: userMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        };

        return await this.executeRequest(apiUrl, requestBody, {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey!,
            'anthropic-version': '2023-06-01'
        }, (data: any) => {
            if (!data.content || data.content.length === 0) {
                throw new Error('API 返回为空');
            }
            const content = data.content[0].type === 'text' ? data.content[0].text : JSON.stringify(data.content);
            return {
                content,
                model: data.model,
                usage: data.usage ? {
                    inputTokens: data.usage.input_tokens,
                    outputTokens: data.usage.output_tokens
                } : undefined
            };
        });
    }

    /**
     * OpenAI API
     */
    private async callOpenAIAPI(
        config: AuthConfig,
        messages: Message[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<LLMResponse> {
        const apiUrl = `${config.baseUrl}/chat/completions`;

        const requestBody = {
            model: config.model,
            max_tokens: options?.maxTokens || 4096,
            temperature: options?.temperature ?? 0.7,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        };

        return await this.executeRequest(apiUrl, requestBody, {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        }, (data: any) => {
            if (!data.choices || data.choices.length === 0) {
                throw new Error('API 返回为空');
            }
            // 过滤掉模型的思考过程（reasoning）
            let content = data.choices[0].message.content || '';
            // 如果内容包含思考标记，过滤掉
            if (content.includes('<think>') || content.includes('</think>')) {
                content = content.replace(new RegExp('<think>[\\s\\S]*?</think>', 'g'), '').trim();
            }
            return {
                content: content,
                model: data.model,
                usage: data.usage ? {
                    inputTokens: data.usage.prompt_tokens,
                    outputTokens: data.usage.completion_tokens
                } : undefined
            };
        });
    }

    /**
     * Azure OpenAI API
     */
    private async callAzureAPI(
        config: AuthConfig,
        messages: Message[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<LLMResponse> {
        const apiUrl = `${config.baseUrl}/openai/deployments/${config.model}/chat/completions?api-version=2024-02-15-preview`;

        const requestBody = {
            max_tokens: options?.maxTokens || 4096,
            temperature: options?.temperature ?? 0.7,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        };

        return await this.executeRequest(apiUrl, requestBody, {
            'Content-Type': 'application/json',
            'api-key': config.apiKey || ''
        }, (data: any) => {
            if (!data.choices || data.choices.length === 0) {
                throw new Error('API 返回为空');
            }
            return {
                content: data.choices[0].message.content,
                model: data.model || config.model,
                usage: data.usage
            };
        });
    }

    /**
     * Google Gemini API
     */
    private async callGoogleAPI(
        config: AuthConfig,
        messages: Message[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<LLMResponse> {
        const modelName = config.model.replace('gemini-', '');
        const apiUrl = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;

        const lastMessage = messages[messages.length - 1]?.content || '';

        const requestBody = {
            contents: [{ parts: [{ text: lastMessage }] }],
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxTokens || 4096
            }
        };

        return await this.executeRequest(apiUrl, requestBody, {
            'Content-Type': 'application/json'
        }, (data: any) => {
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('API 返回为空');
            }
            return {
                content: data.candidates[0].content.parts[0].text,
                model: config.model,
                usage: undefined
            };
        });
    }

    /**
     * 自定义 API（OpenAI 兼容格式）
     */
    private async callCustomAPI(
        config: AuthConfig,
        messages: Message[],
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<LLMResponse> {
        // 验证自定义 API 配置
        if (!config.baseUrl) {
            throw new Error('自定义 API 需要设置 Base URL。请先在设置中配置 API 地址。');
        }
        if (!config.model) {
            throw new Error('自定义 API 需要设置模型名称。请先在设置中配置模型。');
        }

        const apiUrl = `${config.baseUrl}/chat/completions`;

        const requestBody = {
            model: config.model,
            max_tokens: options?.maxTokens || 4096,
            temperature: options?.temperature ?? 0.7,
            messages: messages.map(msg => ({
                role: msg.role === 'system' ? 'system' : msg.role,
                content: msg.content
            }))
        };

        return await this.executeRequest(apiUrl, requestBody, {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        }, (data: any) => {
            if (!data.choices || data.choices.length === 0) {
                throw new Error('API 返回为空');
            }
            return {
                content: data.choices[0].message.content,
                model: data.model || config.model,
                usage: data.usage ? {
                    inputTokens: data.usage.prompt_tokens,
                    outputTokens: data.usage.completion_tokens
                } : undefined
            };
        });
    }

    /**
     * 执行请求
     */
    private async executeRequest(
        url: string,
        body: any,
        headers: Record<string, string>,
        parseResponse: (data: any) => LLMResponse
    ): Promise<LLMResponse> {
        try {
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '🤔 AI 正在思考中...',
                cancellable: false
            }, async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 300000); // 5分钟超时

                try {
                    const fetchResponse = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(body),
                        signal: controller.signal
                    });

                    clearTimeout(timeout);

                    if (!fetchResponse.ok) {
                        const errorData = await fetchResponse.json().catch(() => ({})) as any;
                        const errorMessage = errorData.error?.message || errorData.error?.type || `API 请求失败: ${fetchResponse.status}`;
                        throw new Error(errorMessage);
                    }

                    const data = await fetchResponse.json();
                    return parseResponse(data);
                } catch (error) {
                    clearTimeout(timeout);
                    throw error;
                }
            });

            return response;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接后重试');
            }
            if (error.message.includes('API Key') || error.message.includes('api-key')) {
                throw new Error('API Key 无效，请检查是否正确');
            }
            throw new Error(`调用 AI 服务失败: ${error.message}`);
        }
    }
}
