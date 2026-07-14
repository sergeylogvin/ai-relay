# ADR 0037: Rich capture metadata

## Decision

Browser captures include a portable metadata object with:

- provider version;
- conversation identifier;
- capture timestamp;
- best-effort visible model name;
- message count;
- estimated token count;
- attachment, image, and artifact counts.

## Rationale

Portable handoffs are more useful when downstream tools can understand where a
conversation came from and estimate its size without parsing the rendered page
again.

Model and asset detection are intentionally best-effort. Missing values remain
`null` or `0`; capture must not fail because optional metadata is unavailable.

## Privacy

All metadata is derived locally from the active page. No data is sent to an
external service.
