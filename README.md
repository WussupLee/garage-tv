# Garage TV — Xbox One MVP

Minimal static television application for Microsoft Edge on Xbox One, targeting 1280×720 and supporting 1080p. HTML, CSS and JavaScript; no backend, API keys, paid services or runtime dependencies. The approved B — Local Station design uses local SVG identity assets, DejaVu Sans Mono fonts, and a uniformly scaled 1280×720 stage.

**Publication status (2026-10-18):** live at https://wussuplee.github.io/garage-tv/. The free, easy-to-type redirect https://zip1.io/garagetvlee was verified to reach the live app. Source: https://github.com/WussupLee/garage-tv.

## Run on your PC

Install Node.js LTS from https://nodejs.org/ if needed. Unzip the package and double-click **Start-Garage-TV.cmd** on Windows. Open http://localhost:4173/garage-tv/ in Edge and keep the command window running. On macOS/Linux or in a terminal:

```sh
npm run build
npm run serve
```

These commands need no `npm install`. Use an HTTP server rather than double-clicking index.html: modules, configuration fetch and YouTube's origin/referrer checks need an HTTP origin. The source can also be served directly using `node scripts/serve.mjs .`.

To try the local build on Xbox before publishing, run the server on your PC, keep both devices on the same home network, and open `http://YOUR_PC_LAN_IP:4173/garage-tv/` in Xbox Edge. Allow port 4173 on your private network if the OS firewall asks. The included server binds to your network for this test and serves only its selected static folder; stop it when done. GitHub Pages is preferred for long-term use and supplies HTTPS.

## Sources and current functionality

Channels: 000 LIVE SPORTS, 001 SPORTS TV, 002 INDIE / POP, 003 RAP / R&B and 004 RETRO TV. The TV guide and channel surfing are deliberately limited to these five channels.

The public https://www.youtube.com/@NostalgiaTV-f4p/playlists page was accessible from the PC on 2026-10-18. Its “Sports” and “Indie / Pop” playlist IDs were verified on that page and added to the deployable defaults for channels 001 and 002. Its “Animation” playlist was left unmatched. **Rap / R&B and Retro TV still need matching public playlists.** Settings accepts pasted public playlist URLs/IDs. Save on the Xbox itself, or export PC settings and commit that JSON as `data/default-config.json` to ship them to all new browsers. An existing local configuration takes precedence; use Import JSON to update it.

The official YouTube IFrame Player API maintains one active player, replacing the iframe on channel requests to isolate stale callbacks. Features include source switching, continuous playlist looping, local position bookmarks, explicit autoplay recovery, missing/blocked-video recovery, mute, loading timeout and retry. Configured startup channels are randomly selected from enabled 001–004; a valid URL cannot guarantee embeddability, so runtime failures show recovery controls. Missing sources show CHANNEL UNAVAILABLE; use S or the controls menu to configure them. Diagnostics has a separately labeled official YouTube API demo video for connection testing.

The guide keeps full-size video and audio running behind opaque black panels. Its white row shows focus; ON marks the channel actually playing. Browsing does not retune until confirmation. NOW/NEXT uses actual metadata or verified schedules; unknown values are UNAVAILABLE / -. Unscheduled playlists explicitly have unknown next-video timing and do not advance while away. Verified-duration manifests enable deterministic virtual broadcasts with timeline seeks and stable seeded order. Read [docs/SCHEDULES.md](docs/SCHEDULES.md). Real YouTube/Xbox timing remains experimental until tested with actual content.

LIVE SPORTS includes https://ntv.st/matches/kobra as requested. Add/edit/remove names and HTTPS URLs in Settings. Links navigate in the same tab; use Edge Back to return. No website embedding, unsolicited pop-ups, DRM/security bypass, or ad blocking is implemented. Garage TV cannot guarantee blocking third-party pop-ups or verify the streaming rights of the supplied URL.

Configuration uses localStorage with validated JSON import/export, optional download/file import, deployable defaults and readable storage errors. It is local to each device/browser, with no account sync. Rendering uses text nodes for user content and rejects unsafe link schemes. Do not store secrets in this public app.

## Controls

