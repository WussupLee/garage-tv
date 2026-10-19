# Garage TV — current handoff

## Current state — 2026-10-19

Garage TV uses the approved Local Station design and a vanilla static GitHub Pages architecture. The deployable lineup is revision 3.

- 000 LIVE SPORTS is the only external destination and contains user-configured HTTPS links.
- 001–014 play inside Garage TV through one reused YouTube IFrame player.
- 004–011 are NOSTALGIA, 90s MUSIC, Y2K HITS, ROCK / PUNK, OFF THE AIR, ELECTRONIC, SOUL / FUNK, and SPACE TV.
- 012–014 are FOOTBALL, BASKETBALL, and FUTBOL with no shipped external alternates.
- Every bundled YouTube source shuffles per launch, maintains a complete-cycle session order, avoids an immediate launch repeat, and resumes within the page session.
- Ordered custom channels retain persistent bookmarks when shuffle is disabled.
- The playback strip exposes CH −, GUIDE, CH +, and PLAYER above the iframe. PLAYER enables native YouTube interaction; TV CONTROLS restores app input.
- Guide focus remains separate from the ON marker and never tunes until confirmation.
- Configuration revision 3 preserves LIVE SPORTS destinations, unrelated custom channels, user ordering, enabled states, and service links.

## Verification

Unit tests cover shuffle permutations, launch-repeat avoidance, configuration validation and migration, request generations, timers, autoplay handling, and gamepad repeat behavior.

The controlled desktop Edge suite covers the fifteen-channel guide, one iframe through rapid switching, stale callback rejection, persistent TV controls, player interaction mode, guide focus without retune, native audio fixture, Settings, and Diagnostics.

The real-network Edge probe requires the YouTube IFrame API PLAYING event. On October 19, 2026, all shipped items passed after non-embeddable error-150 entries were removed. See docs/LIVE-PLAYBACK-VALIDATION.md. Desktop results do not establish Xbox One behavior.

## Deployment

Repository: https://github.com/WussupLee/garage-tv

Pages: https://wussuplee.github.io/garage-tv/

Short link: https://zip1.io/garagetvlee

The user authorized normal commits and pushes to main, GitHub Pages deployment, and URL verification. Do not force push. Use the existing local GitHub authentication. The Pages workflow is .github/workflows/pages.yml.

## Remaining hardware work

Run docs/XBOX-TESTING.md on a physical Xbox One. Verify autoplay gesture requirements, provider ads, controller button reservation, iframe focus recovery, fullscreen, tune latency, and long-run stability. Do not claim these checks from desktop evidence.
