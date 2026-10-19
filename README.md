# Garage TV

Garage TV is a static, controller-first television interface for Microsoft Edge on Xbox One. It keeps the approved Local Station black-and-white presentation and a 1280 × 720 stage. It is published at https://wussuplee.github.io/garage-tv/ with the short link https://zip1.io/garagetvlee.

## Embedded lineup

Channel 000 LIVE SPORTS is the only external destination. Channels 001–014 remain inside Garage TV and use one reused YouTube IFrame player.

| Channel | Source | Verified rotation |
| --- | --- | ---: |
| 000 LIVE SPORTS | User-configured external HTTPS destinations | External exception |
| 001 SPORTS CLASSICS | Supplied YouTube playlist snapshot | 1 currently embeddable item |
| 002 INDIE / POP | Supplied YouTube playlist snapshot | 13 items |
| 003 RAP / R&B | Supplied YouTube playlist snapshot | 2 items |
| 004 NOSTALGIA | Supplied YouTube playlist snapshot | 2 items |
| 005 90s MUSIC | Official KEXP sessions | 20 items |
| 006 Y2K HITS | Official KEXP sessions | 20 items |
| 007 ROCK / PUNK | Official KEXP and Audiotree sessions | 20 items |
| 008 OFF THE AIR | Official Adult Swim playlist snapshot | 60 items |
| 009 ELECTRONIC | Official KEXP and Cercle sessions | 20 items |
| 010 SOUL / FUNK | Official KEXP and COLORS sessions | 20 items |
| 011 SPACE TV | Official NASA videos | 20 items |
| 012 FOOTBALL | Verified official YouTube queue | 8 items |
| 013 BASKETBALL | Verified official YouTube queue | 8 items |
| 014 FUTBOL | Verified official YouTube queue | 8 items |

The October 19, 2026 desktop Edge probe required every bundled snapshot and queue item to reach the IFrame API PLAYING event. All 220 unique retained IDs played; reuse startup in that probe measured 187 ms minimum, 245 ms median, and 613 ms maximum. Entries returning embed error 150 were removed. Provider permissions can change after deployment, and desktop results do not establish Xbox compatibility.

Every bundled YouTube source shuffles once per page launch. Its order remains stable during that session, every item is used before the next cycle, and the next launch avoids starting on the previous launch item when alternatives exist. Returning to a channel in the same session resumes its current item and timestamp. Custom ordered channels continue to use persistent bookmarks when shuffle is disabled.

## Playback architecture

Default content lives in data/default-config.json; supplied playlist snapshots live in data/playlist-snapshots.json. src/player.js owns the one YouTube IFrame player and reuses it across YouTube channel changes. Each request has a generation token, so an earlier callback cannot restart a stale channel. Only one stream is active and adjacent channels are not preloaded.

The app shows TUNING immediately, uncovers video only after the real PLAYING event, delays BUFFERING for 500 ms, and preserves unavailable and blocked-autoplay recovery. Opening the guide does not stop playback. Guide focus and the ON marker are separate; browsing does not retune until confirmation.

Settings supports channel editing, reordering, enable/disable, source type, shuffleEachLaunch, JSON import/export, and browser-local storage. Existing settings migrate to lineup revision 3 while preserving LIVE SPORTS destinations, unrelated custom channels, enabled states, ordering, and service links.

## Controls

A persistent playback strip keeps CH −, GUIDE, CH +, and PLAYER above the iframe. Garage TV owns pointer and controller input during ordinary viewing. PLAYER enables native YouTube controls; the always-visible TV CONTROLS button returns input to Garage TV.

| Action | Keyboard | Xbox mapping |
| --- | --- | --- |
| Channel down/up | Up/Down or [ / ] | D-pad Up/Down or bumpers |
| Open/close guide | G / Esc | Y or B |
| Confirm / retry | Enter | A |
| Settings | S | Menu when Edge exposes it |
| Fullscreen | F or on-screen button | On-screen button |
| Diagnostics | D | Settings panel |
| Mute / play | M / Space | Controls panel |

Edge may reserve controller buttons. See docs/XBOX-TESTING.md for the physical console checklist.

## Run and verify

Use a local HTTP server; opening index.html directly does not provide the origin required by modules and YouTube.

1. npm install
2. npm test
3. npm run build
4. npm run serve
5. Open http://localhost:4173/garage-tv/

The GitHub Actions workflow builds dist/ and deploys it to Pages on pushes to main. The controlled Edge suite uses mocked YouTube events. node tests/probe-youtube.cjs --all uses the real YouTube IFrame API and is network and provider dependent. Screenshots are written to test-results/.

YouTube controls advertising, autoplay, and embed permission. Garage TV does not bypass ads or provider protections. The historical design reference photograph is not production content.
