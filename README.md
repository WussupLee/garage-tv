# Garage TV — Xbox One MVP

Minimal static television application for Microsoft Edge on Xbox One, targeting 1280×720 and supporting 1080p. HTML, CSS and JavaScript; no backend, API keys, paid services or runtime dependencies. All visual styles live in `styles.css` and its CSS variables.

**Publication status:** implementation complete; no live deployment verified. The user has created the public repository https://github.com/WussupLee/garage-tv, but cloud upload was denied by the integration. Intended Pages URL: https://wussuplee.github.io/garage-tv/ (last check: HTTP 404). **Continuing in Codex on PC? Read [CODEX-HANDOFF.md](CODEX-HANDOFF.md) first.**

## Run on your PC

Install Node.js LTS from https://nodejs.org/ if needed. Unzip the package and double-click **Start-Garage-TV.cmd** on Windows. Open http://localhost:4173/garage-tv/ in Edge and keep the command window running. On macOS/Linux or in a terminal:

```sh
npm run build
npm run serve
```

These commands need no `npm install`. Use an HTTP server rather than double-clicking index.html: modules, configuration fetch and YouTube's origin/referrer checks need an HTTP origin. The source can also be served directly using `node scripts/serve.mjs .`.

To try the local build on Xbox before publishing, run the server on your PC, keep both devices on the same home network, and open `http://YOUR_PC_LAN_IP:4173/garage-tv/` in Xbox Edge. Allow port 4173 on your private network if the OS firewall asks. The included server binds to your network for this test and serves only its selected static folder; stop it when done. GitHub Pages is preferred for long-term use and supplies HTTPS.

## Sources and current functionality

Channels: 000 LIVE SPORTS, 001 SPORTS TV, 002 INDIE / POP, 003 RAP / R&B and 004 RETRO TV. Additional channels can be added through validated JSON import or `data/default-config.json`.

Discovery of https://www.youtube.com/@NostalgiaTV-f4p/playlists was attempted through direct fetch, a web reader and indexed search. The reader was throttled, direct access was denied and no indexed playlist results were found. **All four YouTube playlist URLs are still needed.** No playlist IDs were invented. Settings accepts pasted public playlist URLs/IDs. Save on the Xbox itself, or export PC settings and commit that JSON as `data/default-config.json` to ship them to all new browsers. An existing local configuration takes precedence; use Import JSON to update it.

The official YouTube IFrame Player API creates a single reusable player. Features include source switching, continuous playlist looping, local position bookmarks, explicit autoplay recovery, missing/blocked-video recovery, mute, loading timeout and retry. Configured startup channels are randomly selected from enabled 001–004; a valid URL cannot guarantee embeddability, so runtime failures show recovery controls. With no configured sources the app honestly shows setup instructions. Diagnostics has a separately labeled official YouTube API demo video for connection testing.

The guide keeps playback running in a reduced player. It distinguishes the tuned channel from focused selection and shows NOW/NEXT. Unscheduled playlists explicitly have unknown next-video timing and do not advance while away. Verified-duration manifests enable deterministic virtual broadcasts with timeline seeks and stable seeded order. Read [docs/SCHEDULES.md](docs/SCHEDULES.md). Real YouTube/Xbox timing remains experimental until tested with actual content.

LIVE SPORTS includes https://ntv.st/matches/kobra as requested. Add/edit/remove names and HTTPS URLs in Settings. Links navigate in the same tab; use Edge Back to return. No website embedding, unsolicited pop-ups, DRM/security bypass, or ad blocking is implemented. Garage TV cannot guarantee blocking third-party pop-ups or verify the streaming rights of the supplied URL.

Configuration uses localStorage with validated JSON import/export, optional download/file import, deployable defaults and readable storage errors. It is local to each device/browser, with no account sync. Rendering uses text nodes for user content and rejects unsafe link schemes. Do not store secrets in this public app.

## Controls

