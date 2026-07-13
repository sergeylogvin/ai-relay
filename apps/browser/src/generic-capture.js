const ROLE_SELECTORS = Object.freeze({
  user: [
    '[data-message-author-role="user"]',
    '[data-testid*="user"]',
    '[class*="user-message"]',
    '[class*="human-message"]'
  ],
  assistant: [
    '[data-message-author-role="assistant"]',
    '[data-testid*="assistant"]',
    '[class*="assistant-message"]',
    '[class*="model-response"]'
  ]
});

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function closestRole(element) {
  if (!(element instanceof Element)) return null;

  for (const [role, selectors] of Object.entries(ROLE_SELECTORS)) {
    if (selectors.some((selector) => element.matches(selector))) {
      return role;
    }
  }

  return null;
}

function collectByRoleSelectors(root) {
  const found = [];

  for (const [role, selectors] of Object.entries(ROLE_SELECTORS)) {
    for (const selector of selectors) {
      for (const element of root.querySelectorAll(selector)) {
        const content = cleanText(element.innerText ?? element.textContent);
        if (!content) continue;

        found.push({
          role,
          content,
          position: element.compareDocumentPosition(root) ? 0 : 0,
          element
        });
      }
    }
  }

  found.sort((left, right) => {
    if (left.element === right.element) return 0;

    const relation = left.element.compareDocumentPosition(right.element);
    if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  const deduplicated = [];
  const seen = new Set();

  for (const item of found) {
    const key = `${item.role}:${item.content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    deduplicated.push({
      role: item.role,
      content: item.content
    });
  }

  return deduplicated;
}

function collectFallback(root) {
  const candidates = [
    ...root.querySelectorAll(
      'main article, main [role="article"], main [data-testid*="message"]'
    )
  ];

  return candidates
    .map((element, index) => {
      const content = cleanText(element.innerText ?? element.textContent);
      if (!content) return null;

      const explicitRole = closestRole(element);
      const role =
        explicitRole ??
        (index % 2 === 0 ? "user" : "assistant");

      return { role, content };
    })
    .filter(Boolean);
}

export function captureVisibleConversation(root = document) {
  const primary = collectByRoleSelectors(root);
  if (primary.length > 0) return primary;

  return collectFallback(root);
}
