# Garage TV

Garage TV is a static, controller-first television interface for Microsoft Edge on Xbox One. It keeps the approved Local Station black-and-white presentation on a calibrated 1280 × 720 stage. It is published at https://wussuplee.github.io/garage-tv/ with the short link https://zip1.io/garagetvlee.

## Lineup and surfing

Channel 000 LIVE SPORTS is the only external destination. The other channels play inside Garage TV. Normal channel up/down surfing uses the bundled direct, ad-free rotations; YouTube channels remain available from the guide. Settings can restore ALL CHANNELS surfing when provider ads are acceptable.

| Channel | Source | Desktop Edge verification |
| --- | --- | ---: |
| 000 LIVE SPORTS | User-configured external HTTPS destinations | External exception |
| 001 SPORTS CLASSICS | Supplied YouTube playlist snapshot | 1 item |
| 002 INDIE / POP | Supplied YouTube playlist snapshot | 13 items |
| 003 RAP / R&B | Supplied YouTube playlist snapshot | 2 items |
| 004 NOSTALGIA | Supplied YouTube playlist snapshot | 2 items |
| 005 90s MUSIC | Official KEXP sessions | 20 items |
| 006 Y2K HITS | Official KEXP sessions | 20 items |
| 007 ROCK / PUNK | Official KEXP and Audiotree sessions | 20 items |
| 008 OFF THE AIR | Official Adult Swim playlist snapshot | 60 items |
| 009 ELECTRONIC | Official videos plus KEXP/Cercle sessions | 20 items |
| 010 SOUL / FUNK | Official videos plus KEXP/COLORS sessions | 20 items |
| 011 SPACE TV | Direct NASA MP4 rotation | 4 items |
| 012 FOOTBALL | Official YouTube queue | 8 items |
| 013 BASKETBALL | Official YouTube queue | 8 items |
| 014 FUTBOL | Official YouTube queue | 8 items |
| 015 ARCHIVE TV | Direct Internet Archive MP4 rotation | 3 items |
| 016 CARTOON TV | Direct public-domain MP4 rotation | 4 items |
| 017 SPORTS REELS | Direct public-domain sports reels | 5 items |

On October 19, 2026, all 200 retained YouTube IDs reached the real IFrame API PLAYING event in desktop Edge, with observed startup of 217 ms minimum, 307 ms median, and 729 ms maximum. All 16 direct MP4s reached playing, with observed startup of 384–2,715 ms. Provider permissions and network performance can change. Desktop evidence does not establish Xbox compatibility.

Every bundled queue shuffles once per page launch. Its order remains stable during that session, every item is used before the next cycle, and the next launch avoids the previous launch item when alternatives exist. Returning to a channel in the same session resumes its current item and timestamp.

## Ad handling

YouTube controls advertising, autoplay, and embed permission. Its IFrame API has no supported setting to suppress ads and does not expose a reliable ad event. Garage TV does not bypass ads or provider protections. The app instead defaults channel surfing to direct NASA and public-domain MP4 rotations, keeps provider-ad channels in the guide, and leaves the YouTube player unobscured when it is active.

Recognizable official music videos were tested in the real embedded player. Most rejected embedding with provider error 150, so the deployable music rotations retain official sessions that actually play. Four official artist videos that passed were added to ELECTRONIC and SOUL / FUNK.

## Playback architecture

Default content lives in data/default-config.json; supplied playlist snapshots live in data/playlist-snapshots.json. src/player.js owns and reuses one YouTube IFrame player. src/native-player.js reuses the native media element for direct video, HLS, audio, and local sources. Each request has a generation token so callbacks from an earlier request cannot replace the selected channel. Only one stream is active and adjacent channels are not preloaded.

The app shows TUNING immediately, reveals playback after the real player event, delays BUFFERING for 500 ms, and preserves unavailable and blocked-autoplay recovery. The guide keeps playback running. Focus and the ON marker remain separate until confirmation.

The 1280 × 720 stage fits against visualViewport, browser zoom, and browser chrome. CALIBRATE SCREEN exposes four corner markers plus fit and position controls; settings persist locally. The Xbox user-agent starts with a conservative 96% fit until the user saves a value.

Settings supports channel editing, ordering, source types, ad classification, surf eligibility, rights attribution, shuffle, JSON import/export, and local storage. Existing configurations migrate to lineup revision 4 while preserving LIVE SPORTS destinations, unrelated custom channels, enabled states, ordering, and service links.

## Controls

The playback strip keeps CH −, GUIDE, CH +, and PLAYER outside the YouTube iframe. PLAYER enables native YouTube interaction; TV CONTROLS returns input to Garage TV.

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
4. npm run test:browser
5. npm run serve
6. Open http://localhost:4173/garage-tv/

Optional network-dependent probes:

- node tests/probe-youtube.cjs --all
- npm run test:direct

The GitHub Actions workflow builds dist/ and deploys it to Pages on pushes to main. Screenshots are written to test-results/. The historical design reference photograph is not production content.
