# Home connection globe — approved motion brief

## Purpose and placement

The globe is a personal greeting that connects the visitor to Jaemin in Seoul.
Place it after `HomeProfile` and before Projects. Use continent-specific paired colors for the dotted globe,
the existing rabbit asset for Seoul, and a small point for the visitor. Match
light and dark themes using the site's HSL color tokens.

## Home entrance integration — approved 2026-10-05

The globe belongs to the home's entrance sequence. Its heading opts into that
sequence on **every home entry**, including client-side returns and reloads;
other home content retains its existing first-visit policy.

The heading retains the home's 900 ms blur/opacity/8 px rise. A 100 ms gap
leads into the approved Settle scene. Its 120 ms opacity entrance overlaps the
opening particle motion; the figure does not move or blur. The scene uses the
same 1000–6600 ms timeline as the selected study. Slow location/mask loading may
delay its start without skipping assembly. The nonzero time count starts at
route arrival, 6000 ms, and runs for 600 ms once its row is visible.

Prepare the location and land mask near the viewport. Start the figure only when
the heading is visible, the scene is ready, at least half the stage is in view,
and the tab is active. Until then, the figure, loading circle, and caption stay
hidden while retaining their layout space. A fast scroll past the heading must
not prevent the visible globe from starting. Slow/failed hydration retains the
home's 600 ms readable fallback and must not re-hide already visible content.

The finite entrance completes naturally through scrolling, as other home
entrances do. The internal journey retains its viewport/tab pause and resume.
There is no exit animation. Cleanup cancels pending entrance effects and
observers; a new home mount starts a new journey. Theme changes do not replay it.
Reduced motion shows the heading immediately and the finished figure with only
a 150 ms opacity fade; enabling it mid-entrance settles the movement immediately.

Use CSS for first paint and WAAPI for the finite entrance; retain the existing
Framer Motion journey. No new animation dependency is needed. Verify first paint,
home returns/reloads, slow loading, skipped headings, mobile layouts, reduced
motion, and readable content without JavaScript.

## Internal timeline

Times include the 900 ms home heading and the 100 ms gap. The rest of the page
remains usable throughout the sequence.

| Elapsed      | Action                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| 0–1000 ms    | Home heading, then a short gap.                                                                            |
| 1000–1240 ms | Globe, coastlines, and airborne grains enter together.                                                     |
| 1240–2800 ms | Scale and yaw ease to rest while individual grains land; the upper-left cloud joins the same trajectories. |
| 2080–2800 ms | As the scale settles, smoothly fade the coastlines while the last grains land.                             |
| 2800–3000 ms | Reveal the visitor where visible over the completed point map.                                             |
| 3000–4400 ms | Move from the Atlantic assembly view to frame the visitor and Seoul.                                       |
| 4400–6000 ms | Draw the raised route and count the distance, or reveal the shared nearby cluster.                         |
| 6000–6600 ms | Count the actual nonzero time difference; unlock dragging at completion.                                   |

Particle settlement now takes 1800 ms, 40% less than the selected study's initial
3000 ms. Scale, yaw, incoming grains, and lighting keep their relative cues.
The contour handoff overlaps the last 720 ms of settlement, with zero fade
velocity at both ends. Later phases and the 12-second gradient cycle are unchanged.

The full motion, lighting, paired color references, and particle behavior are
recorded in [the selected Settle study](home-connection-globe-settle.md).
The scene keeps that selected choreography, while the home owns heading reveal,
IP location, accessible copy, actual time-zone calculation, and pointer/keyboard
interaction. The comparison route and its fixture controls are removed.
After arrival only a distant route's spatial teal/blue/violet gradient moves,
with a seamless 12-second cycle. It freezes at its current phase for reduced
motion and while the scene/tab is inactive. Completed ambient frames reuse the
cached geometry and do not recalculate markers or update React on every tick.

The distance label follows the growing route's head using the same progress.
It settles above the rabbit at arrival. Camera, points, route, and markers use
one world coordinate system. The final camera tilts across the route plane so
the arch is visible; the globe occludes anything behind its surface.

Dragging is enabled only after the intro completes. Release eases to rest over
200 ms, without automatic rotation resuming. A new drag interrupts this inertia
at its current angle. Pointer cancellation stops immediately. Horizontal touch
drags work while vertical scrolling and pinch zoom remain available. A focused
globe also supports immediate arrow-key rotation and Home to restore its framing.

Pause intro, color flow, and inertia when the stage leaves the viewport or the
tab becomes inactive. Resume from the same point. Page exit disposes animation,
observers, listeners, pending asset requests, and WebGL resources. Returning home
starts a new journey.

## Reduced motion

Use the final camera, completed path, final distance, and a static gradient.
Fade the scene in over 150 ms. Do not assemble, zoom, rotate automatically, travel,
count up, or cycle colors. Direct user manipulation remains available without
inertia. Switching reduced motion on mid-flight settles the scene immediately;
switching it off does not restart the introduction.

## Location and distance

Use Vercel's IP-based latitude/longitude headers through a private, uncached
route. Keep the home document statically renderable. Do not return or persist the
raw IP address. Missing or invalid coordinates mean unavailable, never a sample
city or `(0, 0)`.

