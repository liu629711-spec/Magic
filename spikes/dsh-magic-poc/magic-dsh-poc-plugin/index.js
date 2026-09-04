import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const name = 'magic-dsh-poc-plugin'
export const inject = ['workspaceRegistry', 'sessionController', 'sessions']

function workspaceView(workspace) {
  return {
    id: workspace.id,
    path: workspace.path,
    title: workspace.title,
    sessionIds: [...workspace.sessionIds],
  }
}

export function apply(ctx) {
  const evidencePath = process.env.MAGIC_DSH_POC_EVIDENCE
  const workspacePath = process.env.MAGIC_DSH_POC_WORKSPACE
  if (evidencePath === undefined || workspacePath === undefined) {
    throw new Error('MAGIC_DSH_POC_EVIDENCE and MAGIC_DSH_POC_WORKSPACE are required')
  }

  const events = []
  const writeEvidence = async (phase, extra = {}) => {
    await mkdir(dirname(evidencePath), { recursive: true })
    await writeFile(evidencePath, `${JSON.stringify({
      phase,
      plugin: name,
      generatedAt: new Date().toISOString(),
      services: {
        workspaceRegistry: typeof ctx.workspaceRegistry.create === 'function',
        sessionController: typeof ctx.sessionController.create === 'function',
        sessions: typeof ctx.sessions.list === 'function',
      },
      workspaces: ctx.workspaceRegistry.list().map(workspaceView),
      liveSessions: ctx.sessions.list().map(session => ({
        id: session.id,
        cwd: session.header.cwd,
        createdAt: session.header.createdAt,
      })),
      events,
      ...extra,
    }, null, 2)}\n`, 'utf8')
  }

  ctx.on('session/created', (session) => {
    events.push({ type: 'session/created', sessionId: session.id })
    void writeEvidence('event-observed')
  })
  ctx.on('session/event', (session, event) => {
    events.push({ type: 'session/event', sessionId: session.id, eventType: event.type })
    void writeEvidence('event-observed')
  })

  void (async () => {
    await writeEvidence('services-ready')
    const workspace = await ctx.workspaceRegistry.create(workspacePath, 'Magic DSH validation')
    const existingSessionId = workspace.sessionIds[0]
    const created = existingSessionId === undefined
      ? await ctx.sessionController.create({ workspaceId: workspace.id })
      : { sessionId: existingSessionId, reused: true }
    events.push({
      type: 'magic/validation-created',
      workspaceId: workspace.id,
      sessionId: created.sessionId,
    })
    await writeEvidence('completed', { created })
  })().catch(async (error) => {
    await writeEvidence('failed', {
      failure: error instanceof Error ? error.message : String(error),
    })
  })
}
