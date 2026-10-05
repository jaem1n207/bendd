'use client';

import { animate, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

import {
  clamp,
  distanceInMeters,
  formatDistance,
  SEOUL,
  type Camera,
  type Point,
} from '@/components/connection-globe/lib/geometry';
import {
  createSettleJourney,
  SETTLE_TIMING,
} from '@/components/connection-globe/lib/choreography';
import type {
  Color,
  GlobePalette,
  ParticleGlobe,
} from '@/components/connection-globe/lib/renderer';
import {
  GlobeReadiness,
  GLOBE_ENTRANCE_MS,
  GLOBE_START_GAP_MS,
  REDUCED_FADE_MS,
  VISIBLE_FRACTION,
  COLOR_CYCLE_MS,
  GLOBE_EASING,
} from '@/components/connection-globe/consts/playback';
import type { VisitorLocation } from '@/lib/visitor-location';

function webglColor(value: string): Color {
  const [hue = 0, saturation = 0, lightness = 100] =
    value.match(/[\d.]+/g)?.map(Number) ?? [];
  const light = lightness / 100;
  const amplitude = (saturation / 100) * Math.min(light, 1 - light);
  const channel = (offset: number) => {
    const phase = (offset + hue / 30) % 12;
    return light - amplitude * Math.max(-1, Math.min(phase - 3, 9 - phase, 1));
  };
  return [channel(0), channel(8), channel(4)];
}
function readPalette(stage: HTMLElement): GlobePalette {
  const style = getComputedStyle(stage);
  const color = (name: string) =>
    webglColor(style.getPropertyValue(`--globe-${name}`));
  return {
    base: color('base'),
    rim: color('rim'),
    land: Array.from({ length: 7 }, (_, i) => color(`land-${i}-a`)),
    landAccent: Array.from({ length: 7 }, (_, i) => color(`land-${i}-b`)),
    route: Array.from({ length: 3 }, (_, i) => color(`route-${i}`)),
  };
}
function position(element: HTMLElement, point: Point) {
  element.style.transform = `translate3d(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px, 0)`;
}

export function useGlobeScene(
  stageRef: RefObject<HTMLDivElement | null>,
  location: VisitorLocation | null,
  readiness: GlobeReadiness
) {
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presented, setPresented] = useState(false);
  const [fallback, setFallback] = useState(false);
  useLayoutEffect(() => {
    const figure = stageRef.current?.closest('figure');
    if (!figure || figure.dataset.globeEntrance) {
      return;
    }
    // Match HomeMotion's first-paint safety net: never re-hide a late, readable page.
    const alreadyVisible = getComputedStyle(figure).opacity === '1';
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    figure.dataset.globeEntrance =
      alreadyVisible && !reduced ? 'fallback' : 'waiting';
  }, [stageRef]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || readiness !== GlobeReadiness.Ready) {
      return;
    }
    const figure = stage.closest('figure');
    const heading = stage
      .closest('[data-connection-globe]')
      ?.querySelector<HTMLElement>('[data-globe-heading]');
    const aura = stage.querySelector<HTMLElement>('[data-globe-aura]');
    const caption = figure?.querySelector<HTMLElement>('[data-globe-caption]');
    const host = stage.querySelector<HTMLDivElement>('[data-canvas-host]');
    const overlay = stage.querySelector<SVGSVGElement>('[data-route-overlay]');
    const path = stage.querySelector<SVGPathElement>('[data-route-path]');
    const anchor = stage.querySelector<HTMLDivElement>('[data-nearby-anchor]');
    const visitorMarker = stage.querySelector<HTMLDivElement>(
      '[data-visitor-marker]'
    );
    const seoulMarker = stage.querySelector<HTMLDivElement>(
      '[data-seoul-marker]'
    );
    const counter = stage.querySelector<HTMLDivElement>(
      '[data-distance-label]'
    );
    const counterValue = stage.querySelector<HTMLSpanElement>(
      '[data-distance-value]'
    );
    const nearbyCounterValue = stage.querySelector<HTMLSpanElement>(
      '[data-nearby-distance-value]'
    );
    const fallbackGlobe = stage.querySelector<HTMLDivElement>(
      '[data-fallback-globe]'
    );
    if (
      !host ||
      !overlay ||
      !path ||
      !anchor ||
      !visitorMarker ||
      !seoulMarker ||
      !counter ||
      !counterValue
    ) {
      return;
    }
    setReady(false);
    setComplete(false);
    setConnected(false);
    setPresented(false);
    setFallback(false);
    anchor.dataset.introduced = 'false';
    anchor.dataset.ringsAnimate = 'false';
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const abort = new AbortController();
    let disposed = false,
      inView = false,
      initialized = false;
    let finished = preference.matches || !location;
    let sharedIntroduced = false;
    let entered = false;
    let entranceReduced = false;
    let entranceAnimation: Animation | undefined;
    let connected = finished;
    let elapsed = finished ? SETTLE_TIMING.duration : SETTLE_TIMING.appearance;
    let colorTime = 0;
    let width = stage.clientWidth,
      height = stage.clientHeight;
    let journey = createSettleJourney(location, width, height);
    let palette = readPalette(stage);
    let lastScene: ReturnType<typeof journey.sample> | undefined;
    let globe: ParticleGlobe | undefined;
    let animation: AnimationPlaybackControls | undefined;
    let colors: AnimationPlaybackControls | undefined;
    let inertia: AnimationPlaybackControls | undefined;
    let manualCamera: Camera | undefined;
    let drag:
      | {
          id: number;
          x: number;
          y: number;
          time: number;
          vx: number;
          vy: number;
        }
      | undefined;
    const meters = location ? distanceInMeters(location, SEOUL) : 0;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    host.replaceChildren(canvas);

    const render = () => {
      if (!lastScene || disposed) {
        return;
      }
      globe?.render(
        lastScene,
        palette,
        colorTime,
        width,
        height,
        lastScene.motion
      );
      stage.dataset.colorTime = colorTime.toFixed(0);
    };
    const draw = (time: number) => {
      elapsed = time;
      if (!width || !height || disposed) {
        return;
      }
      const scene = journey.sample(time, manualCamera);
      lastScene = scene;
      render();
      if (aura) {
        aura.style.opacity = String(scene.motion.glowOpacity);
        aura.style.transform = `translate(-50%, -50%) scale(${scene.motion.glowScale * scene.camera.scale})`;
      }
      // The distance is already readable beside the route. Reveal the stable
      // summary at arrival, without flashing the server-rendered greeting.
      if (caption) {
        caption.style.opacity = String(
          !location
            ? 1
            : clamp((time - SETTLE_TIMING.arrival) / REDUCED_FADE_MS)
        );
      }
      if (!connected && time >= SETTLE_TIMING.arrival) {
        connected = true;
        setConnected(true);
      }
      if (
        time >= SETTLE_TIMING.connectionStart &&
        !preference.matches &&
        inView &&
        document.visibilityState !== 'hidden' &&
        colors?.state === 'paused'
      ) {
        colors.play();
      }
      stage.dataset.phase = scene.phase;
      stage.dataset.elapsed = time.toFixed(0);
      stage.dataset.progress = scene.routeProgress.toFixed(4);
      stage.dataset.formation = scene.formationProgress.toFixed(4);
      stage.dataset.camera = `${scene.camera.phi.toFixed(5)},${scene.camera.theta.toFixed(5)}`;
      stage.dataset.nearby = String(scene.nearby);
      position(anchor, scene.destination);
      const arrival = clamp((time - SETTLE_TIMING.connectionStart) / 160);
      const sharedArrival =
        scene.nearby && time >= SETTLE_TIMING.connectionStart;
      const sharedVisible = sharedArrival && scene.destination.visible;
      anchor.style.opacity = sharedVisible ? String(arrival) : '0';
      anchor.style.visibility = sharedVisible ? 'visible' : 'hidden';
      if (sharedArrival && !sharedIntroduced) {
        sharedIntroduced = true;
        anchor.dataset.introduced = String(!preference.matches);
        anchor.dataset.ringsAnimate = String(!preference.matches);
      }
      if (fallbackGlobe) {
        fallbackGlobe.style.transform = `translate(-50%, -50%) scale(${(0.8 * scene.camera.scale * height) / 250})`;
      }
      overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
      path.setAttribute('d', scene.route);
      path.style.opacity =
        location && time > SETTLE_TIMING.connectionStart ? '1' : '0';
      position(visitorMarker, scene.visitorMarker);
      position(seoulMarker, location ? scene.seoulMarker : scene.destination);
      visitorMarker.style.opacity =
        location && scene.visitorMarker.visible && !sharedArrival
          ? String(scene.motion.visitor)
          : '0';
      seoulMarker.style.opacity =
        !scene.nearby && scene.seoulMarker.visible
          ? String(!location ? 1 : scene.motion.destination)
          : '0';
      position(counter, {
        x: scene.label.x,
        y:
          scene.label.y +
          8 * (1 - clamp((time - SETTLE_TIMING.connectionStart) / 1600)),
      });
      counter.style.opacity =
        location && !scene.nearby && scene.head.visible ? String(arrival) : '0';
      const distance = formatDistance(meters, scene.routeProgress);
      if (counterValue.textContent !== distance) {
        counterValue.textContent = distance;
      }
      if (nearbyCounterValue && nearbyCounterValue.textContent !== distance) {
        nearbyCounterValue.textContent = distance;
      }
    };
    const stopInertia = () => {
      inertia?.stop();
      inertia = undefined;
    };
    const clearDrag = () => {
      const pointerId = drag?.id;
      drag = undefined;
      stage.dataset.grabbing = 'false';
      if (pointerId !== undefined && stage.hasPointerCapture(pointerId)) {
        stage.releasePointerCapture(pointerId);
      }
    };
    const finishEntrance = () => {
      setPresented(true);
      if (figure) {
        figure.dataset.globeEntrance = 'visible';
      }
      if (!entranceAnimation) {
        return;
      }
      entranceAnimation.onfinish = null;
      entranceAnimation.cancel();
      entranceAnimation = undefined;
    };
    const enter = () => {
      if (entered) {
        return;
      }
      entered = true;
      entranceReduced = preference.matches;
      if (!figure) {
        finishEntrance();
        return;
      }
      if (
        figure.dataset.globeEntrance === 'fallback' ||
        typeof figure.animate !== 'function'
      ) {
        finishEntrance();
        return;
      }
      figure.dataset.globeEntrance = 'entering';
      entranceAnimation = figure.animate(
        [
          {
            opacity: 0,
            transform: 'none',
          },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: preference.matches ? REDUCED_FADE_MS : GLOBE_ENTRANCE_MS,
          delay: preference.matches ? 0 : GLOBE_START_GAP_MS,
          easing: GLOBE_EASING,
          fill: 'both',
        }
      );
      entranceAnimation.onfinish = () => {
        finishEntrance();
        updatePlayback();
      };
    };
    const updatePlayback = () => {
      if (!initialized) {
        return;
      }
      // A fast jump may skip the heading entirely; do not wait for an unseen reveal.
      const headingComplete =
        !heading ||
        heading.dataset.revealState === 'visible' ||
        heading.getBoundingClientRect().bottom <= 0;
      const canPlay =
        inView &&
        document.visibilityState !== 'hidden' &&
        (entered || headingComplete);
      stage.dataset.paused = String(!canPlay);
      if (preference.matches) {
        if (entered && !entranceReduced) {
          finishEntrance();
        }
        anchor.dataset.introduced = 'false';
        anchor.dataset.ringsAnimate = 'false';
        finished = true;
        animation?.pause();
        colors?.pause();
        stopInertia();
        draw(SETTLE_TIMING.duration);
        setComplete(true);
        if (canPlay) {
          enter();
        }
      } else if (canPlay) {
        enter();
        if (!finished) {
          animation?.play();
        }
        if (globe && location && elapsed >= SETTLE_TIMING.connectionStart) {
          colors?.play();
        }
        if (inertia?.state === 'paused') {
          inertia.play();
        }
      } else {
        animation?.pause();
        colors?.pause();
        inertia?.pause();
        clearDrag();
      }
    };
    const headingObserver = new MutationObserver(updatePlayback);
    if (heading) {
      headingObserver.observe(heading, {
        attributes: true,
        attributeFilter: ['data-reveal-state'],
      });
    }
    const visibility =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            entries => {
              inView = entries.some(
                entry =>
                  entry.isIntersecting &&
                  entry.intersectionRatio >= VISIBLE_FRACTION
              );
              updatePlayback();
            },
            { threshold: [0, VISIBLE_FRACTION] }
          );
    if (visibility) {
      visibility.observe(stage);
    } else {
      inView = true;
    }
    const resize = () => {
      width = stage.clientWidth;
      height = stage.clientHeight;
      journey = createSettleJourney(location, width, height);
      if (manualCamera) {
        manualCamera.scale = journey.finalCamera.scale;
      }
      draw(elapsed);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const themeObserver = new MutationObserver(() => {
      palette = readPalette(stage);
      draw(elapsed);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    const contextLost = (event: Event) => {
      event.preventDefault();
      globe?.destroy();
      globe = undefined;
      colors?.pause();
      stopInertia();
      clearDrag();
      setFallback(true);
    };
    const pointerDown = (event: PointerEvent) => {
      if (!finished || !globe || event.button !== 0 || !event.isPrimary) {
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest('[data-nearby-button]')
      ) {
        return;
      }
      stopInertia();
      manualCamera ??= { ...journey.finalCamera };
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        vx: 0,
        vy: 0,
      };
      stage.setPointerCapture(event.pointerId);
      stage.dataset.grabbing = 'true';
    };
    const pointerMove = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId || !manualCamera) {
        return;
      }
      const dx = (event.clientX - drag.x) * 0.007;
      const dy =
        event.pointerType === 'touch' ? 0 : (event.clientY - drag.y) * 0.006;
      const dt = Math.max(8, event.timeStamp - drag.time);
      manualCamera.phi += dx;
      manualCamera.theta = clamp(
        manualCamera.theta + dy,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
      );
      drag = {
        id: drag.id,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        vx: dx / dt,
        vy: dy / dt,
      };
      draw(elapsed);
    };
    const release = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id || !manualCamera) {
        return;
      }
      const velocity = drag;
      clearDrag();
      if (
        event.type !== 'pointerup' ||
        preference.matches ||
        event.timeStamp - velocity.time > 80 ||
        !inView ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      const start = { ...manualCamera };
      const dx = clamp(velocity.vx * 65, -0.35, 0.35),
        dy = clamp(velocity.vy * 65, -0.2, 0.2);
      inertia = animate(0, 1, {
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: progress => {
          if (disposed || drag || preference.matches) {
            return;
          }
          manualCamera = {
            ...start,
            phi: start.phi + dx * progress,
            theta: clamp(
              start.theta + dy * progress,
              -Math.PI / 2 + 0.05,
              Math.PI / 2 - 0.05
            ),
          };
          draw(elapsed);
        },
      });
    };
    const keyDown = (event: KeyboardEvent) => {
      if (
        event.target !== stage ||
        !finished ||
        !globe ||
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(
          event.key
        )
      ) {
        return;
      }
      event.preventDefault();
      stopInertia();
      manualCamera ??= { ...journey.finalCamera };
      if (event.key === 'Home') {
        manualCamera = undefined;
      } else {
        manualCamera.phi +=
          event.key === 'ArrowLeft'
            ? -0.12
            : event.key === 'ArrowRight'
              ? 0.12
              : 0;
        manualCamera.theta = clamp(
          manualCamera.theta +
            (event.key === 'ArrowUp'
              ? -0.1
              : event.key === 'ArrowDown'
                ? 0.1
                : 0),
          -Math.PI / 2 + 0.05,
          Math.PI / 2 - 0.05
        );
      }
      draw(elapsed);
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', updatePlayback);
    preference.addEventListener('change', updatePlayback);
    stage.addEventListener('pointerdown', pointerDown);
    stage.addEventListener('pointermove', pointerMove);
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('lostpointercapture', release);
    stage.addEventListener('keydown', keyDown);
    const initialize = async () => {
      try {
        const { createParticleGlobe } = await import(
          '@/components/connection-globe/lib/renderer'
        );
        if (disposed) {
          return;
        }
        globe = await createParticleGlobe(canvas, width, abort.signal);
      } catch {
        if (disposed) {
          return;
        }
        setFallback(true);
      }
      if (disposed) {
        globe?.destroy();
        return;
      }
      initialized = true;
      colors =
        journey.routes.length > 0
          ? animate(0, COLOR_CYCLE_MS, {
              duration: COLOR_CYCLE_MS / 1000,
              repeat: Infinity,
              ease: 'linear',
              autoplay: false,
              onUpdate: time => {
                if (
                  disposed ||
                  preference.matches ||
                  !inView ||
                  document.visibilityState === 'hidden'
                ) {
                  return;
                }
                colorTime = time;
                if (finished) {
                  render();
                }
              },
            })
          : undefined;
      animation =
        location && !finished
          ? animate(SETTLE_TIMING.appearance, SETTLE_TIMING.duration, {
              duration:
                (SETTLE_TIMING.duration - SETTLE_TIMING.appearance) / 1000,
              delay: GLOBE_START_GAP_MS / 1000,
              ease: 'linear',
              autoplay: false,
              onUpdate: time => {
                if (!finished && !disposed) {
                  draw(time);
                }
              },
              onComplete: () => {
                if (disposed) {
                  return;
                }
                finished = true;
                draw(SETTLE_TIMING.duration);
                setComplete(true);
              },
            })
          : undefined;
      draw(elapsed);
      setReady(true);
      setComplete(finished);
      setConnected(connected);
      updatePlayback();
    };
    void initialize();
    return () => {
      disposed = true;
      abort.abort();
      animation?.stop();
      colors?.stop();
      if (entranceAnimation) {
        entranceAnimation.onfinish = null;
        entranceAnimation.cancel();
      }
      headingObserver.disconnect();
      stopInertia();
      visibility?.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      preference.removeEventListener('change', updatePlayback);
      document.removeEventListener('visibilitychange', updatePlayback);
      canvas.removeEventListener('webglcontextlost', contextLost);
      stage.removeEventListener('pointerdown', pointerDown);
      stage.removeEventListener('pointermove', pointerMove);
      stage.removeEventListener('pointerup', release);
      stage.removeEventListener('pointercancel', release);
      stage.removeEventListener('lostpointercapture', release);
      stage.removeEventListener('keydown', keyDown);
      globe?.destroy();
      host.replaceChildren();
    };
  }, [stageRef, location, readiness]);
  return { ready, complete, connected, presented, fallback };
}
