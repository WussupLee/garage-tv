# Live YouTube playback validation — 2026-10-18

The original release created an empty `/embed/` iframe. It did not become ready before the 20-second tune timeout. A real desktop Edge test reproduced the user's CHANNEL UNAVAILABLE state.

Giving the player a source at construction resolves startup. Four user-supplied NostalgiaTV playlist containers then returned YouTube error 101 / "This video is unavailable" in the embed, though their public pages listed entries. Individual first videos from each playlist played in the official IFrame player. OFF THE AIR's playlist feed played directly.

`data/playlist-snapshots.json` contains public entry IDs and titles captured from the four supplied playlist pages on 2026-10-18. It excludes recommendations, unavailable entries and guessed IDs. Garage TV loads those videos through the official player one at a time, advances on ENDED, and wraps. The original playlist ID remains the channel source and bookmark key. OFF THE AIR retains its working YouTube playlist feed. A changed source without a matching snapshot uses the normal playlist feed; its embed behavior depends on YouTube. The snapshots may become stale if owners change the playlists, so update them after verifying new entries.

Real desktop Edge testing against the live origin, with the pending source code routed locally, confirmed state PLAYING and increasing playback seconds on all five YouTube channels: Sports 92fLApYaCGI, Indie / Pop TZl0MHwgn8c, Rap / R&B HmAsUQEFYGI, Retro TV Mh1U3Y8iAuI, Off the Air uuTZwod_EKI. Autoplay was sometimes blocked in headless Edge; Enter began playback. This is evidence of desktop playback, not a physical Xbox One test. Embeddability of every later video and Xbox behavior still need validation.

A further desktop run exposed intermittent silent cueing: the iframe was ready but emitted neither PLAYING nor onAutoplayBlocked. The app now checks the real player state after three seconds and presents A START when playback has not begun. Real playback across all five channels was rechecked with this recovery.
