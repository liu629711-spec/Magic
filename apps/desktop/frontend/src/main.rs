//! Magic 桌面前端 —— 界面设计定稿前的占位壳。
//! 功能逻辑层（crates/frontend：ApiClient / 幂等键派生 / DTO，16 项测试全绿）已就绪；
//! 毛坯界面已清理，待高保真设计定稿后重建正式界面。

mod state;
mod transport;

use yew::prelude::*;

#[function_component(App)]
fn app() -> Html {
    html! {
        <div class="app">
            <aside class="sidebar">
                <div class="brand">{"Magic"}</div>
                <div class="sidebar-spacer"></div>
            </aside>
            <main class="content">
                <div class="empty-note">
                    {"界面设计定稿中。功能逻辑层已就绪（创建 / 派发 / 查询 / 对账链路已在真实服务验证通过）。"}
                </div>
            </main>
        </div>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
