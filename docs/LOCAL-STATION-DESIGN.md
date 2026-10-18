# GARAGE TV / LOCAL STATION
Version 1.0 | Selected direction B | October 18, 2026

## Start here
Implement the selected Local Station identity from this package in the existing Garage TV application. Keep the functional framework already being built. Do not redesign the screens or borrow from discarded A/C studies. Use screens/ as the visual acceptance targets, assets/ for logos, fonts/ for live text, design-tokens.json for exact values, and reference/ for presentation logic and motion behavior.

The user selected B's identity and channel display. The five-row guide, loading states and motion rules are the concrete extension supplied with this handoff; they have not had a separate visual approval or Xbox hardware test. Keep that distinction in review notes. Prior research is a separate document, not an implementation source.

## Package map
- Garage-TV-Local-Station-Design-Guide.pdf: selected identity, eight screen/state proofs and concise visual/motion rules.
- screens/: eleven PNGs, all exactly 1280 x 720. Program titles, time and image are reference fixtures.
- assets/: primary, secondary, bug and symbol in transparent white/black SVG variants. All lettering is outlined; do not add a web-font dependency to the logo.
- fonts/: original DejaVu Sans Mono regular/bold TTF files and license notice. Keep the license with distributions.
- source/: vector screen-overlay drawings with exact positions; text is outlined for proof portability. These are visual measurement targets, not dynamic program UI.
- design-tokens.json: approved B geometry plus specified guide and state geometry.
- reference/: CSS, plain JavaScript state controller, and a local interactive proof with simulated player events.
- Garage-TV-Motion-Reference.mp4: a static-image timing demonstration. It is not a real player recording.

## Brand rules
Primary: stacked GARAGE / TV plus horizontal rule; use the provided SVG unchanged. Minimum width 176 px at 1280 x 720. Secondary: compact G with smaller TV; minimum width 80 px. Symbol: plain G, minimum rendered cap height 28 px. Smallest-size limits are practical starting limits; verify from the actual garage viewing distance.

Use white artwork on black, black artwork on white. Give the primary at least 16 px clear space at its 176 px size; other sizes scale proportionally. Keep at least 12 px around an 80 px compact mark. Do not add a globe, outlines, texture, skew, bevel, glow, tagline, alternate icon or color accent. Do not reconstruct the wordmark with live text.

## Typography and color
Live information uses the supplied DejaVu Sans Mono. The exact family name in CSS is Garage Mono. Weight 700 for channel numbers and station names; 400 for metadata, time and status. No text shadow or letter spacing.

| Role | Size / weight |
| --- | --- |
| Channel number | 48 px / 700 |
| Channel title | 28 px / 700 |
| Guide title | 30 px / 700 |
| Guide channel number | 28 px / 700 |
| Guide station title | 24 px / 700 |
| Program metadata and input hints | 22 px / 400 |
| Current time | 26 px / 400 |
| Guide column labels | 22 px / 400 |
| ON marker | 18 px / 700 |
| TUNING / BUFFERING | 20 px / 400 |
| Error title | 28 px / 700 |

Primary black #000000; primary white #FFFFFF. Divider gray #777777 only. Panels and focus fill are opaque. Video retains its source color. No global dimming, transparency, gradients, blur, grain, scanlines or chromatic effects. Courier New/monospace is emergency fallback only; do not accept screenshots captured before the supplied fonts finish loading. Longer program text is a single line with ellipsis, not a marquee. Do not shrink text to fit.

## Resolution and placement
Base coordinates are measured from the top-left of a 1280 x 720 stage. Safe bounds: x=64..1216, y=54..666. These are chosen product margins, not a claim about a mandatory historical standard. Preserve proportions at different viewport sizes. Scale the stage uniformly and center it; never stretch it to a different aspect ratio. Video uses contain, with black bars if necessary. The provided context fixture is deliberately placed at (64,0,1152,720), preserving its original 480:300 ratio.

Text y values below are typographic baselines. SVG live text is one precise implementation option; if using HTML, account for the actual font ascent/descent so its baseline matches. Avoid guessing top offsets from font-size alone. Essential UI is positioned inside the safe bounds; test actual overscan and browser chrome on the target television.