| Action | Keyboard | Proposed standard gamepad input |
| --- | --- | --- |
| Previous / next channel | ↑ / ↓ or [ / ] | D-pad ↑ / ↓, LB / RB |
| Toggle guide | G | Y |
| Move guide focus | ↑ / ↓ | D-pad ↑ / ↓ |
| Confirm / retry / start | Enter | A |
| Close panel; open guide from failure | Escape or B | B |
| Controls menu | C; click playback bug | Menu; click playback bug |
| Settings / diagnostics | S / D | Controls menu |
| Mute / playback | M / Space | Controls menu |

Directions repeat after 350 ms, then every 160 ms. A/B/Y/Menu and bumpers are edge-triggered. Guide focus stops at its first/last row; channel surfing wraps. Unknown mappings are diagnostic only. Xbox Edge may reserve inputs; **these mappings still need physical Xbox testing**. In LIVE SPORTS, left/right moves among service links. In Settings, D-pad moves controls or dropdown options. Keyboard shortcuts preserve text entry. Gamepad-synthesized actions may not satisfy autoplay's trusted-interaction requirements: use Edge cursor/native controls or a keyboard if needed. Focus inside the cross-origin YouTube iframe can prevent application shortcuts; Tab or Edge's cursor can return to the app.

## Local Station presentation

Channel requests immediately show TUNING on black. Matching YouTube PLAYING uncovers video and starts the 3-second identification hold. Buffering appears after 500 ms of continuous stalling, retaining the player frame; resuming starts a fresh hold. Failures and a 20-second tune timeout show A RETRY / B GUIDE. Autoplay blocking requires an explicit start. Guide open/close does not reset timers. All transitions are hard cuts, including reduced-motion mode.

Supplied identity paths are unchanged. The historical photograph is absent from production; optional visual tests use it only as a credited fixture. See [the supplied design contract](docs/LOCAL-STATION-DESIGN.md) and [integration validation](docs/LOCAL-STATION-VALIDATION.md).

## Deployment

The public repository uses **GitHub Actions** as its Pages source. Each push to `main` runs the unit tests, builds `dist/`, and deploys it through `.github/workflows/pages.yml`. The deployment completed successfully on 2026-10-18. The live page and its CSS, JavaScript modules, and default configuration all returned HTTP 200. The short link returned one redirect to the Pages URL, which returned HTTP 200. Bookmark https://zip1.io/garagetvlee in Xbox Edge for easier access.

## Validation and Xbox acceptance

```sh
npm test
npm run build
# Browser suite only: install development dependency and Chromium first.
npm install
npx playwright install chromium
npm run test:browser
```

The browser runner uses Playwright's installed Chromium by default. To use another installation, set `CHROMIUM_PATH` to your browser's executable path. CI deployment runs dependency-free unit/build checks; the controlled browser suite is a separate developer check. Browser screenshots and results are generated under ignored `test-results/`.

Automated tests cover 720p/1080p layout, source switching, overlay expiry, guide, settings persistence, invalid URLs/JSON, service editing, absent Gamepad API, simulated standard gamepad repeat/edge behavior, autoplay/failure events and schedule seek commands. YouTube and gamepad inputs are mocked in that browser suite. This does not establish real YouTube playback, network availability, embed permissions, or Xbox compatibility. See [docs/XBOX-TESTING.md](docs/XBOX-TESTING.md) for the dedicated physical-console checklist.

## Structure

- `src/config.js`: validation, storage helpers, startup selection.
- `src/schedule.js`: pure deterministic schedule calculation.
- `src/player.js`: official YouTube API adapter, one player.
- `src/input.js`: keyboard, standard Gamepad polling and focus movement.
- `src/app.js`: app state, guide, settings and recovery UI.
- `src/presentation.js`: request-scoped presentation timers and player-event state.
- `styles.css`: Local Station geometry and monochrome styling.
- `data/default-config.json`: editable deployment defaults with two publicly verified playlist IDs.
- `scripts/`: static build and local development server.
- `tests/`: pure unit and controlled browser tests.

The app uses modern ES modules and browser APIs, targeting the Chromium-based Xbox Edge. Old pre-Chromium Xbox browsers are unsupported. It makes no analytics, font or thumbnail requests. Outside playback it fetches one same-origin defaults file; YouTube is loaded only when a source or diagnostic video is requested. A future design can replace CSS variables/classes and static markup while retaining configuration, scheduling, input and player modules.