| Action | Keyboard | Proposed standard gamepad input |
| --- | --- | --- |
| Channel up/down | ↑ / ↓ or ] / [ | D-pad ↑ / ↓, RB / LB |
| Guide | G or B | B |
| Select guide row/control | Arrows or Tab | D-pad |
| Confirm | Enter | A |
| Close panel | Escape | B |
| Settings / diagnostics | S / D | Visible controls |
| Mute / playback | M / Space | Visible controls |

Gamepad polling uses edge detection and a 220 ms action debounce; holding a button does not repeatedly tune. Unknown mappings are diagnostic only. Xbox Edge may reserve inputs; **none of these mappings have been verified on an Xbox**. In LIVE SPORTS, D-pad moves among service links; use bumpers or visible CH buttons to leave. In Settings, D-pad moves controls, and on a selected dropdown it changes options; use the browser's on-screen keyboard for typing. Gamepad-synthesized clicks may not satisfy autoplay's trusted-interaction requirements. Use Edge cursor/native controls or a keyboard when needed. Focus inside a cross-origin YouTube iframe can prevent application shortcuts; Tab or Edge's cursor can return to the app.

## Publish from your PC

The cloud connection authenticated as WussupLee, but upload failed with HTTP 403 (`Resource not accessible by integration`). The repository now exists with an initial README. Use your PC's own authorized GitHub login; do not copy credentials from this package or paste tokens into chat. Codex on PC can perform the remaining work using CODEX-HANDOFF.md.

1. Clone the existing repository into a new folder using GitHub Desktop or a terminal. Git and an authorized GitHub login are needed for command-line publishing:

```sh
git clone https://github.com/WussupLee/garage-tv.git garage-tv-publish
```

2. Copy the extracted package's files into that clone, preserving the clone's `.git` directory. Review the changes, commit and push:

```sh
cd garage-tv-publish
git add .
git commit -m "Build Garage TV Xbox Edge MVP"
git push origin main
```

If authentication is needed, use your PC's normal GitHub login flow (for example, `gh auth login` if GitHub CLI is installed). Do not force-push or overwrite unrelated remote work. GitHub Desktop is also suitable for committing/pushing the copied files.

3. Go to repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. In **Actions → Deploy Garage TV to GitHub Pages**, choose **Run workflow** on main, or push another commit. The included workflow validates defaults, runs the unit tests, creates `dist/`, uploads it and deploys to Pages. Actions must be enabled and the repository's policy must allow Pages deployments. It uses the free public-repository Pages service.
5. Wait for the deployment to finish, then open the URL shown by the deploy job. Confirm it loads and browser assets return successfully before calling the app live. The expected URL is https://wussuplee.github.io/garage-tv/.

Alternative without Actions: upload `index.html`, `styles.css`, `src/`, `data/` and `.nojekyll` to the repository root, then select **Deploy from a branch → main → /(root)** in Pages. No Node build is required for this static source. With the full project committed, branch deployment also works because all runtime assets are in the root.

## Validation and Xbox acceptance

```sh
npm test
npm run build
# Browser suite only: install development dependency and Chromium first.
npm install
npx playwright install chromium
npm run test:browser
```

The browser runner uses `/usr/bin/chromium` when available, otherwise Playwright's installed Chromium. To use another installation, set `CHROMIUM_PATH` to your browser's executable path. CI deployment runs dependency-free unit/build checks; the controlled browser suite is a separate developer check. Browser screenshots and results are generated under ignored `test-results/`.

Automated tests cover 720p/1080p layout, source switching, overlay expiry, guide, settings persistence, invalid URLs/JSON, service editing, absent Gamepad API, simulated standard gamepad debounce, autoplay/failure events and schedule seek commands. YouTube and gamepad inputs are mocked in that browser suite. This does not establish real YouTube playback, network availability, embed permissions, or Xbox compatibility. See [docs/XBOX-TESTING.md](docs/XBOX-TESTING.md) for the dedicated physical-console checklist.

## Structure

- `src/config.js`: validation, storage helpers, startup selection.
- `src/schedule.js`: pure deterministic schedule calculation.
- `src/player.js`: official YouTube API adapter, one player.
- `src/input.js`: keyboard, standard Gamepad polling and focus movement.
- `src/app.js`: app state, guide, settings and recovery UI.
- `styles.css`: centralized temporary black-and-white styling.
- `data/default-config.json`: editable deployment defaults; no fabricated playlist data.
- `scripts/`: static build and local development server.
- `tests/`: pure unit and controlled browser tests.

The app uses modern ES modules and browser APIs, targeting the Chromium-based Xbox Edge. Old pre-Chromium Xbox browsers are unsupported. It makes no analytics, font or thumbnail requests. Outside playback it fetches one same-origin defaults file; YouTube is loaded only when a source or diagnostic video is requested. A future design can replace CSS variables/classes and static markup while retaining configuration, scheduling, input and player modules.
