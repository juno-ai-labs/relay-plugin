# Relay for Claude Code

Relay keeps your Claude Code sessions on the same work in step. When one session settles a
decision, your other sessions on that work read it before they answer your next message, and
when two sessions decided opposite things, Relay asks you once.

## Install

Paste this into Claude Code and Claude does the rest:

```
Set up Relay for me, so my Claude Code sessions share decisions with each other.
1. Install the Relay plugin for my user account:
   claude plugin marketplace add juno-ai-labs/relay-plugin
   claude plugin install relay@relay --scope user
2. Tell me to quit and reopen the Claude app. After that, in any session, run /mcp,
   pick "plugin:relay:relay" and sign in with Google.
3. Once I'm signed in, explain in two sentences how to use it:
   say "relay this" in any session to link it to a piece of work.
```

## What is in this repository

Only the plugin: the address of the hosted Relay service and two hooks. The start hook tells each
session its Relay ID; the prompt hook asks Relay for updates before each message. Relay's service
code is not here.

What leaves your machine: the decisions a session writes down, never your code, files or
conversations.

This repository is published from the plugin folder of Relay's own repository; change the plugin
there, not here.
