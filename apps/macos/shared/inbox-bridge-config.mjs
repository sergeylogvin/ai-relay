export const HANDOFF_INBOX_HTTP_PORT = 17831;
export const HANDOFF_INBOX_HTTP_ORIGIN = `http://127.0.0.1:${HANDOFF_INBOX_HTTP_PORT}`;
export const HANDOFF_INBOX_HTTP_STORE_PATH = "/handoff";

export function resolveHandoffInboxStoreUrl(
  origin = HANDOFF_INBOX_HTTP_ORIGIN,
  path = HANDOFF_INBOX_HTTP_STORE_PATH
) {
  return `${origin}${path}`;
}