Seoul uses a representative city coordinate (37.5665, 126.978), not a home
address. Distance is the great-circle surface distance between estimates.
Display whole kilometers, or whole meters when the final distance is below 1 km.
State clearly that IP estimates can differ from the real location.

For visitors within 50 km of Seoul, use the selected “같은 반경” direction.
Keep the same particle assembly and camera journey. Once the camera settles at
4400 ms, show a shared avatar capsule above the Seoul surface point and three
subtle concentric ellipses beneath it. The capsule enters in 250 ms; the rings
expand in 220 ms with 32 ms stagger, finishing within 284 ms. Finish the measured
distance count on the 6000 ms arrival, including `0 m`.

The halo denotes a shared vicinity, not a scaled geographic radius. It adds no
route geometry and does not displace either coordinate. Keep the cluster anchored
to the projected Seoul point during dragging, and hide it visually and from
keyboard focus when that point goes behind the globe.

After arrival, hovering or focusing gently separates the overlapping avatars
and enlarges the halo. Clicking, tapping, Enter, or Space replays only the short
halo expansion; it must not rotate the globe or restart the introduction. Keep
this button outside the decorative scene's `aria-hidden` subtree. Reduced motion
shows the final halo immediately and removes its entrance and hover movement.
There is no idle animation or route-color render loop in the nearby scene.

## Approved copy

- Heading: “서울에서 만들고, 다듬고 있습니다.”
- Remove “저는 대한민국 서울에 살고 있어요.” and “서울의 재민”.
- Keep “방문자”.
- Nearby capsule: “방문자 · 재민”. Below it, show “같은 위치로 표시돼요”
  for identical coordinates, otherwise “가까운 곳에서 만났네요”, then
  “서울 부근 · {distance}”.
- Final sentence: “지금 우리는 약 {distance} 떨어져 있네요.” Use compact units,
  such as `20km`, in this sentence; preserve the counter's spaced units.
- For distances above 50 km, add a second line:
  “그래도 웹에서는 이렇게 빠르게 만날 수 있죠.”
- Omit that second line within 50 km, including 0 m and 20 km.
- Keep “IP 기반 추정 위치 · 실제 위치와 다를 수 있어요”.

Location failure shows Seoul and a friendly unavailable message. WebGL failure
retains a simple globe outline, the distant route or nearby shared halo, and readable distance text. Reserve
stage and caption space during loading. Assistive technology receives the final
sentence rather than every intermediate counter update.

## Implementation and validation

Use a small WebGL particle/ribbon renderer and Framer Motion playback controls.
COBE 2.0.1's bundled land mask is redistributed unchanged with its MIT license in
`public/globe/`. The renderer samples it once into equal-area Fibonacci points:
12,000 candidate samples on narrow screens and 22,000 on larger ones. DPR is
capped at 2. The broad continent colors are visual regions, not border data.

Particle positions interpolate in a vertex shader. The final caption fades in at route arrival, alongside the actual time difference;
the server-rendered greeting stays hidden during assembly. Route geometry is built only
when the viewport changes; the fragment shader provides the moving gradient and
sphere occlusion. HTML marker projection uses the same camera. SVG retains a
readable route only if WebGL is unavailable. Load everything near the viewport;
show the scene after the mask and point buffer are ready, including reduced motion.

No package changes are needed for this extension. Existing dependency and patch
registrations remain unchanged. Validate visual density, camera framing, theme
contrast, and GPU behavior in the browser; desktop viewport emulation does not
prove physical-phone performance.

Check international, nearby, identical, polar, and antipodal locations; narrow
mobile layouts; light/dark themes; pause/resume; reduced motion; location failure;
and WebGL unavailability. Actual Vercel IP headers require a deployed runtime;
local browser tests must identify their coordinates as fixtures.

## Visitor time difference — approved 2026-10-05

Directly below the distance sentence, compare Seoul with the time zone supplied
by the same IP geolocation as the globe. Read Vercel's `x-vercel-ip-timezone`
header; never substitute the device time zone. Use the current instant and IANA
zone rules, including daylight saving and 30/45-minute offsets. Invalid or absent
time-zone metadata omits this row while preserving valid location coordinates.

At the 6000 ms route arrival and only once the row is in view, nonzero differences
count from zero to the actual value in **600 ms**, with `(0.19, 1, 0.22, 1)` easing.
Use “서울은 {difference} 빠르네요.” when Seoul is ahead and “느리네요.” when behind.
Whole-hour differences count hours; fractional differences retain minutes. Keep
numeric space stable and announce only the final value to assistive technology.

For zero difference, show exactly **“같은 시간대에 머물고 있어요.”** with a **150 ms
opacity fade**, without a numeric counter. Pause and resume when outside the
viewport or in an inactive tab. Play once per home mount; re-entry into the
viewport and theme changes must not restart the count. Reduced motion shows the
final value with only a 150 ms fade, and enabling it mid-count settles the value.

Header contract: [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-ip-timezone).
Offset calculation: [Intl.DateTimeFormat timeZoneName](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#timezonename).
