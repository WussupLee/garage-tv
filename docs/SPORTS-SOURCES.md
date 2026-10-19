# Classic sports source validation

Checked October 19, 2026 in desktop Microsoft Edge against the real YouTube IFrame API. Each bundled queue item below reached a `PLAYING` event in an individual embed probe. This confirms playback in that browser session; an Xbox One may differ, and publishers can change embedding permission. The lineup uses official publisher channels and embeds their public videos without copying media. YouTube may show ads. The queues are rotations, not synchronized live broadcasts.

| Channel | Official publisher | Game or highlights | YouTube ID |
| --- | --- | --- | --- |
| FOOTBALL | ESPN College Football | Texas–USC 2006 Rose Bowl highlights | [WitAjwWY6EQ](https://www.youtube.com/watch?v=WitAjwWY6EQ) |
| FOOTBALL | ESPN | Texas–USC 2006 Rose Bowl rewind | [7vk_fGPDXDY](https://www.youtube.com/watch?v=7vk_fGPDXDY) |
| FOOTBALL | ESPN Throwback | Ohio State–Miami 2003 double overtime | [HXVzj_EbAuA](https://www.youtube.com/watch?v=HXVzj_EbAuA) |
| FOOTBALL | ESPN College Football | Florida State–Auburn 2014 title highlights | [emZIIc_n9kw](https://www.youtube.com/watch?v=emZIIc_n9kw) |
| FOOTBALL | ESPN College Football | Greatest college title game moments | [1dFhY-AJSE4](https://www.youtube.com/watch?v=1dFhY-AJSE4) |
| FOOTBALL | ESPN College Football | Texas–Alabama 2010 title retrospective | [H1vbeL282po](https://www.youtube.com/watch?v=H1vbeL282po) |
| FOOTBALL | ESPN College Football | Classic Iron Bowl rivalry games | [ENOcodt67TM](https://www.youtube.com/watch?v=ENOcodt67TM) |
| FOOTBALL | ESPN College Football | CFP title game decade highlights | [8K-HUNIFEno](https://www.youtube.com/watch?v=8K-HUNIFEno) |
| BASKETBALL | ESPN | Cavaliers–Warriors 2016 Finals Game 7 full game | [EoVTttvKfRs](https://www.youtube.com/watch?v=EoVTttvKfRs) |
| BASKETBALL | ESPN | 2011 Finals in 13 minutes | [vfhGmT0y9mg](https://www.youtube.com/watch?v=vfhGmT0y9mg) |
| BASKETBALL | ESPN | 2016 Finals in 13 minutes | [oFP83xQaG0A](https://www.youtube.com/watch?v=oFP83xQaG0A) |
| BASKETBALL | NBA on ESPN | LeBron–Kobe 2008 duel | [hcMl6LKwqRE](https://www.youtube.com/watch?v=hcMl6LKwqRE) |
| BASKETBALL | ESPN | Lakers–Celtics Finals rivalry | [c2QL6PoTl1w](https://www.youtube.com/watch?v=c2QL6PoTl1w) |
| BASKETBALL | ESPN | Jordan Bulls 1990–91 dynasty | [LZtatLHnQcQ](https://www.youtube.com/watch?v=LZtatLHnQcQ) |
| BASKETBALL | ESPN | Jordan Bulls 1995–96 dynasty | [Budtv1HCLpQ](https://www.youtube.com/watch?v=Budtv1HCLpQ) |
| BASKETBALL | ESPN | LeBron chase-down block, 2016 Finals | [0Rk5Tz9BRIA](https://www.youtube.com/watch?v=0Rk5Tz9BRIA) |
| FUTBOL | Liverpool FC | Liverpool–Milan 2005 final highlights | [3ojXHf293M8](https://www.youtube.com/watch?v=3ojXHf293M8) |
| FUTBOL | TUDN USA | Liverpool–Milan 2005 final recap | [j6LZLm_9bSE](https://www.youtube.com/watch?v=j6LZLm_9bSE) |
| FUTBOL | TUDN USA | Manchester United–Bayern 1999 final | [_MCZrU4Z5hg](https://www.youtube.com/watch?v=_MCZrU4Z5hg) |
| FUTBOL | TUDN USA | 1999 final retro highlights | [zXyVq_0eTj4](https://www.youtube.com/watch?v=zXyVq_0eTj4) |
| FUTBOL | Liverpool FC | Liverpool–Alavés 2001 European classic | [pKgJT8nqVSQ](https://www.youtube.com/watch?v=pKgJT8nqVSQ) |
| FUTBOL | Liverpool FC | Arsenal–Liverpool 2001 FA Cup classic | [y54DrDfVTtc](https://www.youtube.com/watch?v=y54DrDfVTtc) |
| FUTBOL | Liverpool FC | Liverpool–Arsenal 2008 European classic | [jZSOXy2K6UQ](https://www.youtube.com/watch?v=jZSOXy2K6UQ) |
| FUTBOL | Liverpool FC | Liverpool–Juventus 2005 European classic | [vItaJtaAgEY](https://www.youtube.com/watch?v=vItaJtaAgEY) |

Public NFL, NBA, FIFA, and UEFA YouTube pages initially looked promising, but their sampled official embeds returned player error 150 in Edge. They are not in the in-app queues. The previously shipped external archive alternates were removed so channels 012–014 always remain inside Garage TV. FOOTBALL's verified queue currently contains college football.

For a repeat check, run `node tests/live-sports.cjs` to tune all three channels or `node tests/probe-youtube.cjs VIDEO_ID ...` to test individual embeds. Both require Playwright, Edge, and network access. The controlled browser suite uses doubles and runs without YouTube.
