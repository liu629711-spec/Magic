# @magic/dsh-ceo-ui

Magic CEO client plugin for DeepSeek Harness.

It folds this turn's `ceo_delegate` `tasks[]` run graph into one `ceo-team` conversation node and renders a React Flow canvas in the assistant transcript: dotted background, pan/zoom, this turn's goal, run nodes in dependency columns, and a CEO sink, with edges for fan-out, `depends_on`, and reports. Member `send_message` and settlement notices update a session roster. Clicking a node opens the right-column workspace with the task, report, blockers, and decisions. The empty workspace lists nodes that need a decision, are blocked, or failed. A decision is sent as a new turn in the current CEO session; the session lead forwards it with `send_message`.
