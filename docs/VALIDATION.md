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

The PC fetched the public NostalgiaTV playlists page on 2026-10-18. It exposed three titled playlists: “Sports,” “Indie / Pop,” and “Animation.” The first two IDs were added to channels 001 and 002; “Animation” did not match the remaining channel names. Both playlist URLs returned HTTP 200, but actual embeddability, item availability, and Xbox playback remain unverified. Channels 003–004 still need matching public playlist URLs.

The earlier cloud connection could not publish. On 2026-10-18, the PC's GitHub CLI authenticated as WussupLee with `repo` and `workflow` scopes. The project was committed on top of the existing repository history and pushed to `main`. GitHub Pages was configured for Actions; the deployment workflow completed successfully. The live page at `https://wussuplee.github.io/garage-tv/` and every CSS, JavaScript and default-config asset returned HTTP 200. The free short link `https://zip1.io/garagetvlee` returned HTTP 302 to that Pages URL, then HTTP 200. This verifies HTTP delivery, not physical Xbox playback.

Screenshots produced by the browser suite are available locally in `test-results/`; the guide's video area is empty because it uses an API test double. For real console validation follow XBOX-TESTING.md.

## PC handoff update

The 403 upload failures recorded in CODEX-HANDOFF.md are historical. Local GitHub authentication completed the upload and Pages deployment. Two default YouTube playlists remain unconfigured, and the physical-console checklist in XBOX-TESTING.md remains open.

On the PC, all six unit tests and the static build passed after adding the two verified playlists. The controlled browser suite passed in installed Microsoft Edge at 720p/1080p, including the missing-Gamepad-API and blocked-YouTube-API cases. Its local static server was corrected to use the operating system's path separator on Windows. Browser tests still use a YouTube API double and do not establish real playback.
