# AI Relay Product Charter

## Mission

Give people ownership and portability of their AI-assisted work.

## Problem

Work performed in Claude, ChatGPT, Gemini, and other AI applications is isolated inside provider-specific chats. When limits are reached or a user changes providers, reconstructing context is slow, error-prone, and potentially unsafe.

## Product direction

AI Relay maintains a provider-independent project state and creates controlled handoff packages for continuing work in another AI application.

## Core principles

1. Local first
2. Privacy by design
3. Explicit user confirmation before transfer
4. Provider-independent core
5. Open and human-readable formats
6. No telemetry by default
7. Minimum required permissions

## Initial scope

- Capture visible conversations from Claude, ChatGPT, and Gemini
- Produce structured handoff context
- Store projects and snapshots locally
- Review and redact data before transfer
- Open another provider for manual continuation
- Support Safari and Chromium browsers

## Non-goals for the first release

- Cloud synchronization
- Automatic message submission
- Session-cookie extraction
- Unofficial account APIs
- Automatic transfer of uploaded files
