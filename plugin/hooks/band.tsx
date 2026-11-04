import type { EngineInterface, Register } from 'claude-code'

/**
 * Keeps a line above the prompt while this session's Relay item has a
 * disagreement open: a conflict or mismatch Rally flagged, or a question
 * between sessions. A mismatch told once inside a message was missed on
 * 2026-11-04; this line stays until Rally's next answer clears it.
 */
const SERVER = 'plugin:relay:relay'

type Disagreement = { title: string; text: string } | null

let current: Disagreement = null

async function refresh($: EngineInterface): Promise<void> {
  let next: Disagreement = null
  try {
    const result = await $.mcp.call(SERVER, 'relay_state', { sessionId: await $.session.id() })
    const block = result.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined
    if (!result.isError && block?.text) {
      const state = JSON.parse(block.text) as { title: string; rallyFlag: string | null; openQuestions: unknown[] }
      const questions = state.openQuestions.length
      if (state.rallyFlag || questions > 0) {
        next = {
          title: state.title,
          text: state.rallyFlag ?? `${questions} open question${questions === 1 ? '' : 's'} between your sessions`,
        }
      }
    }
  } catch {
    // Not linked, or Relay unreachable: no line.
  }
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    current = next
    $.ui.invalidate('ui.render')
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    void refresh($)
    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await refresh($)
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (current === null || e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text color="warning" weight="bold">
          ⚠ Relay: your sessions disagree on "{current.title}".{' '}
        </Text>
        <Text>{current.text}</Text>
      </Box>
    )
  })
}
