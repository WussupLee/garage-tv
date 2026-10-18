# Virtual broadcasts

The YouTube IFrame API does not provide durations for every video in an arbitrary playlist. Garage TV does not invent lengths or fetch a playlist through undocumented APIs. With no complete duration manifest, a channel uses a continuous looping playlist and saves the most recent position locally. That mode **does not advance while away**; NOW can show the active video title and NEXT has unknown timing.

For virtual broadcast behavior, enter a complete schedule in a channel's Settings or exported configuration:

```json
{
  "epoch": "2026-01-01T00:00:00Z",
  "durationsVerified": true,
  "shuffle": true,
  "programs": [
    { "videoId": "YOUR_VIDEO_ID", "title": "Measured program title", "duration": 1800 }
  ]
}
```

The placeholder video ID above is intentionally invalid. Replace it with an actual 11-character YouTube video ID and its measured duration in seconds. Set `durationsVerified` only after checking the lengths; exclude live streams, unavailable videos, and content whose duration changes. Add all programs in the order desired; shuffle is optional. A channel can use a schedule without a playlist URL. The schedule is authoritative when both are set.

Schedule order uses a deterministic Fisher–Yates shuffle seeded by the configuration seed and numeric channel ID. It repeats the same order each cycle, using `(current UTC time − epoch) modulo total duration`. There are no background players. On each tune, Garage TV calculates the current program and position and asks the one active player to seek there. Refreshes use the same manifest, seed and epoch. Changing those changes the virtual broadcast.

NOW/NEXT derive from this calculation, including for untuned scheduled channels. During active scheduled playback the application checks program boundaries every second. Play after pause and return from a background tab recalculate the current position. The device clock must be correct. YouTube seeks to nearby keyframes; ads, buffering, throttled background tabs and embed restrictions can affect actual timing.

If YouTube reports a duration differing by more than three seconds, Garage TV suspends synchronization for that tune. A failed scheduled video may be skipped; that also suspends sync until retuning. The UI explicitly labels this state. Automatic skip recovery is bounded to four consecutive unavailable-video errors. Other failures require Start/retry, manual skip or another channel. A scheduled channel with only one blocked program will still require user intervention.

Automated tests verify deterministic math and player seek commands with a controlled API double, including returning five minutes later. They do not verify real video synchronization, ad timing or Xbox playback. No default channel currently has a verified duration manifest.
