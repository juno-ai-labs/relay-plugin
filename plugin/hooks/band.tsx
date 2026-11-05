import type { EngineInterface, Register } from 'claude-code'

/**
 * Keeps a line above the prompt for every disagreement open on this session's
 * Relay item: each conflict or mismatch Rally lists, as its problem and what
 * it breaks, with a button that opens the session that has to act and two
 * that take it off the list (resolved, or not an issue), and a line for
 * questions open between sessions. It shows the first three, most important
 * first as Rally orders them, and the rest on request. It refreshes after
 * each turn.
 */
const SERVER = 'plugin:relay:relay'

type Item = { text: string; raw: string; actor: string; sessionId: string | null; isThisSession: boolean }
type Open = { items: Item[]; questions: number } | null

let current: Open = null
let showAll = false

/** How many entries show before "+N more". */
const SHOWN = 3

async function refresh($: EngineInterface): Promise<void> {
  let next: Open = null
  try {
    const result = await $.mcp.call(SERVER, 'relay_state', { sessionId: await $.session.id() })
    const block = result.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined
    if (!result.isError && block?.text) {
      const state = JSON.parse(block.text) as {
        openQuestions?: unknown[]
        open?: Array<{ text: string; actor: string; actorSessionId: string | null; isThisSession: boolean }>
      }
      const items = (state.open ?? []).map(d => ({
        text: d.text.replace(/[.\s]+$/, ''),
        raw: d.text,
        actor: d.actor,
        sessionId: d.actorSessionId,
        isThisSession: d.isThisSession,
      }))
      const questions = state.openQuestions?.length ?? 0
      if (items.length > 0 || questions > 0) next = { items, questions }
    }
  } catch {
    // Not linked, or Relay unreachable: no line.
  }
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    current = next
    $.ui.invalidate('ui.render')
  }
}

/** Takes one entry off the item's open list, as the person decided, then redraws. */
async function resolve($: EngineInterface, raw: string, verdict: 'resolved' | 'not_an_issue'): Promise<void> {
  try {
    const result = await $.mcp.call(SERVER, 'relay_resolve', { sessionId: await $.session.id(), text: raw, verdict })
    if (result.isError) $.ui.toast('Relay could not take that entry off the list.')
  } catch {
    $.ui.toast('Relay is unreachable; the entry is still open.')
  }
  await refresh($)
}

/** Opens a session in the Claude app by the link the app answers from outside. */
async function openSession($: EngineInterface, sessionId: string): Promise<void> {
  const link = `claude://claude.ai/epitaxy/local_${sessionId}`
  try {
    await $.process.run(['open', link])
  } catch {
    $.ui.toast(`Could not open the session; its link is ${link}`)
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
    const { Box, Button, Text } = $.ui.resolve(e)
    const { items, questions } = current
    const shown = showAll ? items : items.slice(0, SHOWN)
    const hidden = items.length - shown.length
    return (
      // A step, not cells: the desktop sizes it to clear its native buttons; the terminal adds none.
      <Box flexDirection="column" rowGap="sm">
        {shown.map((item, i) => (
          <Box key={`open-${i}`} flexDirection="row" alignItems="center" columnGap="sm" flexWrap="wrap">
            <Text color="warning" weight="bold">
              ⚠ {item.text}.
            </Text>
            {item.isThisSession || item.sessionId === null ? (
              <Text color="warning">{item.isThisSession ? 'This session to fix.' : `${item.actor} to fix.`}</Text>
            ) : (
              <Button key={`go-${i}`} label={`Go to ${item.actor}`} onPress={() => openSession($, item.sessionId!)} />
            )}
            <Button key={`resolved-${i}`} label="Resolved" dimColor onPress={() => resolve($, item.raw, 'resolved')} />
            <Button key={`dismiss-${i}`} label="Not an issue" dimColor onPress={() => resolve($, item.raw, 'not_an_issue')} />
          </Box>
        ))}
        {hidden > 0 || (showAll && items.length > SHOWN) ? (
          <Button
            key="more"
            label={showAll ? 'Show fewer' : `+${hidden} more`}
            dimColor
            onPress={() => {
              showAll = !showAll
              $.ui.invalidate('ui.render')
            }}
          />
        ) : null}
        {questions > 0 ? (
          <Text color="warning" weight="bold">
            ⚠ {questions} open question{questions === 1 ? '' : 's'} between your sessions.
          </Text>
        ) : null}
      </Box>
    )
  })
}