### Channel identification
Panel x=64, y=54, w=286, h=126. Channel number x=82, baseline=111. Station x=82, baseline=159. This preserves the selected B proof. No logo, rating, descriptor, clock or program description is added to this panel.

000 LIVE SPORTS; 001 SPORTS TV; 002 INDIE / POP; 003 RAP / R&B; 004 RETRO TV. Always show three-digit numbers. Ratings must not be fabricated for appearance. The current package does not add ratings; add them only after a defined content metadata requirement and design review.

### Guide
Header panel (64,54,1152,88). Primary logo at (84,66), w=176, h=58.33. CHANNEL GUIDE x=324 baseline=110. Clock x=1028 baseline=108, formatted h:mm AM/PM; use the device-local time. Screenshot time is a fixture.

Main panel (64,226,1152,440). Column labels at baseline 256: CH x=126, STATION x=218, NOW x=540, NEXT x=896. Divider from (82,269) to (1198,269), 1 px.

Rows begin y=270, each 70 px high, five rows total. On row i: number baseline=315+70i at x=126; station/program baseline=313+70i. Station x=218, NOW x=540, NEXT x=896. ON x=82, baseline=313+70i. Selected row fills x=64..1216 white; all its text switches black. Other rows remain black with white text. The ON marker means the current player channel, not the selected row. Hide ON when no channel is playing or buffering.

Station text slot max-width 290 px. NOW max-width 320 px. NEXT max-width 302 px. Use clip/ellipsis within each slot. Missing NOW is UNAVAILABLE, missing NEXT is a single dash. LIVE SPORTS uses real configured source/schedule metadata if available; do not claim an event is live because of the channel's name.

Footer divider (82,624)..(1198,624). A TUNE    B CLOSE at x=82 baseline=652. These are plain text hints, not rounded buttons. Do not show a separate details pane, thumbnail cards or advertisements. Video continues at its existing size and audio level behind the opaque panels.

### Playback bug
Panel (1112,600,104,66). White compact logo (1124,608), w=80, h=49.87. Show only in ordinary playback after identification disappears. Hide while guide, channel OSD, tuning, buffering, failure or launch graphics are shown. This avoids duplicate interface marks. No idle clock, extra title or transport bar.

### Launch, loading and errors
Launch is a static primary logo at (468,303), w=344, h=114 on black. Never delay ready video to complete a logo animation. A brief brand hold may last up to 600 ms if playback is not ready; then show tuning. If autoplay is blocked, show PRESS A TO START at x=82 baseline=278 using 22 px regular and start from an explicit input; the normal launch proof omits that conditional prompt.

Tuning: black field; standard channel panel extended to 184 px high, with TUNING at x=82 baseline=215. Keep requested number/name visible immediately. Buffering: same extended panel with BUFFERING over the player's retained image if available; use black if the player cannot retain a frame. Do not manufacture a freeze-frame by reading cross-origin video pixels.

Unavailable: black field, regular 126 px channel panel; CHANNEL UNAVAILABLE at x=82 baseline=278, A RETRY    B GUIDE at x=82 baseline=326. An explicit player error shows this immediately; a pending tune times out after 20 seconds. A retries the requested channel; B opens the guide. Do not silently restart an endless loading loop.

## Motion and state contract
All transitions are hard cuts. There are no CSS easing curves because no position, opacity or size interpolation is used. No flicker, strobe, static burst, bounce or artificial tuning gap.

| Trigger | Presentation |
| --- | --- |
| Channel request | Immediately show requested number/name and black cover; send real tune request without an artificial delay |
| Player reports PLAYING | Uncover video; show standard OSD for 3,000 ms |
| 3,000 ms expires | Remove OSD; show compact bug |
| Buffering continues for 500 ms | Show BUFFERING; hide bug |
| Buffering ends | Remove status; show OSD for 3,000 ms, then bug |
| Guide opens/closes | Immediate panel appearance/removal; playback continues |
| Focus moves | White row moves immediately, no tween |
| Request superseded | Cancel old timers; only the latest request can update the visible state |

