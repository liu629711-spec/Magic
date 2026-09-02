use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use similar::TextDiff;
use yew::prelude::*;

#[derive(Clone, PartialEq)]
struct TaskRow {
    id: u32,
    title: String,
    status: &'static str,
}

fn markdown_to_plain_text(markdown: &str) -> String {
    Parser::new(markdown)
        .filter_map(|event| match event {
            Event::Text(text) | Event::Code(text) => Some(text.to_string()),
            Event::Start(Tag::Heading { .. }) | Event::End(TagEnd::Heading(_)) => Some("\n".to_string()),
            _ => None,
        })
        .collect()
}

fn diff_line_count(before: &str, after: &str) -> usize {
    TextDiff::from_lines(before, after)
        .iter_all_changes()
        .filter(|change| change.tag() != similar::ChangeTag::Equal)
        .count()
}

#[function_component(CapabilityProbe)]
fn capability_probe() -> Html {
    let selected = use_state(|| 1_u32);
    let tasks: Vec<_> = (1..=1000)
        .map(|id| TaskRow { id, title: format!("Task {id}"), status: if id % 2 == 0 { "running" } else { "unknown_after_restart" } })
        .collect();
    let markdown = markdown_to_plain_text("# Task\n\n**Result** is pending.");
    let changed_lines = diff_line_count("old\nvalue\n", "new\nvalue\n");

    let on_keydown = {
        let selected = selected.clone();
        Callback::from(move |event: KeyboardEvent| {
            if event.key() == "ArrowDown" { selected.set((*selected + 1).min(1000)); }
            if event.key() == "ArrowUp" { selected.set(selected.saturating_sub(1).max(1)); }
        })
    };

    html! {
        <main tabindex="0" onkeydown={on_keydown} aria-label="Magic UI capability probe">
            <h1>{"UI capability probe"}</h1>
            <p>{format!("selected task: {}", *selected)}</p>
            <p>{format!("markdown text: {markdown}; diff changes: {changed_lines}")}</p>
            <section aria-label="task list">
                { for tasks.iter().take(50).map(|task| html! {
                    <article key={task.id} aria-current={(*selected == task.id).then_some("true")}>
                        <span>{&task.title}</span><span>{task.status}</span>
                    </article>
                }) }
            </section>
            <pre aria-label="long execution log">{ for (0..10_000).map(|line| html! { <>{format!("event {line}\n")}</> }) }</pre>
            <p role="alert">{"error state: example service unavailable"}</p>
        </main>
    }
}

fn main() {
    yew::Renderer::<CapabilityProbe>::new().render();
}
