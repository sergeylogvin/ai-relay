# ADR-0036: Browser user release packaging

## Status

Accepted

## Decision

Create a repeatable browser release pipeline that builds and validates the
extension, produces a ZIP archive and SHA-256 checksum, publishes GitHub
workflow artifacts, and documents installation and privacy.

The first public distribution uses Chromium Developer mode. Store publication
remains a later distribution channel.
