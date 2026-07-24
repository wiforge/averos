# Via pnpm scripts (simple)
pnpm run smoke:all
pnpm run integration:all
pnpm run e2e

# Via Nx (with task graph, caching, dependency awareness)
pnpm nx smoke scripts
pnpm nx integration scripts
pnpm nx e2e scripts
pnpm nx integration:executor scripts