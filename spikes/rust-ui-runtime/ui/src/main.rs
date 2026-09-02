use gloo_net::http::Request;
use serde::Deserialize;
use wasm_bindgen_futures::spawn_local;
use yew::prelude::*;

#[derive(Clone, Debug, Default, Deserialize, PartialEq)]
struct RuntimeStatus {
    magic_healthy: bool,
    opencode_healthy: bool,
    opencode_pid: Option<u32>,
}

#[function_component(App)]
fn app() -> Html {
    let status = use_state(RuntimeStatus::default);
    let message = use_state(|| "正在连接 Rust 本地服务...".to_string());

    let refresh = {
        let status = status.clone();
        let message = message.clone();
        Callback::from(move |_| {
            let status = status.clone();
            let message = message.clone();
            spawn_local(async move {
                match Request::get("http://127.0.0.1:45175/bootstrap").send().await {
                    Ok(response) => match response.json::<RuntimeStatus>().await {
                        Ok(next) => {
                            status.set(next);
                            message.set("Rust UI 已通过本地 Rust API 读取运行状态".to_string());
                        }
                        Err(error) => message.set(format!("解析状态失败：{error}")),
                    },
                    Err(error) => message.set(format!("连接失败：{error}")),
                }
            });
        })
    };

    let refresh_button = {
        let refresh = refresh.clone();
        Callback::from(move |_| refresh.emit(()))
    };

    use_effect_with((), move |_| {
        refresh.emit(());
        || ()
    });

    html! {
        <main>
            <p class="eyebrow">{"MAGIC / FULL RUST UI SPIKE"}</p>
            <h1>{"Rust UI 运行链路验证"}</h1>
            <p class="lede">{"页面由 Rust 编译为 WASM，本地状态由 Rust 服务提供，OpenCode V1 仍作为外部执行进程。"}</p>
            <section class="status-grid" aria-label="运行状态">
                <StatusCard label="Magic Rust 服务" healthy={status.magic_healthy} detail={"http://127.0.0.1:45175/bootstrap".to_string()} />
                <StatusCard label="OpenCode V1" healthy={status.opencode_healthy} detail={status.opencode_pid.map_or("尚未启动".to_string(), |pid| format!("外部进程 PID {pid}"))} />
            </section>
            <button onclick={refresh_button}>{"刷新并发现 OpenCode"}</button>
            <p class="message" role="status">{(*message).clone()}</p>
            <p class="note">{"这是 Rust UI、Rust 本地服务和 OpenCode 接入验证，不包含 Magic 业务模型或数据库。"}</p>
        </main>
    }
}

#[derive(Properties, PartialEq)]
struct StatusCardProps {
    label: String,
    healthy: bool,
    detail: String,
}

#[function_component(StatusCard)]
fn status_card(props: &StatusCardProps) -> Html {
    html! {
        <article class="status-card">
            <div class="status-heading">
                <h2>{&props.label}</h2>
                <span class={classes!("badge", props.healthy.then_some("healthy"))}>{if props.healthy { "健康" } else { "未连接" }}</span>
            </div>
            <p>{&props.detail}</p>
        </article>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
