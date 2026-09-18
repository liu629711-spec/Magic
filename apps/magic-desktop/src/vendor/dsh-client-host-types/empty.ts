/**
 * Vendor shim of the type-only side-effect imports ui-sidebar-right carries
 * for host packages it does not use at runtime（`dsh-client-resources/client`、
 * `ui-renderer/client`、`ui-conversation/client`——`import type {}` 只为把上游
 * 的 SlotMap/standard-kit augmentation 拉进程序；本环境的对应 augment 都由
 * ui-layout/ui-session shim 承担，这里留空即可）。
 */
export {}
