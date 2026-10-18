# Garage TV project instructions

Read `CODEX-HANDOFF.md` for the user's requirements, current implementation, publication authorization, test evidence and remaining work before changing this project.

Preserve the vanilla static architecture, one active YouTube player, free GitHub Pages hosting and replaceable minimalist black-and-white styling. Do not invent playlist identifiers, durations or claims of Xbox testing. Use real public sources only. Label continuous-playlist fallback separately from virtual broadcast synchronization.

Run checks appropriate to the change. `npm test` and `npm run build` need no dependency installation. `npm run test:browser` uses Playwright and controlled YouTube/gamepad doubles; it does not prove real playback or Xbox hardware behavior.

Use the PC's authorized GitHub connection. Never add credentials, personal tokens, `node_modules`, or local browser profiles to source or archives. Inspect and preserve existing remote work; do not force-push. Verify live URLs before claiming deployment or a working short link.
