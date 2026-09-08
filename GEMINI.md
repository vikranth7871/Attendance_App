# Global Rules & Memory

These rules apply to every session and project in this workspace.

## User Profile

- The user is a **beginner** in software engineering and tooling.
- Always prefer the **simplest solution that actually works** (avoid over-engineering, unnecessary abstractions, and speculative features).
- Explain important decisions and technical reasoning in plain language; avoid unnecessary jargon.
- When multiple options exist, recommend one clearly and say why, instead of listing options without a verdict.

## Workflow Rules

- For any multi-step task (5+ tool calls or longer), use the **planning-with-files** skill and maintain `task_plan.md`, `findings.md`, and `progress.md` on disk so work survives context loss.
- Understand the requirement before planning; verify work before declaring it done.
- Prefer incremental, reviewable changes over big rewrites.

## Subagent Usage Guide

Use these subagents for specialized work instead of doing everything inline:

| Subagent | Use for |
|---|---|
| `webfetch` | External technical research: technologies, libraries, APIs, comparisons, docs |
| `architect` | System architecture, technology selection, high-level design |
| `apparchitect` | Application-layer design: APIs, forms, validation, state management |
| `engineer` | Implementation: features, bug fixes, refactoring |
| `database` | Data modeling, schema design, queries, migrations |
| `security` | Security reviews, vulnerability and risk assessment |
| `performance` | Bottleneck analysis, caching, optimization |
| `reviewer` | Code review, quality checks, production-readiness verification |
| `debugger` | Root cause analysis of failures and incidents |
| `devops` | CI/CD, deployment, infrastructure, operations |
| `docs` | Technical documentation, guides, release notes |
| `designer` | UX/UI design, wireframes, design systems |
| `gitagent` | Designing Git/GitHub agent ecosystems: hierarchy, governance, validation pipelines |
| `testing-engineer` | Automated test suites across web, backend, mobile (Jest, Cypress, Detox, etc.) |
| `gitorchestrator` | Coordinating Git/GitHub workflows with validation and governance gates |
| `agent-orchestrator` | Coordinating multiple specialized subagents on full engineering tasks |

## Automatic Subagent Deployment

When given a task or prompt, analyze it first and automatically deploy the right subagent(s) based on the requirements:

1. **Understand the task**: identify what the request needs — research, architecture, application design, implementation, database work, security, performance, quality review, debugging, DevOps, documentation, design, or multi-domain coordination.
2. **Single-domain task** → dispatch the one matching subagent from the table above, with a clear, complete prompt (context, requirements, expected output).
3. **Multi-domain task** → dispatch subagents in dependency order: research → architecture → application design → implementation → review (reviewer, security, performance) → devops/docs. For full engineering tasks, coordinate via `agent-orchestrator`.
4. **Simple or small tasks** → handle inline; do not over-delegate.
5. **Skills on dispatch**: when dispatching a subagent, provide relevant skills and instructions for its task (planning-with-files first for any multi-step task).

## Conventions

- Never commit or print secrets, API keys, or tokens.
- Follow existing project conventions and coding standards; match the style of surrounding code.
- Keep the working directory clean: remove temp files and obsolete code when done.

