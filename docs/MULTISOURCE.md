# Multi-source architecture and compatibility

## Source model

The deployable defaults are in data/default-config.json, separate from the player. The saved configuration is version 2. A channel has id (000–999), order, title, description, enabled, activeSource, and sources. A source has type, name, url, enabled, verification, schedule, and capabilities. Legacy v1 settings migrate automatically; custom sports destinations and YouTube playlists are retained. Export JSON before replacing browser storage.

- youtube_playlist: YouTube playlist ID or playlist URL. The existing IFrame player and saved playlist snapshots supply playback. An optional schedule works only with measured durations. YouTube controls ads and embedding restrictions.
- youtube_queue: Ordered items with a unique 11-character videoId, title, publisher, event year, and full/partial/highlights kind. The same IFrame player plays and loops them, saves an index and time position, and shows actual queue NOW/NEXT while tuned. Settings accepts queue JSON. No fabricated durations or broadcast clock are used.
- hls_stream: HTTPS m3u8 source. Native HLS is attempted first; HLS.js is loaded from a pinned CDN only if needed. Transport, CORS, codecs, and authorization remain source dependent.
- audio_stream: HTTPS MP3, AAC, or browser-supported audio URL. The single audio element remains active while the station identifier is visible.
- external_site: HTTPS link presented in a directory. Selecting the link navigates this tab, explains Edge Back, and never claims in-app switching or control.
- local_media: User-selected audio/video files. Blob URLs exist only in the current session and are revoked when replaced. No server or upload is created.

Changing a channel invalidates earlier request IDs, stops prior YouTube and native media, clears the old source, and immediately displays TUNING. A ready YouTube iframe is reused for queue targets; other transitions recreate it when request-scoped callbacks cannot be safely reused. Native audio/video elements are reused. There is no adjacent-channel prefetch because simultaneous stream downloads would be expensive on Xbox One. Native playback uses the media playing event; video waits for its first frame callback when supported. The diagnostics timer starts at selection and stops at first observed playback, but includes network and user-interaction time if needed. Guide browsing never requests another source.

HLS failures get at most two reconnect attempts. The display continues to respond if a source stalls; the presentation state times out after 20 seconds. Buffering text appears after a continuous 500 ms wait. A successful start or resume keeps the channel label for three seconds. YouTube has provider-controlled ads and may reject video embeds; a successful channel page or URL fetch is not evidence that all playlist videos can play.

## Default channel verification matrix

| CH | Type | Evidence and limit |
| --- | --- | --- |
| 000 LIVE SPORTS | external_site | No bundled destination. Add preferred authorized HTTPS links in Settings. Prior saved links migrate. |
| 001 SPORTS CLASSICS | youtube_playlist | User-supplied sports list. Previous desktop IFrame tests found playable snapshot entries; new Xbox session required. |
| 002 INDIE / POP | youtube_playlist | User-supplied indie/pop list, same limit. |
| 003 RAP / R&B | youtube_playlist | User-supplied rap/R&B list, same limit. |
| 004 RETRO TV | external_site; YouTube alternate | 00s Retro TV website loads as a destination; provider playback and Xbox controls unverified. Nostalgia playlist preserved. |
| 005 90s TV | external_site | Official 90s Retro TV website loads; Xbox playback unverified. |
| 006 VEVO 2K | external_site | Pluto page currently identifies Vevo 2K; geographical and Xbox playback unverified. |
| 007 MUSIC TV | external_site | XITE site link only; no supported embeddable Xbox browser player established. |
| 008 LATE NIGHT | external_site; YouTube alternate | Adult Swim Off the Air page includes a free 24/7 marathon; Xbox playback unverified. Playlist preserved. |
| 009 INDIE ARCHIVE | external_site | altmusictv is an archive, not a continuous stream. |
| 010 GARAGE RADIO | external_site | SomaFM listening pages only. Provider terms prohibit third-party embedding without prior permission. |
| 011 PUBLIC TV | hls_stream | Empty configurable placeholder. No IPTV source passed authorization, CORS, codec, and playback checks. |
| 012 FOOTBALL | youtube_queue; external alternate | Eight official college football videos played in desktop Edge. NFL official videos returned embed error 150, so NFL Throwback is an external alternate. |
| 013 BASKETBALL | youtube_queue; external alternate | Eight official ESPN videos, including a complete 2016 Finals Game 7, played in desktop Edge. NBA official videos returned embed error 150; NBA Classic Games is external. |
| 014 FUTBOL | youtube_queue; external alternate | Eight official Liverpool FC and TUDN classic highlights played in desktop Edge. FIFA and UEFA official videos returned embed error 150; FIFA+ Archive is external. |

