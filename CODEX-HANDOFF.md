# Garage TV — current handoff

## Current state — 2026-10-19

Garage TV uses the approved Local Station design and a vanilla static GitHub Pages architecture. The deployable lineup is revision 4.

- 000 LIVE SPORTS remains the only external destination.
- 001–010 and 012–014 use one reused YouTube IFrame player and remain available through the guide.
- 011 SPACE TV, 015 ARCHIVE TV, 016 CARTOON TV, and 017 SPORTS REELS use direct NASA or Internet Archive MP4s and form the default ad-free surfing loop.
- Settings can change surfing to all channels.
- YouTube is never covered by Garage TV UI. Tuning, buffering, blocked, and unavailable states use a side-by-side station card.
- The 1280 × 720 stage fits to visualViewport. CALIBRATE SCREEN provides visible corner targets, fit, and X/Y offsets.
- Queues shuffle per launch, preserve a complete session cycle, avoid the prior launch item, and resume within the page session.
- The guide focus remains separate from the ON marker and does not tune before confirmation.
- Revision 4 migration preserves saved LIVE SPORTS destinations, custom channels, ordering, enabled states, and service links.

## Verification

Unit tests cover source schemas, rights metadata, surf policy, screen-fit bounds, shuffle, migration, request generations, timers, autoplay, and gamepad repeat behavior.

The controlled desktop Edge suite covers the eighteen-channel guide, one YouTube iframe through rapid switching, stale callbacks, controls outside the iframe, player mode recovery, guide focus, screen corner calibration, Settings, Diagnostics, and a native audio fixture.

On October 19, 2026, the real Edge probes recorded 200/200 YouTube IDs reaching PLAYING and 16/16 direct MP4s reaching playing. See docs/LIVE-PLAYBACK-VALIDATION.md. Desktop evidence does not establish Xbox One behavior.

## Deployment

Repository: https://github.com/WussupLee/garage-tv

Pages: https://wussuplee.github.io/garage-tv/

Short link: https://zip1.io/garagetvlee

The user authorized normal commits and pushes to main, GitHub Pages deployment, and URL verification. Do not force push. Use the existing local GitHub authentication. The Pages workflow is .github/workflows/pages.yml.

## Remaining hardware work

Run docs/XBOX-TESTING.md on a physical Xbox One. Verify visualViewport fit with browser chrome and fullscreen, autoplay gestures, provider ads, controller button reservation, iframe focus recovery, direct MP4 codecs, tune latency, and long-run stability. Do not claim these checks from desktop evidence.
