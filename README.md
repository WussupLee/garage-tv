# Garage TV

Garage TV is a static television interface for Microsoft Edge on Xbox One. It keeps the approved Local Station black-and-white presentation and a 1280 × 720 stage. The project is published through GitHub Pages at https://wussuplee.github.io/garage-tv/; the short link is https://zip1.io/garagetvlee.

## Current channels

| Channel | Source | Status |
| --- | --- | --- |
| 000 LIVE SPORTS | Saved external destinations | Configure your own HTTPS links |
| 001 SPORTS CLASSICS | YouTube playlist | Desktop playlist integration; Xbox untested |
| 002 INDIE / POP | YouTube playlist | Desktop playlist integration; Xbox untested |
| 003 RAP / R&B | YouTube playlist | Desktop playlist integration; Xbox untested |
| 004 RETRO TV | 2000s Retro TV website; Nostalgia playlist alternate | External link; alternate playlist |
| 005 90s TV | 1990s Retro TV website | External link |
| 006 VEVO 2K | Pluto TV page | External link; Xbox playback untested |
| 007 MUSIC TV | XITE website | External link; Xbox player unverified |
| 008 LATE NIGHT | Adult Swim Off the Air; YouTube alternate | External link; alternate playlist |
| 009 INDIE ARCHIVE | altmusictv.com | External archive |
| 010 GARAGE RADIO | SomaFM listening pages | External links; see provider terms |
| 011 PUBLIC TV | User-configured HLS | Empty until a suitable authorized stream is verified |
| 012 FOOTBALL | Curated YouTube queue; NFL archive alternate | College classics played in desktop Edge; official NFL videos blocked embedding |
| 013 BASKETBALL | Curated YouTube queue; NBA archive alternate | ESPN full game and highlights played in desktop Edge |
| 014 FUTBOL | Curated YouTube queue; FIFA+ archive alternate | Classic club highlights played in desktop Edge; FIFA videos blocked embedding |

External links open in the same tab. Edge Back returns to Garage TV. They do not become embeddable streams merely because the landing page loads. Garage TV cannot control provider ads, playback, or controller focus after navigation.

The YouTube playlists and snapshot entries from the previous release remain available. The sports queues use official publisher videos that reached `PLAYING` in desktop Edge on October 19, 2026. They play in order, loop, and resume a saved position. They are continuous rotations, not synchronized broadcasts. YouTube controls advertising and embedding permission. The app neither bypasses ads nor restarts playback when opening the guide. Saved live-sports links from older browser settings are preserved.

SomaFM publishes direct radio URLs, but its terms prohibit third-party embedding without prior permission. The default station therefore links to its official listening pages. Native audio is available for user-provided streams whose terms allow this use. PUBLIC TV remains a placeholder because no IPTV candidate has been verified for authorization, CORS, codec, and live playback.

## Architecture

Default channels live in data/default-config.json. Each channel has a number, order, title, description, enabled flag, multiple sources, and an active source. Supported types are youtube_playlist, youtube_queue, hls_stream, audio_stream, external_site, and local_media. See docs/MULTISOURCE.md for the schema and verification matrix.

src/player.js owns the single YouTube IFrame player. src/native-media.js reuses one video and one audio element, chooses native HLS when available, and loads HLS.js only when necessary. src/external-site.js provides same-tab destinations. src/local-media.js keeps selected files in memory for the current session. src/presentation.js handles request-scoped tuning, buffering, failures, and the three-second channel label. New channel requests stop prior media and invalidate stale callbacks. There is no backend or proxy.

Settings can add, remove, rename, reorder, enable, and disable channels; edit or select sources and video queues; choose local files; and import/export JSON. Settings are stored in localStorage under garage-tv.config.v2, separately in each browser. Existing v2 settings receive channels 012–014 once without replacing edits or re-adding subsequently removed channels. Older v1 settings also migrate. Source URLs require HTTPS; HLS entries require an m3u8 URL. The diagnostics panel shows each channel’s source, type, browser capability, observed startup time, interaction requirement, and status. A desktop result is never an Xbox compatibility claim.

## Controls

| Action | Keyboard | Proposed Xbox mapping |
| --- | --- | --- |
| Surf channels | Up/Down or [ / ] | D-pad Up/Down or bumpers |
| Guide | G | Y or B |
| Confirm / retry | Enter | A |
| Close guide | Esc | B |
| Settings | S | Menu |
| Fullscreen | F or on-screen button | On-screen button |
| Diagnostics | D | Settings panel |
| Mute / play | M / Space | Controls panel |

Edge may reserve controller buttons. The physical Xbox checklist is in docs/MULTISOURCE.md. Guide focus is separate from the ON marker; moving focus never tunes. External channels show OPEN PROVIDER and no invented program schedule.

## Run and verify

Use a local HTTP server; opening index.html directly does not provide the origin needed by modules and YouTube.

1. Run npm run build and npm run serve with Node.js.
2. Open http://localhost:4173/garage-tv/ in Edge.
3. Run npm test for unit checks.
4. Install the optional Playwright development dependency and run npm run test:browser for controlled desktop Edge checks.

The GitHub Actions workflow builds dist/ and deploys it to Pages on pushes to main. The controlled browser suite uses a synthetic audio fixture and mocked YouTube events. Optional `node tests/live-sports.cjs` and `node tests/probe-youtube.cjs <video IDs>` checks use the real YouTube IFrame API in desktop Edge. Screenshots are written to test-results/.

Visual assets and dimensions follow docs/LOCAL-STATION-DESIGN.md. The historical reference photograph is not production content.
