# Settle — 6.6-second motion study

Scope: the selected Settle direction is promoted into the home connection globe.
The comparison surface is removed. Home integration and privacy contracts are
documented in [the home brief](home-connection-globe-motion-brief.md).

The visitor sees a world form before it connects their location to Seoul.
Playback starts once the home heading and location scene are ready, once per mount.
There is no exit animation. All times include the heading entrance.

Reference: [Stripe globe video](https://x.com/narrowd/status/1154399513198698496).
The inspected 60 fps recording shows the globe first around 1800 ms, rapid scale
and yaw changes through 3400 ms, and the last airborne grains landing around
6000 ms. Relative to the final diameter, the sphere measures about 72% at
1900 ms, 86% at 2400 ms, and 98% at 3400 ms. These are visual measurements;
the original particle trajectories and easing curves are not available.
The current timing keeps that choreography with a 1000 ms greeting-to-globe
start and an 1800 ms assembly. Settlement is 40% shorter than the previous
3000 ms home version. Camera travel, connection, and the final count keep their
existing durations and begin 1200 ms earlier, bringing total playback to 6600 ms.

| Time         | Scene                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 0–1000 ms    | Heading enters over 900 ms with a soft rise and blur; the globe follows after a short 100 ms gap.                           |
| 1000–1240 ms | Globe, faint coastlines, and airborne grains appear together, including a soft cloud above the upper-left rim.              |
| 1240–1690 ms | The globe grows toward its final size and turns the Americas left, toward an Atlantic view. Some grains already reach land. |
| 1690–2800 ms | Scale and yaw ease toward rest while the remaining grains descend from individual heights.                                  |
| 2080–2800 ms | Once scale settles, coastlines smoothly yield to the landing grains over the last 720 ms of assembly.                       |
| 2800–3000 ms | Visitor marker appears where visible over the completed point map.                                                          |
| 3000–4400 ms | Camera moves continuously from the Atlantic assembly view to frame the visitor and Seoul.                                   |
| 4400–6000 ms | Route and distance progress together. The glow settles to a static halo at opacity 0.34.                                    |
| 6000–6600 ms | Nonzero time difference counts up; the same-zone message is static.                                                         |

There is no empty-globe rotation phase and no meridian geometry. The globe
starts at 68% of its assembly size. Cubic ease-out expands it over 1080 ms;
exponential yaw decay starts fast and has a long tail. The starting view is
about 100 degrees west of the final Atlantic view. The camera is shared by
the contours and grains, so their geographic anchors stay aligned.

The assembly clock is linear; each grain has its own seeded start delay, height,
angular scatter, flake size, and arrival time. Quadratic progress followed by
smoothstep with a softened height falloff lets the last grains stay high longer
and ease onto the surface.
Individual descent curves overlap from the opening through the final landings. The northern
American cloud has the longest tail. Floating grains have translucent, rotated
flake shapes and depth-dependent size; each settles into a fine round map dot
along its own descent curve. Every grain keeps the same color from launch to
rest. The 2800–3000 ms visitor reveal has no shared recolor or point-size boost.

About a quarter of the existing grains start in a broad, faint upper-left
volume at 1000 ms. They follow varied curved paths into the moving cloud over
432–540 ms, with cubic ease-out and no separate particle layer. Seeded depth
and the existing sphere occlusion keep the flow three-dimensional; soft cloud
and viewport edges prevent a hard emission boundary. These grains descend
while joining, but cannot finish landing before the join completes. Their
approach reaches the existing trajectory with no residual offset or velocity.
The original particle budget, 2800 ms settlement, and 6600 ms completion stay
unchanged.

The contour fades during the final landings, using smoothstep from 2080 to
2800 ms. Its opacity starts and finishes with zero velocity, so the point map
takes over continuously. Previously the contour held at 0.72 until 2800 ms,
then a steep 200 ms ease-out removed about 69% of its opacity in the first
33 ms; frame scrubbing showed this as a separate outline switch-off.
No bounce, idle rotation, or pulsing follows arrival.

Each continent uses two stable, locally mixed colors in approximately equal
numbers. Seeded ordering within equal-area cells avoids broad color bands;
replay, rotation, and viewport changes do not animate the color assignment.
Light and dark themes retain each color family, with luminance adjusted for
the background. The palette uses selected regional and natural references as
design inspiration, not an assertion of one culture or official color per
continent. Asia draws on Korean craft because this experience begins in Seoul.

| Continent     | Pair                                | Selected reference                                                                                                                                                                                         |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| North America | Adobe terracotta / turquoise        | [Taos adobe architecture](https://home.nps.gov/articles/000/taos-pueblo-world-heritage-site.htm) and [Southwestern turquoise jewelry](https://americanindian.si.edu/collections-search/object/NMAI_270379) |
| South America | Forest green / Andean gold          | [Amazon forest](https://whc.unesco.org/en/list/998/) and [Andean goldwork](https://www.metmuseum.org/exhibitions/listings/2018/golden-kingdoms)                                                            |
| Africa        | Earth ochre / adire indigo          | [Djenne earthen architecture](https://whc.unesco.org/en/urban-heritage-atlas/djenne/) and [Yoruba adire from western Nigeria](https://www.vam.ac.uk/articles/design-and-make-a-talking-textile)            |
| Europe        | Delft cobalt / porcelain gray       | [Delftware](https://museum.royaldelft.com/en/discover-the-collection/our-craftsmanship/), with the white translated to a legible warm gray                                                                 |
| Asia          | Celadon green / dancheong vermilion | [Korean celadon](https://www.museum.go.kr/ENG/contents/E0401000000.do?relicRecommendId=519694&schM=view) and [dancheong](https://www.korea.net/NewsFocus/Culture/view?articleId=191572)                    |
| Oceania       | Pacific blue / reef coral           | Sea and coral of the [Great Barrier Reef](https://whc.unesco.org/en/list/154/)                                                                                                                             |
| Antarctica    | Ice cyan / glacier blue             | [Blue and white glacial ice](https://www.antarctica.gov.au/about-antarctica/ice-and-atmosphere/sea-ice/pack-ice/icebergs/coloured-icebergs/)                                                               |

The existing teal/blue/violet lighting remains. The first halo rises with the
globe, softens during settlement, and joins the visitor/route lighting continuously.
Reveals use `(0.19, 1, 0.22, 1)`; camera travel uses
`(0.645, 0.045, 0.355, 1)`. The reconstructed curves are calibrated against
normalized reference frames and actual 1× playback, not presented as original
source values.

The entrance layers sample one clock. Dragging unlocks after all 6600 ms
complete. Offscreen or inactive-tab playback pauses and resumes from its current
point; theme changes retain the playhead. Returning home restarts the sequence.

From the connection reveal onward, the route carries a moving teal/blue/violet
gradient on a seamless 12-second cycle. Its color phase continues after the
6600 ms entrance while the globe, camera, halo, and text stay at rest. Viewport and tab visibility pause the flow.
Inactive tabs and offscreen scenes freeze it without catching up on return.
Reduced motion retains a static gradient. The brief loading status sentence is
omitted so it cannot flash before the scene becomes ready; failure feedback stays.

Reduced motion immediately uses the final camera, completed map and path,
final text, and static halo, with only a 150 ms opacity fade. Disabling reduced
motion retains that state until the next home mount.

Use the existing WebGL renderer, installed easing helper, and CSS gradients.
Coastlines and particles come from the same local land mask. No new dependency,
asset service, or location request is added. The home uses its existing IP location endpoint; local browser checks use explicit fixtures.

Verification focus: normalized scale and continent position; early and late
landings within the same frame; continuous camera handoff; a gradual contour
handoff during settlement without a final opacity step; the upper-left arrival at 1060, 1240, and 1480 ms; title
clearance and soft edges on narrow viewports; balanced color pairs and geographic
boundaries; color/size continuity around 2800 ms; light/dark; reduced motion; and
no renderer errors. The source recording is compressed and uses different map
detail and colors, so compare motion and composition rather than pixel identity.
