/** 插件配置类型声明。 */
export interface Config {
	/** 翻译系统提示词 sections（默认 true）。 */
	includeSections?: boolean;
	/** 翻译运行时上下文 contexts（默认 true）。 */
	includeContexts?: boolean;
	/** 翻译工具描述与参数描述（默认 true）。 */
	includeTools?: boolean;
	/** 调试日志（默认 false）。 */
	verbose?: boolean;
}

/** Cordis 插件名。 */
export declare const name: "harness-zh";

/** 依赖的服务。 */
export declare const inject: readonly ["systemPrompt"];

/** 将一段模型可见文本翻译成中文；无法翻译时原样返回。 */
export declare function translate(text: string): string;

/** Cordis 插件入口。 */
export declare function apply(ctx: import("@deepseek-ai/cordis").Context, config?: Partial<Config>): void;
