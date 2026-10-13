# What Circuitry needs

Found by reading Circuitry's source on 13 October 2026; none of it has been changed.

## How its recorder works, and what that means here

The video button under a preview (`usePycturesRecording`, `useHtmlPreviewRecord`, `src/lib/preview/record-clock-script.ts`, `record-page-frame.ts`, `record-isolated.ts`) **steps the scene**: the page is reloaded with a clock put in ahead of its scripts that replaces `performance.now`, `Date`, `requestAnimationFrame` and the timers, and each video frame is one `step(1000 / fps)`, copied and encoded before the next is made. 30 or 60 frames a second; 720p, 1080p, 4K, Shorts, square. Nothing is dropped however slow the scene is.

**A JavaScript scene (pictures.js)**: the frame is the page's background colour with EVERY VISIBLE CANVAS copied over it where it sits, in the order they are in the page (`visibleCanvases`, `drawCanvases`), in the same task as the step. The effects' canvas is laid over the scene's, straight after it and under dials.js's, so it is in the picture already: **no change is needed to record effects.** The effects take their time from the `dt` pictures.js gives them, which comes from the stepped `requestAnimationFrame`, and they draw inside that callback, so their picture is there when the copy is made (no `preserveDrawingBuffer` wanted). Trails advance once a recorded frame. The library's choice of how many pixels to work on never changes under the stepped clock (it is only ever lowered when real frames are late), so a recording keeps every pixel.

**A Python scene**: `canvas-renderer-script.ts` builds the frame from two canvases it names itself:

```js
if (canvas.width && canvas.height) c.drawImage(canvas, 0, 0, rec.w, rec.h);
if (on && animCanvas) c.drawImage(animCanvas, 0, 0, rec.w, rec.h);
```

(about line 1303, and the same pair about lines 308 and 335 for a still picture). **This one needs the change**: after the scene's canvas, the effects' canvas when it is showing.

```js
var fxLayer = canvas.parentNode && canvas.parentNode.querySelector('canvas[data-effects-layer]');
if (fxLayer && fxLayer.width && fxLayer.style.display !== 'none') c.drawImage(fxLayer, 0, 0, rec.w, rec.h);
```

It must be in the same task as the frame's commands were applied (the effects' canvas keeps its picture only until the browser next paints). If the copy is made later than that, ask the library instead: `effects(canvas).onFrame(fn)` calls `fn` at the moment each frame's picture is there, and `pixels()` reads it.

## Sound and picture in step

Recorded JavaScript scenes have no sound today (the clock does not drive Web Audio), and a recorded Python scene's sound is mixed afterwards (`mixSound(duration)`). In both, while frames are being recorded the sound library is running on the real clock or not at all, so what `bass()` and `pulse()` hear during a recording is not what will be under that frame in the film. The picture is still exact and repeatable for everything that does not listen.

To make a recording react in step, the sound must be stepped with the picture, and it is the sound library that can do it, not this one. The effects ask for `samples()` exactly once a frame, at the start of `frame(dt)`, and everything they make of it is smoothed with that `dt` and nothing else. So if, on each `step`, the recorder has the sound engine render exactly `1 / fps` seconds of sound (the engine is a WebAssembly module that renders blocks on demand) and that is what `samples()` gives, the reaction is frame-exact, and the same rendered sound, kept, is the film's soundtrack. That is a mode for synths.js's player (`render(seconds)` in place of the audio thread) and a call from `record-clock-script.ts`'s step. Until it exists, a music video is best made of a scene that follows the sound library's own clock (`beat()`, `soundTime()`) rather than listening.

## Serving the library

- `scripts/sync-pictures.mjs`: pictures.js's new `vfx/` folder comes with the rest of `public/pictures/`; `scene-names.ts` gains `SCENE_EFFECT_NAMES` from the `EFFECT_NAMES` marks, wherever the other two lists are used (detecting a scene, completion).
- `public/pictures/vfx/vfx.py` from `../vfx-py/src/vfx/__init__.py`, as `pydials.py` is copied; `vfx` in `CIRCUITRY_PROVIDED_MODULES` and in `detect.ts` (a file that imports `vfx` is a scene).
- `canvas-runtime-py.ts`: `H_EFFECTS = 13`, and `S.dt` (see docs/pyctures.md). `sound-vendor.ts` gains Pyctures' `effectsKeeper` beside the two it has.

## The sandbox and the policy

Nothing in them stops the effects. The frame is `sandbox="allow-scripts"` with no origin; WebGL 2 needs neither an origin nor storage, shaders are text compiled by the browser (not script, so `script-src` hashes do not apply), and no worker, fetch or `eval` is used.

- **JavaScript scenes**: `/pictures/` is already a script source, so `/pictures/vfx/vfx.js` loads with no change.
- **Python scenes**: `pythonSoundPreviewPolicy` adds `<app>/pictures/sound/` and `<app>/pictures/dials/` to `script-src` for a file that imports those. A file that imports `vfx` needs `<app>/pictures/vfx/` there in the same way, and nothing else.

The frame-rate fix for iOS (the editor's `tick` serving `requestAnimationFrame`) carries the effects with it under pictures.js, since they are run from the scene's own frame.

## The demos

`demos/` here has eight folders in the shape of `public/demos/*` (`main.js`, five with `main.py`, `README.md`, `thumbnail.jpg` at 800 × 500), and `demos/index.json` has an entry for each in the form of `public/demos/index.json`. They are written as they will be once pictures.js gives a scene the effects: no `use(…)`. They have not been copied anywhere.
