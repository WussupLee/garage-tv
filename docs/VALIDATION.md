# Validation record

Tested in this cloud workspace on 2026-10-18, with Node.js 24 and desktop headless Chromium. This is not a physical Xbox test record.

## Passed

- Six unit tests: defaults, playlist/URL validation, required unique channels, verified-duration requirements, startup eligibility, schedule advancement and repeatable seeded shuffle.
- Static production build: runtime files copied to `dist/`, configuration validated, relative paths served successfully under the `/garage-tv/` GitHub Pages project prefix. No production dependency installation required.
- Browser integration at 1280×720 and 1920×1080, plus a 640×360 overflow check.
- Five channels rendered; guide opens/closes and tracks tuned versus selected row.
- Channel switching sends a distinct playlist source to one reusable player.
- Temporary channel overlay appears and expires.
- Settings persist across refresh; invalid playlist links and malformed JSON fail without replacing valid configuration.
- Live Sports shortcut uses the requested URL with same-tab navigation. Add/edit/remove service controls work.
- Autoplay-blocked and player error 153 display recovery controls; retry can resume through the controlled API.
- Standard gamepad fixture: holding a bumper triggers once; release/repress triggers again. Raw controller diagnostics render. Missing Gamepad API preserves keyboard controls.
- Controlled virtual schedule return: first tune requests offset 1200 seconds, then after leaving and advancing the clock five minutes, returning requests offset 1500 seconds.

## Verification limits and publishing

YouTube playback and Gamepad API inputs in the integration suite use a controlled test double. Playlist identifiers used in tests are syntax fixtures only and are never included in the deployable defaults. No real YouTube playlist or Xbox controller behavior has been verified. No default durations or schedules are provided. Real video seek timing remains experimental. The supplied third-party live site has not been tested for playback or streaming rights.

Public playlists could not be discovered: web reader throttled, indexed search empty, direct YouTube request denied by the network proxy. Channels 001–004 require the user's public playlist URLs in Settings.

The GitHub CLI authenticated as WussupLee when network access was enabled. Creating `WussupLee/garage-tv` failed with `does not have the correct permissions to execute CreateRepository`. Repository API lookup returned 404. The intended Pages URL `https://wussuplee.github.io/garage-tv/` also returned HTTP 404. **No live deployment is claimed.** README.md provides repository creation, source upload and GitHub Pages setup steps for a PC login or a connected app with access to an existing repository.

Screenshots produced by the browser suite are available locally in `test-results/`; the guide's video area is empty because it uses an API test double. For real console validation follow XBOX-TESTING.md.

## PC handoff update

The user subsequently created the public repository https://github.com/WussupLee/garage-tv with a README. Upload was attempted through Git and the connected GitHub API; both were denied with 403. No app code was pushed. The package now includes AGENTS.md and CODEX-HANDOFF.md for continuation in Codex on the PC using local GitHub authentication. The original repository 404 above is historical; no live deployment has been verified.
