#!/bin/sh
# Tells Claude this session's Relay session_id, and that it is a fork when it is one.
# Runs before MCP servers connect, so it makes no network call. POSIX sh only: no
# interpreter is assumed on the person's machine.
input=$(cat)
field() { printf '%s' "$input" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n 1; }
session_id=$(field session_id)
source=$(field source)
context="Relay session_id: ${session_id} (start source: ${source})."
if [ "$source" = "fork" ]; then
  context="$context This session is a fork. Do not ask about Relay: if your conversation shows an earlier relay_join, link this session to that item with relay_join and this fork's own purpose before anything else; if it shows none, leave it unlinked."
fi
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$context"
