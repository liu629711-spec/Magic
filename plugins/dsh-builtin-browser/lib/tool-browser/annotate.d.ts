/**
 * Magic local patch (2026-09-13): page-annotation tools over the shared
 * browser. The human toggles an in-page annotation layer (floating pill →
 * select an element → style card → comment), the annotation lands in the
 * page's localStorage keyed by URL, and `browser_annotations` hands the
 * structured list (selector / text / styles / comment) back to the model —
 * so "调整这块元素" carries a precise pointer instead of a vague description.
 *
 * Deliberately INSIDE tool-browser: the tools must reuse the calling task's
 * browser session (`provider.open()` does not dedupe by label, so a sibling
 * plugin opening its own session would spawn a second window).
 *
 * Injection runs through the seam's `execute` (CDP `Runtime.evaluate`) — no
 * provider changes, no addInitScript hook. The layer does NOT survive
 * navigation (each navigation mints a fresh document); the enable tool is
 * idempotent and cheap to call again, and the annotations themselves persist
 * in the page origin's localStorage.
 * @module dsh-browser/tool-browser/annotate
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import type { Context } from '@deepseek-ai/cordis';
import type { BrowserSessionId } from '../browser/types.js';
import type { ToolBrowserState } from './index.js';
type BrowserSeam = NonNullable<Context['browser']>;
interface ExecAgentLike {
    ctx?: Context;
}
interface AnnotateHelpers {
    ensureSession: (browser: BrowserSeam, state: ToolBrowserState, key: string, agent?: ExecAgentLike) => Promise<BrowserSessionId>;
    taskKey: (exec: {
        agent?: {
            id?: string;
        } | undefined;
    } | undefined) => string;
    agentOf: (exec: unknown) => ExecAgentLike | undefined;
    timeoutMs: number;
}
interface AnnotateContext {
    tools: {
        register(tool: ReturnType<typeof defineTool>): void;
    };
    get(name: 'browser'): BrowserSeam | undefined;
}
/** One annotation as stored in the page and returned to the model. */
export interface PageAnnotation {
    readonly ts: number;
    readonly url: string;
    readonly tag: string;
    readonly selector: string;
    readonly text: string;
    readonly rect: {
        readonly w: number;
        readonly h: number;
    };
    readonly color: string;
    readonly font: string;
    readonly comment: string;
}
/**
 * The in-page layer, as one evaluation expression. String.raw on purpose;
 * the script body avoids backticks and `${}` so the literal stays verbatim.
 * Injected through Runtime.evaluate — its return value is the layer's ack.
 */
export declare const ANNOTATE_LAYER_SCRIPT: string;
/**
 * Register the two annotation tools. They reuse the calling task's session
 * through the shared {@link ToolBrowserState}, so annotations always land in
 * the browser window the rest of the browser_* tools drive.
 */
export declare function registerAnnotateTools(ctx: AnnotateContext, state: ToolBrowserState, helpers: AnnotateHelpers): void;
export {};
