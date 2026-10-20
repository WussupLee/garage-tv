# Multi-source architecture and compatibility

## Source model

The defaults in data/default-config.json support youtube_playlist, youtube_queue, video_queue, hls_stream, audio_stream, external_site, and local_media. A source can declare its ad class, normal-surf eligibility, shuffle behavior, verification result, license, attribution, and loading artwork. Direct video queue items require a unique HTTPS URL plus title, provider, license, and attribution.

Lineup revision 4 uses external_site only for channel 000. Channels 001–010 and 012–014 use one reused YouTube adapter. Channels 011 and 015–017 use one reused native media adapter with direct NASA or Internet Archive MP4s.

## Switching behavior

Normal up/down surfing defaults to sources marked direct and ad-free: SPACE TV, ARCHIVE TV, CARTOON TV, and SPORTS REELS. YouTube channels are selected from the guide. The user can choose ALL CHANNELS in Settings.

src/player.js owns one YT.Player; src/native-player.js owns the native media elements. A channel change invalidates the prior request before loading the selection. Callbacks must carry the current generation. Only one source remains active and adjacent channels are not prefetched.

Each shuffled source gets a Fisher–Yates permutation on page launch. The order remains fixed during that session, uses every item before repeating, and reshuffles after a complete cycle. Current item and time are remembered for a same-session return. Custom sources with shuffle disabled retain persistent bookmarks.

The YouTube player is never covered by Garage TV UI. During tuning, buffering, blocked autoplay, or failure, the player and station card use a split layout. During playback, the player uses the available stage above the TV control strip. This preserves provider controls and visible ads while keeping channel navigation accessible.

## Screen fitting

The fixed 1280 × 720 stage scales against visualViewport where available, including offsets introduced by browser chrome. A saved 85–100% fit factor and ±80 px offsets allow television overscan adjustment. The calibration overlay shows all four corners. Diagnostics reports layout viewport, visual viewport, pixel ratio, fullscreen state, and saved fit values.

## Diagnostics

Diagnostics reports source type, current status, startup latency, autoplay behavior, queue size, shuffle state, session position, player creation/reuse counts, ad class, surf eligibility, rights attribution, viewport geometry, and native player state. Controlled browser tests use player doubles. The two optional probes exercise real Edge and provider networks.

See LIVE-PLAYBACK-VALIDATION.md for dated desktop evidence and XBOX-TESTING.md for the remaining console checks.
