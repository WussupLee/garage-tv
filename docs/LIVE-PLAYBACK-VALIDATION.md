# Live YouTube playback validation — 2026-10-19

The validation probe constructs a real YouTube IFrame player in desktop Microsoft Edge, reuses that iframe for each ID, and waits for the API PLAYING event. A public watch page or successful metadata request is not counted as playback.

## Results

- All 100 entries across 90s MUSIC, Y2K HITS, ROCK / PUNK, ELECTRONIC, and SOUL / FUNK reached PLAYING.
- All 60 official Adult Swim OFF THE AIR entries reached PLAYING.
- All 20 official NASA SPACE TV entries reached PLAYING.
- All 24 FOOTBALL, BASKETBALL, and FUTBOL queue entries reached PLAYING.
- The supplied playlist snapshots were filtered to the 1, 13, 2, and 2 entries that played for SPORTS CLASSICS, INDIE / POP, RAP / R&B, and NOSTALGIA respectively.

The final sweep covered 220 unique video IDs. All 220 reached PLAYING. With one reused iframe in that desktop Edge session, observed per-item startup was 187 ms minimum, 245 ms median, and 613 ms maximum. These measurements describe the probe session and are not promises for normal playback, ads, other networks, or Xbox hardware.

Many otherwise public official music videos returned YouTube error 150, meaning the owner does not permit this embedded playback context. The deployable music rotations therefore use verified official performances from KEXP, Audiotree, COLORS, Boiler Room, and Cercle. Garage TV does not try to bypass the restriction.

Run node tests/probe-youtube.cjs --all to repeat the sweep. Results are provider and network dependent and may change. A desktop Edge result does not establish Xbox One autoplay, controller focus, codec behavior, or tune latency.
