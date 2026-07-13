import test from "node:test";
import assert from "node:assert/strict";

import {
  InvalidRecordError,
  MemoryStorageAdapter,
  ProjectRepository,
  RecordNotFoundError,
} from "../packages/storage/src/index.js";

function createProject(overrides = {}) {
  return {
    id: "project-1",
    name: "AI Relay",
    description: "Context portability across AI providers.",
    createdAt: "2026-07-13T12:00:00.000Z",
    updatedAt: "2026-07-13T12:00:00.000Z",
    currentState: {
      goal: "Ship the first alpha.",
      currentTask: "Build local storage.",
    },
    snapshotIds: [],
    ...overrides,
  };
}

test("ProjectRepository saves and loads a project", async () => {
  const repository = new ProjectRepository(new MemoryStorageAdapter());
  const project = createProject();

  await repository.save(project);
  const loaded = await repository.get(project.id);

  assert.deepEqual(loaded, project);
  assert.notEqual(loaded, project);
});

test("stored data is isolated from caller mutations", async () => {
  const repository = new ProjectRepository(new MemoryStorageAdapter());
  const project = createProject();

  await repository.save(project);
  project.name = "Mutated outside storage";

  const loaded = await repository.get(project.id);
  assert.equal(loaded.name, "AI Relay");
});

test("ProjectRepository lists projects by updatedAt descending", async () => {
  const repository = new ProjectRepository(new MemoryStorageAdapter());

  await repository.save(
    createProject({
      id: "older",
      name: "Older",
      updatedAt: "2026-07-12T12:00:00.000Z",
    }),
  );

  await repository.save(
    createProject({
      id: "newer",
      name: "Newer",
      updatedAt: "2026-07-13T12:00:00.000Z",
    }),
  );

  const projects = await repository.list();
  assert.deepEqual(
    projects.map(({ id }) => id),
    ["newer", "older"],
  );
});

test("ProjectRepository deletes projects", async () => {
  const repository = new ProjectRepository(new MemoryStorageAdapter());
  const project = createProject();

  await repository.save(project);
  assert.equal(await repository.exists(project.id), true);

  assert.equal(await repository.delete(project.id), true);
  assert.equal(await repository.exists(project.id), false);
});

test("ProjectRepository validates required project fields", async () => {
  const repository = new ProjectRepository(new MemoryStorageAdapter());

  await assert.rejects(
    repository.save({ id: "", name: "Invalid" }),
    InvalidRecordError,
  );

  await assert.rejects(
    repository.save({ id: "project-1", name: "" }),
    InvalidRecordError,
  );
});

test("ProjectRepository reports missing records", async () => {
  const repository = new ProjectRepository(new MemoryStorageAdapter());

  await assert.rejects(
    repository.get("missing"),
    RecordNotFoundError,
  );
});