Tag every asynchronous player event with its originating request/player generation. A late PLAYING event from a discarded player must not reveal the wrong channel. Do not simply attach the latest request id to every event; retain association when the player/request is created. If reusing a player, verify the expected video id/state before accepting a callback. Never start the 3-second timer from API ready: ready is not playback. YouTube PLAYING is the practical API signal, not guaranteed first-visible-pixel detection across the iframe boundary.

Guide opening does not reset the playback/OSD timers. Closing the guide reveals whichever playback state is current. Repeated PLAYING callbacks while already playing do not restart the timer. Reduced-motion preferences use the same hard cuts; no substitute animation is necessary.

## Input and focus
Playback: D-pad up/down surf previous/next channel. Surfing wraps 000..004. Y toggles guide. A starts playback when explicitly required. Guide opens focused on the current channel, or the requested channel if no current one exists. D-pad up/down moves one row and stops at the first/last row; it does not wrap. Left/right do nothing in this five-channel NOW/NEXT guide. A tunes focused channel and closes guide; choosing the already-playing channel simply closes guide. B dismisses guide without tuning. While failure is visible, A retries and B opens guide.

Keyboard mapping: arrows, Enter=A, Esc=B, G=guide. Gamepad reference maps standard indices 12/13=up/down, 0=A, 1=B, 3=Y. Directional hold repeats after 350 ms, then every 160 ms; A/B/Y are edge-triggered. Show deterministic focus immediately. Confirm browser Back handling on Xbox instead of assuming B can always be intercepted.

Announce channel changes, loading/failure and guide focus through a polite live region. In the production DOM, use one focus owner for the guide/listbox and retain focus when graphics update; do not put every redraw in a new focusable tree. Restore focus to the TV stage when guide closes. The reference SVG proof is a visual/input reference, not an accessibility certification.

## Implementation reference and integration
Run `python3 -m http.server 8000` from this package and open `http://localhost:8000/reference/`. A local server is required for the ES module; file:// is not the supported preview route. Review controls above the stage are tooling, not product UI. The proof uses a static image and a 700 ms simulated player delay. That delay exists only in preview.js, not in state-machine.js or the product design.

Use reference/state-machine.js as a presentation adapter, or translate its contract into the app's existing architecture. Wire onTune(index, requestId) to the existing source/player framework. Route matching player PLAYING, BUFFERING and error events back to the adapter. Do not replace the functional channel framework with the local proof. For real buffering during a pending tune, leave TUNING; buffering status is for an already-playing channel.

Use bundled fonts locally; no runtime font CDN. Use hard rectangles and SVG paths instead of canvas filters. Keep one active audio stream. Preloading decisions belong to the existing functional task; do not spin up five simultaneous playing YouTube embeds for the visual design. Capability-detect gamepad support and retain the existing input fallback. No Xbox One Edge hardware, account autoplay, live schedule or YouTube playback smoke test was performed for this package.

Official integration reference: https://developers.google.com/youtube/iframe_api_reference
Font license reference: https://dejavu-fonts.github.io/License.html

## Visual acceptance checklist
- Match PNG proofs at 1280 x 720 after fonts finish loading; no modern cards, rounded focus outlines or polished dashboard chrome.
- Show all five channel names without clipping; ellipsize long program titles in their own columns.
- Guide focus can be on 001 while ON remains 003; video/audio continue until confirmation.
- Rapid channel changes cannot let stale callbacks or timers affect the latest channel.
- Loading does not flash/flicker or hide the requested channel number.
- Confirm 720p couch-distance reading, safe margins, browser fullscreen behavior and Xbox input on the actual TV.

## Context image / source credit
The Asakusa historical bumper is a visual fixture, not a RAP/R&B program sample or a production asset. Source: https://www.bumpworthy.com/bumps/53/ ; source image: https://static.bumpworthy.com/bumps/53.p.jpg . The reference preserves the full original image and its ratio, including baked-in lettering. Replace it with licensed/user-owned source video in production. Do not copy the historical photograph into the final application.
