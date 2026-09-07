//! 页面共享状态与固定文案（方案 §5.1 枚举映射 / §5.3 四态 / §11 错误规范）。
#![allow(dead_code)]

use yew::prelude::*;

/// 四态包装：Empty 仅在"查询成功且无数据"时出现；unknown 是 Ready 的合法值，不是 Failed。
#[derive(Clone, PartialEq)]
pub enum Loadable<T> {
    Loading,
    Ready(T),
    Failed(String),
    Empty,
}

/// Task 8 态固定文案（方案 §5.1；未知值显示原文并标记，不猜测映射）。
pub fn task_status_text(status: &str) -> String {
    match status {
        "proposed" => "待开始".into(),
        "ready" => "待执行".into(),
        "in_progress" => "执行中".into(),
        "awaiting_review" => "等待验收".into(),
        "completed" => "已完成".into(),
        "blocked" => "已阻塞".into(),
        "cancelled" => "已取消".into(),
        "failed" => "失败".into(),
        other => format!("未识别状态（{other}）"),
    }
}

/// Attempt 8 态固定文案（方案 §4.4/§5.1）。
pub fn attempt_status_text(status: &str) -> String {
    match status {
        "created" => "已创建".into(),
        "admitted" => "已接纳".into(),
        "running" => "执行中".into(),
        "cancelling" => "取消中".into(),
        "cancelled" => "已取消".into(),
        "succeeded" => "成功".into(),
        "failed" => "失败".into(),
        "unknown_after_restart" => "重启后状态未知".into(),
        other => format!("未识别状态（{other}）"),
    }
}

/// 活跃 Attempt（admitted/running/cancelling）：工作台"进行中"区与轮询条件（方案 §6.6）。
pub fn is_attempt_active(status: &str) -> bool {
    matches!(status, "admitted" | "running" | "cancelling")
}

/// 状态徽标配色类（圆点+文字，不只靠颜色；方案 §12 可访问性）。
pub fn status_badge_class(status: &str) -> &'static str {
    match status {
        "running" | "in_progress" => "b-accent",
        "succeeded" | "completed" => "b-ok",
        "failed" => "b-danger",
        "awaiting_review" | "unknown_after_restart" | "cancelling" | "blocked" => "b-warn",
        _ => "b-neutral",
    }
}

/// 状态徽标组件（按 Task/Attempt 文案函数取文字）。
pub fn status_badge(status: &str, text: String) -> Html {
    html! {
        <span class={classes!("badge", status_badge_class(status))}>
            <span class="dot"></span>
            {text}
        </span>
    }
}
