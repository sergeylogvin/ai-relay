import { InvalidRecordError } from "./errors.js";

const PROJECT_PREFIX = "project:";

function assertProject(project) {
  if (!project || typeof project !== "object") {
    throw new InvalidRecordError("Project must be an object.");
  }

  if (typeof project.id !== "string" || project.id.trim() === "") {
    throw new InvalidRecordError("Project id is required.");
  }

  if (typeof project.name !== "string" || project.name.trim() === "") {
    throw new InvalidRecordError("Project name is required.");
  }
}

function projectKey(id) {
  return `${PROJECT_PREFIX}${id}`;
}

export class ProjectRepository {
  constructor(adapter) {
    if (!adapter) {
      throw new InvalidRecordError("A storage adapter is required.");
    }

    this.adapter = adapter;
  }

  async save(project) {
    assertProject(project);

    const stored = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      project: structuredClone(project),
    };

    await this.adapter.put(projectKey(project.id), stored);

    return structuredClone(stored.project);
  }

  async get(id) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new InvalidRecordError("Project id is required.");
    }

    const stored = await this.adapter.get(projectKey(id));
    return structuredClone(stored.project);
  }

  async exists(id) {
    return this.adapter.has(projectKey(id));
  }

  async delete(id) {
    return this.adapter.delete(projectKey(id));
  }

  async list() {
    const records = await this.adapter.list(PROJECT_PREFIX);

    return records
      .map(({ value }) => structuredClone(value.project))
      .sort((left, right) =>
        String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")),
      );
  }
}
