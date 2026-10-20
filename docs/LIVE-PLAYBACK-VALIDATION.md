# Live playback validation — 2026-10-19

## YouTube

tests/probe-youtube.cjs creates one real YouTube IFrame player in desktop Microsoft Edge, reuses it for every ID, and requires the IFrame API PLAYING event. A public watch page or successful metadata request does not count.

The final sweep covered 200 unique retained IDs. All 200 reached PLAYING. Observed startup was 217 ms minimum, 307 ms median, and 729 ms maximum in that probe session.

An additional group of 60 recognizable official artist and label videos was evaluated for the music channels. Fifty-six returned error 150 because the publisher did not permit this embedded playback context. The four that played were retained in ELECTRONIC and SOUL / FUNK; the rejected items were not shipped. The remaining music rotations use verified official sessions from KEXP, Audiotree, COLORS, and Cercle.

## Direct video

tests/probe-direct.cjs loads every bundled video_queue item into one muted native video element in desktop Edge and requires its playing event. All 16 direct NASA and Internet Archive MP4s played. Observed startup was 384 ms minimum, 544 ms median, and 2,715 ms maximum.

These measurements describe one desktop Edge session. They do not promise ordinary tune latency, future provider availability, regional access, network performance, autoplay, or Xbox behavior. Repeat with:

- node tests/probe-youtube.cjs --all
- npm run test:direct
