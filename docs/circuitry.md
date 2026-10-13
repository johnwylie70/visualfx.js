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

A recorded scene's sound is made on the recorder's own clock (2026-10-13). While frames are being recorded the sound library does not play through the sound card: synths.js's stepped player (`createPlayer({ stepped: { fps } })`, which pictures.js makes for `runScene(…, { stepped })` and Pyctures' keeper for a recorded Python scene) renders exactly `1 / fps` seconds of sound for each step, and those samples are the video's soundtrack. `record-clock-script.ts` moves it between the timers and the animation frames of each step, so the sound up to a frame exists before the frame is drawn.

So a recording reacts in step with nothing more to do here. The effects ask for `samples()` exactly once a frame, at the start of `frame(dt)`, after the scene has drawn, and everything they make of it is smoothed with that `dt` and nothing else: what `bass()` and `pulse()` hear in a frame is the sound up to that frame, and the same scene recorded twice gives the same pictures. (An app whose copy of synths.js is older than the stepped player records as before: the pictures exact, the sound not in the video, and the effects hearing the real-time sound.)

## Serving the library

- `scripts/sync-pictures.mjs`: pictures.js's new `visualfx/` folder comes with the rest of `public/pictures/`; `scene-names.ts` gains `SCENE_EFFECT_NAMES` from the `EFFECT_NAMES` marks, wherever the other two lists are used (detecting a scene, completion).
- `public/pictures/visualfx/pyvisualfx.py` from `../pyvisualfx/src/pyvisualfx/__init__.py`, as `pydials.py` is copied; `pyvisualfx` in `CIRCUITRY_PROVIDED_MODULES` and in `detect.ts` (a file that imports `pyvisualfx` is a scene).
- `canvas-runtime-py.ts`: `H_EFFECTS = 13`, and `S.dt` (see docs/pyctures.md). `sound-vendor.ts` gains Pyctures' `effectsKeeper` beside the two it has.

## The sandbox and the policy

Nothing in them stops the effects. The frame is `sandbox="allow-scripts"` with no origin; WebGL 2 needs neither an origin nor storage, shaders are text compiled by the browser (not script, so `script-src` hashes do not apply), and no worker, fetch or `eval` is used.

- **JavaScript scenes**: `/pictures/` is already a script source, so `/pictures/visualfx/visualfx.js` loads with no change.
- **Python scenes**: `pythonSoundPreviewPolicy` adds `<app>/pictures/sound/` and `<app>/pictures/dials/` to `script-src` for a file that imports those. A file that imports `pyvisualfx` needs `<app>/pictures/visualfx/` there in the same way, and nothing else.

The frame-rate fix for iOS (the editor's `tick` serving `requestAnimationFrame`) carries the effects with it under pictures.js, since they are run from the scene's own frame.

## The demos

`demos/` here has eight folders in the shape of `public/demos/*` (`main.js`, five with `main.py`, `README.md`, `thumbnail.jpg` at 800 × 500), and `demos/index.json` has an entry for each in the form of `public/demos/index.json`. They are written as they will be once pictures.js gives a scene the effects: no `use(…)`. They have not been copied anywhere.
