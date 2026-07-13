# Data Model

## Workspace

A collection of related projects.

## Project

The persistent unit of user work.

Fields:

- id
- name
- description
- classification
- createdAt
- updatedAt
- currentState
- snapshotIds

## Project State

Structured context required to continue work:

- goal
- currentTask
- constraints
- decisions
- completedWork
- pendingTasks
- references
- fileReferences
- notes

## Snapshot

An immutable version of project state at a point in time.

## Session

A work interaction associated with one provider.

## Handoff

A reviewed, portable context package generated from a project state and recent session data.
