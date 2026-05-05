# Claude Code agent guide

This file orients Claude Code in the **AI Assistant** Obsidian plugin repo. It is intentionally short and points to the existing sources of truth — *do not duplicate content here*.

## One-line summary

Obsidian community plugin that adds a single command — *Ask AI* — to send selected text (with `[[wikilinks]]` expanded) to Copilot / Claude / Claude-proxy / Gemini / a local CLI tool, and insert the response back into the note.

## Read before doing work

| Need | Read |
|---|---|
| Coding conventions, build/test commands, security & UX rules | [AGENTS.md](AGENTS.md) — **authoritative** |
| Architecture, module map, data flow, feature internals | [documentation/README.md](documentation/README.md) |
| What the plugin does (user-facing) | [README.md](README.md) |
| SDD workflow rules | [SDD process](#sdd-process) (this file) |

## Cardinal rules

- **For coding conventions, build commands, and policies, see [AGENTS.md](AGENTS.md). For architecture, see [documentation/](documentation/).** Do not duplicate either here.
- New features go through the SDD cycle described in [SDD process](#sdd-process) below. Each feature gets its own folder under `.sdd/` with a specification, an implementation plan, and one file per task.
- The plugin is **desktop-only** (`isDesktopOnly: true` in [manifest.json](manifest.json)) because the CLI provider uses Node `child_process`. Do not introduce code paths that break this.
- Stable IDs: command ids `ask-ai`, `ask-ai-with-template` and plugin id `ai-assistant` must never change after release ([AGENTS.md "Commands & settings"](AGENTS.md)).

## Quick commands

```bash
npm install
npm run dev    # esbuild watch
npm run build  # tsc -noEmit + esbuild prod
npm test       # vitest run
npm run lint   # eslint
```

## SDD process

Every new feature follows this cycle. Each feature gets its own folder under `.sdd/`.

1. **Create the feature folder.** Pick a short, lowercase, hyphenated name describing the feature (e.g. `ask-ai-rename`) and create `.sdd/<feature-name>/`.
2. **Write `specification.md`.** A detailed description of *what* the feature does and *why*, written for a human reader. No code, no implementation details — describe behavior, scope, constraints, and acceptance criteria.
3. **Write `ImplementationPlan.md`.** The technical plan: components touched, sequencing, risks, and references to each task. It must contain a checklist (markdown `- [ ]` items) where every item links to a `Task-N-taskname.md` file in the same folder.
4. **Write one file per task.** For each task in the plan, create `Task-N-taskname.md` where `N` is the task number starting at 1 and `taskname` is a short hyphenated label (e.g. `Task-1-rename-command.md`). Each task file describes only the changes scoped to that single task.
5. **Implement.** Work through the checklist in `ImplementationPlan.md`, ticking each item off as its task completes.

### Validation rules

A feature folder is valid only when all of the following hold:

- The folder name is short, lowercase, and hyphenated.
- `specification.md` exists and contains no code blocks describing implementation.
- `ImplementationPlan.md` exists and contains a checklist (`- [ ]` items) where every item links to a corresponding `Task-N-taskname.md` file.
- For every checklist item there is a matching `Task-N-taskname.md` file in the same folder, and for every task file there is a checklist item — no orphans on either side.
- Task files are numbered consecutively starting from 1 with no gaps.
- Each `Task-N-taskname.md` describes a single, focused change.

Existing flat files under `.sdd/` predate this convention and are kept as historical records — do not reformat them.

## Documentation map

```
README.md                       — end-user install and usage
AGENTS.md                       — coding conventions, build, policies (authoritative)
CLAUDE.md                       — this file (Claude Code pointer + SDD process)
documentation/                  — architecture, module map, data flow
└── README.md                   — index of architecture docs
.sdd/                           — SDD feature folders (one per feature)
└── <feature-name>/
    ├── specification.md        — what and why, no code
    ├── ImplementationPlan.md   — technical plan + task checklist
    └── Task-N-taskname.md      — one file per task
```
