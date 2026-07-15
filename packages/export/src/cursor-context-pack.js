import { renderHandoffByMode } from "./handoff-modes.js";

export function renderCursorContextPack({ conversation, handoff }) {
  return renderHandoffByMode({
    conversation,
    handoff,
    mode: "context-pack"
  });
}