Status terms in Diagnostics: UNTESTED means no current session result; DESKTOP PLAYING means the browser emitted an actual playing/first-frame signal; REQUIRES INTERACTION means autoplay was blocked; OPENS EXTERNALLY means a same-tab provider link; UNSUPPORTED means the source failed or timed out. These are browser-local observations, not a permanent provider certification.

Useful provider references: https://pluto.tv/us/watch/live-tv/31215/ ; https://www.adultswim.com/videos/off-the-air ; https://somafm.com/contact/tos.html ; https://github.com/iptv-org/iptv . An iptv-org listing alone does not establish rights to embed or reliable playback.

## Validation performed

Unit tests cover schema constraints, legacy and saved-v2 migration, source selection, schedule behavior, presentation timers, and gamepad mapping. The controlled Playwright suite in desktop Edge covers all fifteen guide rows, focus versus ON, queue switching with one player, external navigation presentation, settings, storage, diagnostics, and a locally generated audio fixture played through the native audio adapter. A separate real-network Edge run on October 19, 2026 observed `PLAYING` for the first item of channels 012/013/014 in approximately 2.2/1.6/1.6 seconds after selection. Every bundled sports queue item was probed individually for an actual IFrame `PLAYING` event. Results are session-specific; they do not establish Xbox playback or future provider permission. The older playlists are documented in LIVE-PLAYBACK-VALIDATION.md. No live HLS source has passed all required checks, so no HLS performance number is claimed. External destinations have no in-app tune latency.

## Xbox One manual checklist

1. Open the published HTTPS URL in Xbox One Edge at 1280 × 720. Confirm the stage fits without clipping or a browser zoom offset.
2. Start channels 001, 002, 003, 012, 013, and 014. Record whether each reaches video, needs A, fails, or shows a provider ad. Time selection to the first video frame with a stopwatch. Test several queue items with Next Video. Repeat for alternate YouTube sources on 004 and 008.
3. Open the guide while video and audio play. Move the white row several times; verify ON remains at the playing channel and audio does not restart. Press A to tune.
4. Surf rapidly with D-pad Up/Down and bumpers. Verify an earlier source never starts after a later request. Check B/Y, Menu, and the on-screen fallback because Edge may reserve buttons.
5. Add a permitted test HLS URL and a permitted direct radio URL in Settings. Run each from Diagnostics, record codec/CORS errors and startup time, then try channel surfing. Do not use third-party streams without permission.
6. Check buffering, retry, and unavailable recovery after disconnecting network access. Confirm guide and settings remain responsive.
7. Open external provider links for 004–010. Record whether each destination actually plays on Xbox Edge and whether Edge Back returns to Garage TV. Provider controller behavior is outside Garage TV.
8. Test FULL SCREEN, browser Back, reload persistence, JSON export/import, local file re-selection, and 1080p scaling if available.
9. Report Xbox Edge version, region, channel number, timestamp, and any on-screen error for failures.

Recommended next work: obtain permission for a direct radio source, identify one authorized CORS-enabled HLS channel, validate live Xbox playback and controller capture, and compare repeat tune measurements for that stream against the three YouTube channels.

