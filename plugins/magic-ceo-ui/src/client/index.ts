import { CeoDecisionDock } from './CeoDecisionDrawer.ts'
import { CeoDelegateRow } from './CeoDelegateRow.ts'
import { CeoTeamGraph } from './CeoTeamGraph.ts'
import { CeoWorkspace } from './CeoWorkspace.ts'
import { inject, registerCeoUi } from './register.ts'

export { inject }

export function apply(ctx: Parameters<typeof registerCeoUi>[0]) {
  registerCeoUi(ctx, {
    graph: CeoTeamGraph,
    row: CeoDelegateRow,
    workspace: CeoWorkspace,
    drawer: CeoDecisionDock,
  })
}
