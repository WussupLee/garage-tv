# Xbox One acceptance checklist

Desktop automated checks use a controlled player and simulated controller. They do not establish Xbox or live YouTube compatibility.

1. Open https://zip1.io/garagetvlee in Xbox One Edge; bookmark it. Confirm the Local Station design and safe margins at 720p and 1080p, including TV overscan and fullscreen.
2. All five YouTube channels have user-supplied playlist defaults. Confirm 004 RETRO TV uses Nostalgia and 005 OFF THE AIR loads its supplied playlist. Existing custom sources are preserved during the six-channel upgrade.
3. Check startup among configured channels. TUNING must appear immediately on requests; actual PLAYING reveals video, keeps the label about three seconds, then shows the compact bug. No artificial switch delay.
4. Test audio autoplay. If PRESS A TO START appears, use A/Enter or the Edge cursor. Test native YouTube controls if a synthetic gamepad action is not accepted as a trusted gesture. Confirm only one stream is audible.
5. Open Diagnostics via D or Controls. Record controller ID, mapping and raw indices for D-pad/A/B/Y/Menu/LB/RB. Unknown mappings are diagnostic only. Confirm whether Edge reserves B/Back or Menu.
6. D-pad up/down surfs previous/next and wraps 000–005. Held directions repeat after 350 ms then every 160 ms. A/B/Y and bumpers should trigger once per press. Y toggles the guide; C/Menu or clicking the bug opens utility controls.
7. Open guide during playback. Video stays full-size and audio continues. White focus can move to 001 while ON remains 003. Left/right do nothing. Focus clamps at top/bottom. A confirms, B closes without retuning. Confirming the current channel simply closes. Closing after the OSD timer expires must show the bug, not restart the label timer.
8. Rapidly surf channels while loading. Late callbacks must not reveal an earlier channel or produce extra audio. Test brief stalls (<500 ms), longer buffering with retained frame, and resumption. Check ads and video transitions do not leave misleading overlays.
9. Test private/removed/non-embeddable sources and network failure. Explicit errors show CHANNEL UNAVAILABLE; pending tuning fails by 20 seconds. A retries, B opens the guide. No infinite skip/retry loop. Missing sources can be configured in Settings.
10. Check keyboard arrows/Enter/Esc/G/S/D/C/M/Space and [/] plus cursor controls. Text entry must remain usable. Move focus from the YouTube iframe back to the app using Tab or Edge cursor; note any controls the iframe intercepts.
11. Watch playlist advancement/looping. Switch away and return: unscheduled playback resumes bookmarks, without claiming it advanced while away. With a verified-duration manifest, test five-minute return seeks, program boundaries, pause/resume, background/foreground and ads. Record drift before claiming synchronization.
12. Channel 000 opens service URLs in the same tab. Edge Back should restore the app. Third-party services control their own playback/pop-ups.
13. Edit channels/services, reload, and test JSON import/export. PC and Xbox storage are separate. Check download/file selection support.
14. Run for 30–60 minutes. Record Edge version, URL, channel, controller input, error and reproduction steps for failures.
