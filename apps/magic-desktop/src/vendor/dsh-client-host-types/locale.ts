/**
 * Vendor shim of `@deepseek-ai/dsh-client-locale/client`（type-only）。
 * 上游在这里 merge 共享 `common` 词典到 LocaleNamespaceMap；本环境无 common
 * 词典（CommonKeyOf 塌缩为 never，与 ui-slots 自身测试程序一致）。TranslateNS
 * 的权威定义在 ui-slots，这里 re-export 供 ui-sidebar-right 的 labels/
 * definition import 原路径解析。
 */
export type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The locale service（ui-sidebar-right 的 t 席与词典注册走这里）。 */
    locale: {
      bind(ns: string): (key: string, params?: Record<string, unknown>) => string
      register(ns: string, dicts: Record<string, Record<string, string>>): () => void
      [member: string]: unknown
    }
  }
}
