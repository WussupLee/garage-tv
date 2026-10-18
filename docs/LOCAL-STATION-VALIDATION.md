# Local Station integration validation — 2026-10-18

## Implementation

Integrated into the original vanilla app: configuration, schedules, bookmarks, service directory, settings, import/export and official YouTube adapter remain functional. Presentation is isolated in `src/presentation.js`. Real player events govern visibility; no preview playback delay or reference state-machine simulation ships.

The 1280×720 stage uses the supplied dimensions, SVG identity and local font files. The guide has five stable rows, a single focus owner, explicit confirmation, independent ON/focus, and continuing full-size playback. Long titles ellipsize within fixed columns. Loading/error/launch/bug states use hard cuts. Requests replace the previous iframe after invalidating its callback generation, preventing simultaneous streams and stale-event presentation.

## Evidence

- 12 passing Node unit tests: configuration, schedule math, 3000 ms identification, 500 ms buffering, 20-second timeout, stale requests, autoplay, directional repeat and edge buttons.
- Static build succeeds; assets/fonts are included, and development server uses correct SVG/font MIME types.
- Headless desktop Edge browser suite passes: real DOM and player adapter with controlled YouTube/gamepad boundaries; guide browsing and same-channel confirmation do not reload; obsolete iframe callbacks are ignored; at most one active iframe; controls/settings/import/persistence/service CRUD and 1200→1500-second schedule return commands remain functional.
- Layout checked at 1280×720, 1920×1080, 1000×800 and 640×360. Overlay box and selected guide row have exact documented bounds. Supplied logo loads successfully.
- Optional capture fixture: set DESIGN_PACKAGE to the extracted design package root, then run the browser suite. Without it captures have a black simulated video field. The historical image is read directly from the external package and never copied to source or dist.
- Captures in ignored `test-results/`: local-station-channel-switch.png, local-station-guide.png, local-station-tuning.png, local-station-buffering.png, local-station-playback.png and local-station-unavailable.png. These use synthetic schedules and a simulated player, not real channel content. Reviewed against supplied 1280×720 targets. Unknown NEXT for the service directory deliberately shows `-` rather than fictional schedule metadata.

Image fixture credit: Asakusa bumper, https://www.bumpworthy.com/bumps/53/ ; https://static.bumpworthy.com/bumps/53.p.jpg . Credit and usage restrictions are retained in LOCAL-STATION-DESIGN.md.

## Still requires Xbox One and live YouTube

Autoplay with audio and trusted A/cursor input; D-pad/A/B/Y/Menu mappings and browser-reserved Back; focus returning from the YouTube iframe; TV overscan/fullscreen at 720p/1080p; real playlist embeddability and transitions; ads/buffering behavior; rapid surfing without leaked audio; schedule seeks and drift; long-session performance. Channels 003/004 still need real playlist sources. No verified production duration manifests exist.
