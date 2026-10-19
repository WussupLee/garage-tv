# Multi-source architecture and compatibility

## Source model

The deployable defaults are in data/default-config.json. A channel contains an id, order, title, description, enabled state, active source, and source list. Supported source types remain youtube_playlist, youtube_queue, hls_stream, audio_stream, external_site, and local_media.

Lineup revision 3 uses external_site only for channel 000. Channels 001–014 use the single YouTube adapter. HLS, direct audio, and local media remain available for custom channels in Settings.

youtube_playlist sources use a verified snapshot when one exists, otherwise YouTube playlist loading. youtube_queue sources contain unique video IDs with title, publisher, factual source year, and program kind. shuffleEachLaunch is stored per YouTube source and exported/imported with the rest of the configuration.

## Switching behavior

src/player.js owns one YT.Player. Switching between YouTube channels stops the current item, invalidates the previous request, and loads the new session queue into the same iframe. Callbacks must carry the current request generation before they can change presentation state. Only one stream is active; adjacent channels are not prefetched.

Each shuffled source gets a Fisher–Yates permutation on page launch. The order stays fixed while surfing, uses every item before repeating, and reshuffles after a complete cycle. The prior launch item is persisted only to avoid an immediate launch repeat. Current item and time are remembered in memory for a same-session return. When shuffle is disabled, custom channels retain persistent bookmarks.

A channel request immediately shows TUNING. The real PLAYING event reveals video and starts the three-second station label. BUFFERING appears after a continuous 500 ms wait. Autoplay blocks request user interaction; unavailable sources time out or report the IFrame error. Guide browsing keeps playback running and does not tune until confirmation.

The iframe is nonfocusable and pointer locked in TV mode. The persistent safe-area strip provides CH −, GUIDE, CH +, and PLAYER. PLAYER temporarily enables native YouTube interaction. TV CONTROLS remains above the iframe and always restores Garage TV input ownership.

## Default verification matrix

| CH | Type | Desktop Edge evidence on 2026-10-19 |
| --- | --- | --- |
| 000 LIVE SPORTS | external_site | User-configured destinations; sole external exception |
| 001 SPORTS CLASSICS | youtube_playlist | 1 supplied snapshot item reached PLAYING |
| 002 INDIE / POP | youtube_playlist | 13 supplied snapshot items reached PLAYING |
| 003 RAP / R&B | youtube_playlist | 2 supplied snapshot items reached PLAYING |
| 004 NOSTALGIA | youtube_playlist | 2 supplied snapshot items reached PLAYING |
| 005 90s MUSIC | youtube_queue | 20 official KEXP sessions reached PLAYING |
| 006 Y2K HITS | youtube_queue | 20 official KEXP sessions reached PLAYING |
| 007 ROCK / PUNK | youtube_queue | 20 official KEXP/Audiotree sessions reached PLAYING |
| 008 OFF THE AIR | youtube_playlist | 60 official Adult Swim items reached PLAYING |
| 009 ELECTRONIC | youtube_queue | 20 official KEXP/Cercle items reached PLAYING |
| 010 SOUL / FUNK | youtube_queue | 20 official KEXP/COLORS items reached PLAYING |
| 011 SPACE TV | youtube_queue | 20 official NASA items reached PLAYING |
| 012 FOOTBALL | youtube_queue | 8 official items reached PLAYING |
| 013 BASKETBALL | youtube_queue | 8 official items reached PLAYING |
| 014 FUTBOL | youtube_queue | 8 official items reached PLAYING |

A desktop result is a dated observation, not permanent certification or an Xbox claim. YouTube can change embed permission, advertising, autoplay, and regional availability.

## Diagnostics

Diagnostics reports source URL or item URLs, source type, current status, startup latency, autoplay behavior, queue size, shuffle status, current session position, player creation count, and player reuse count. The controlled browser suite verifies UI and lifecycle behavior with mocked player events. tests/probe-youtube.cjs verifies real IFrame playback.

See XBOX-TESTING.md for the remaining physical console checks.
