import {
  buildLibraryAnalytics,
  formatAnalyticsBytes,
  getLibraryHealthInsights
} from "../../../packages/library/src/analytics.js";

function createMetric(label, value) {
  const item = document.createElement("div");
  item.className = "library-analytics__metric";

  const number = document.createElement("strong");
  number.textContent = String(value);

  const title = document.createElement("span");
  title.textContent = label;

  item.append(number, title);
  return item;
}

function createBreakdown(title, rows) {
  const section = document.createElement("section");
  section.className = "library-analytics__breakdown";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const list = document.createElement("ol");

  for (const row of rows.slice(0, 8)) {
    const item = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = row.name;

    const count = document.createElement("strong");
    count.textContent = String(row.count);

    item.append(name, count);
    list.append(item);
  }

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No data yet.";
    section.append(heading, empty);
    return section;
  }

  section.append(heading, list);
  return section;
}

export function renderLibraryAnalytics({
  root,
  analytics,
  status = ""
}) {
  if (!root) {
    throw new Error("Library analytics root is required.");
  }

  root.replaceChildren();

  const header = document.createElement("div");
  header.className = "library-analytics__header";

  const heading = document.createElement("h2");
  heading.textContent = "Library insights";

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.dataset.action = "refresh-analytics";
  refresh.textContent = "Refresh";

  header.append(heading, refresh);

  const metrics = document.createElement("div");
  metrics.className = "library-analytics__metrics";

  metrics.append(
    createMetric(
      "Conversations",
      analytics.totals.conversations
    ),
    createMetric("Pinned", analytics.totals.pinned),
    createMetric("Tagged", analytics.totals.tagged),
    createMetric(
      "In collections",
      analytics.totals.inCollections
    ),
    createMetric(
      "Active in 30 days",
      analytics.activity.last30Days
    ),
    createMetric(
      "Duplicate groups",
      analytics.totals.duplicateGroups
    )
  );

  const activity = document.createElement("section");
  activity.className = "library-analytics__activity";

  const activityHeading = document.createElement("h3");
  activityHeading.textContent = "Activity";

  const activityText = document.createElement("p");
  activityText.textContent =
    `${analytics.activity.last7Days} in 7 days · ` +
    `${analytics.activity.last30Days} in 30 days · ` +
    `${analytics.activity.last90Days} in 90 days`;

  activity.append(activityHeading, activityText);

  const storage = document.createElement("section");
  storage.className = "library-analytics__storage";

  const storageHeading = document.createElement("h3");
  storageHeading.textContent = "Estimated storage";

  const storageText = document.createElement("p");
  storageText.textContent =
    `${formatAnalyticsBytes(
      analytics.storage.estimatedBytes
    )} total · ` +
    `${formatAnalyticsBytes(
      analytics.storage.averageRecordBytes
    )} average`;

  storage.append(storageHeading, storageText);

  const breakdowns = document.createElement("div");
  breakdowns.className = "library-analytics__breakdowns";
  breakdowns.append(
    createBreakdown("Providers", analytics.providers),
    createBreakdown("Domains", analytics.domains)
  );

  const insightSection = document.createElement("section");
  insightSection.className = "library-analytics__insights";

  const insightHeading = document.createElement("h3");
  insightHeading.textContent = "Insights";

  const insightList = document.createElement("ul");

  for (const insight of getLibraryHealthInsights(analytics)) {
    const item = document.createElement("li");
    item.dataset.level = insight.level;
    item.textContent = insight.message;
    insightList.append(item);
  }

  insightSection.append(insightHeading, insightList);

  const statusElement = document.createElement("p");
  statusElement.className = "library-analytics__status";
  statusElement.textContent = status;

  root.append(
    header,
    metrics,
    activity,
    storage,
    breakdowns,
    insightSection,
    statusElement
  );
}

export function initializeLibraryAnalyticsUI({
  root,
  loadRecords,
  loadDuplicateGroups = async () => [],
  referenceDate
}) {
  if (!root) {
    return null;
  }

  let analytics = buildLibraryAnalytics([], {
    referenceDate,
    duplicateGroups: []
  });

  async function refresh() {
    renderLibraryAnalytics({
      root,
      analytics,
      status: "Calculating insights…"
    });

    try {
      const [records, duplicateGroups] = await Promise.all([
        loadRecords(),
        loadDuplicateGroups()
      ]);

      analytics = buildLibraryAnalytics(records, {
        referenceDate,
        duplicateGroups
      });

      renderLibraryAnalytics({
        root,
        analytics,
        status: `Updated ${new Date(
          analytics.generatedAt
        ).toLocaleString()}.`
      });

      document.dispatchEvent(
        new CustomEvent("ai-relay:library-analytics-updated", {
          detail: analytics
        })
      );
    } catch (error) {
      renderLibraryAnalytics({
        root,
        analytics,
        status:
          error instanceof Error
            ? error.message
            : "Unable to calculate library insights."
      });
    }
  }

  root.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "refresh-analytics") {
      refresh();
    }
  });

  document.addEventListener(
    "ai-relay:library-records-changed",
    refresh
  );
  document.addEventListener(
    "ai-relay:library-preferences-changed",
    refresh
  );

  refresh();

  return {
    refresh,
    getAnalytics: () => analytics
  };
}
