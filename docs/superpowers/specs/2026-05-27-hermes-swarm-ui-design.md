# Hermes Swarm UI — Design Spec

**Date:** 2026-05-27
**Status:** Approved

---

## Overview

A standalone web app that connects to a locally-running Hermes gateway and provides a multi-agent workspace. Users can see all their Hermes profiles as named agents, chat with each individually, and coordinate parallel work through a captain agent that proposes task breakdowns for human approval before dispatching to workers.

---

## Architecture

### Backend — Express.js (WSL, port 3000)

- Serves the compiled React frontend as static files
- Returns a fixed "captain" entry (default Hermes profile at `~/.hermes/`) plus all profiles discovered from `~/.hermes/profiles/`
- Watches `~/.hermes/profiles/` with `chokidar` and pushes updates over WebSocket when profiles are added or removed
- Exposes REST endpoints the frontend calls:
  - `GET /api/profiles` — returns the captain entry + discovered profile list
  - `POST /api/chat` — proxies a message to Hermes and streams the response back
- All agents talk to the same Hermes gateway at `localhost:8642` — profiles are for naming and UI identity only
- Injects `X-Hermes-Session-Id: agent-{profileName}` on every Hermes request to keep each agent's conversation history isolated and persistent
- Re-emits Hermes SSE streaming events to the frontend over WebSocket so responses render word-by-word

### Frontend — React 19 + Vite + TypeScript + Tailwind

- Single-page app
- Communicates with the Express backend (not directly with Hermes)
- WebSocket connection to backend for streaming responses and live profile updates

### Project layout

```
hermes-swarm-ui/
  client/          # React + Vite frontend
  server/          # Express backend
  docs/
```

Runs at `localhost:3000`. Backend runs inside WSL; frontend is served by the same Express process.

---

## Components

### Sidebar

- Lists the captain (fixed, always present) plus all discovered agents from `~/.hermes/profiles/`
- Captain is the default Hermes profile (`~/.hermes/`), pinned at top with a star icon; it is not a subfolder in profiles/
- Live-updates when profile folders are added or removed (chokidar → WebSocket push)
- Each agent shows a status dot: idle / thinking / responding
- Clicking an agent opens its chat in the main panel

### Chat Window

- Standard chat bubble layout — user messages right, agent messages left
- Each agent has its own conversation history, isolated by `X-Hermes-Session-Id`
- Streaming: agent responses render token-by-token as they arrive via WebSocket
- Switching agents in the sidebar swaps the chat view; prior conversations remain intact

### Captain Task Panel

- Appears inside the Captain's chat view
- User sends a plain-text goal (e.g., "Research competitor pricing and write a summary")
- Captain's system prompt instructs it to respond with a numbered task list when given a multi-step goal
- The UI parses that response into task cards, each with an agent assignment dropdown
- User reviews and adjusts assignments, then clicks **Dispatch**
- The frontend sends one `POST /api/chat` per task simultaneously — each routed to the assigned agent's session

---

## Data Flow

1. **Profile discovery**
   - Express scans `~/.hermes/profiles/` on startup → returns folder names as agent list
   - `chokidar` watches the directory → pushes `profiles-updated` event over WebSocket on change
   - Frontend re-renders sidebar with no page reload

2. **Sending a message**
   - Frontend: `POST /api/chat { profileName, message }`
   - Backend: forwards to `POST localhost:8642/v1/messages` with `X-Hermes-Session-Id: agent-{profileName}`
   - Hermes streams SSE response events
   - Backend pipes events to frontend over WebSocket
   - Frontend renders tokens as they arrive

3. **Captain task dispatch**
   - User sends goal to captain's chat via normal message flow
   - Captain responds with numbered task list (formatted by system prompt)
   - Frontend parses response into task cards with agent dropdowns
   - User approves and optionally reassigns tasks, then clicks Dispatch
   - Frontend fires parallel `POST /api/chat` for each task to its assigned agent

4. **Memory persistence**
   - No extra sync needed — Hermes writes memories and learnings back to the profile's `HERMES_HOME` (`~/.hermes/profiles/{name}/`) automatically
   - The app reads from those same folders, so changes are immediately reflected on next profile scan

---

## Error Handling

- **Hermes unreachable**: Backend returns a 503 to the frontend; chat shows an inline error banner "Can't reach Hermes — is the gateway running?"
- **Profile folder disappears mid-session**: Sidebar removes the agent; open chat for that agent shows a notice that the profile is no longer available
- **Stream interrupted**: WebSocket disconnect triggers an auto-reconnect with exponential backoff (up to 30s); if reconnect fails, the chat input is disabled with a visible status message
- **Captain task parse failure**: If the captain's response can't be parsed into a task list, the UI falls back to rendering it as a plain chat message — no crash

---

## Captain System Prompt

The captain agent (default Hermes profile) gets a system prompt addendum telling it to format multi-step goals as a numbered list:

> When given a goal that requires multiple steps or multiple agents, respond with a numbered task list. Each item should be one clear, actionable task on a single line. Example:
> 1. Research competitor pricing
> 2. Write ad copy targeting price-conscious buyers
> 3. Schedule three posts for next week

The UI uses this format to split the response into dispatchable task cards.

---

## Out of Scope

- Authentication / multi-user support
- Agent-to-agent communication (agents don't call each other directly; the user is the coordinator)
- Custom agent avatars or theming (planned for later)
- Mobile layout

