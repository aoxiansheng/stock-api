# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts the NestJS modules (alert, appcore, providers, etc.), with `app.module.ts` wiring dependencies and `main.ts` starting the HTTP/WebSocket server.
- `test/` mirrors the module tree: Jest units in `test/jest/unit`, integrations in `test/jest/integration`, manual scenarios in `test/manual`, and performance benches in `test/performance`.
- `scripts/` and `tools/` provide linting, migration, and automation helpers; `docker/` contains compose templates; `docs/` holds design notes and runbooks that should be consulted before large refactors.

## Build, Test, and Development Commands
- `bun install` (fallback: `npm install`) prepares dependencies.
- `bun dev` runs the watcher, while `bun start` and `bun start:prod` launch non-watch builds.
- `bun run build` compiles TypeScript with `tsconfig.build.json`.
- Quality gates: `bun run lint`, `bun run format:check`, `bun run security:deps`.
- Test slices: `bun run test:unit`, `bun run test:integration`, `npm run test:e2e:core`, or the umbrella `npm run test`.

## Coding Style & Naming Conventions
TypeScript + NestJS patterns are mandatory. Prettier (two-space indent) and ESLint enforce formatting; rely on `bun run format` and `bun run lint` before committing. Import shared strings from the `*.constants.ts` files because the eslint rules block hard-coded transformation or API identifiers. Time metrics must end with `Ms` (`processingTimeMs`, `averageResponseTimeMs`) to satisfy the migration checks. Keep filenames kebab-case and align directory names with the owning feature.

## Testing Guidelines
Jest configs live in `test/config/jest.*.config.js`. Name specs `<feature>.spec.ts` and place them beside the corresponding feature folder under `test/jest`. Use `npm run test:unit:coverage` or `npm run test:integration:coverage` to refresh reports in `coverage/`. Performance work should extend the harnesses in `test/performance` and commit summarized JSON results under `reports/`. Record any manual checklist you execute in `test/manual` to keep the docs in sync.

## Commit & Pull Request Guidelines
History uses brief, descriptive subjects (often Chinese); continue that style and add context in the body when needed. Reference touched modules or scripts, and list the commands you ran. Pull requests should state the problem, outline the solution, link to relevant docs in `docs/`, and attach lint/test evidence. Give reviewers screenshots or logs for API or monitoring changes and call out breaking contracts ahead of merge.

## Security & Configuration Tips
Follow `docs/ENVIRONMENT_CONFIGURATION.md` and `environment-variables-standards.md` for environment values; keep secrets in untracked `.env` files. Register new providers or queues in `src/app.module.ts` and update the throttling notes if you alter rate limits. Run `bun run security:deps` during dependency bumps and consult `docs/常用命令.md` for operational tasks.
