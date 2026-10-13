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

The effects are run at the END of the turn in which a frame's commands are applied (a microtask: a change of scene paints its layer once the commands are applied, and the effects must be given that), so a copy made straight after applying the commands, in the same breath, is a frame early. Take the picture after a microtask (`await null`, or `queueMicrotask`), and before the browser next paints, when the effects' canvas no longer keeps it. If the copy is made later than that, ask the library instead: `effects(canvas).onFrame(fn)` calls `fn` at the moment each frame's picture is there, and `pixels()` reads it.

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

## Telling that a file is a scene (`src/lib/pictures/scene.ts`)

`scene-names.ts` should gain `SCENE_EFFECT_NAMES`, written by `scripts/sync-pictures.mjs` from pictures.js's `EFFECT_NAMES` marks, and `scene.ts` should score them as it scores the controls:

- **Names of two words settle it alone**, in both spellings, as the sound's do (`zoomBlur`/`zoom_blur`, `rgbSplit`, `colourCycle`, `clearEffects`, `listenTo`, `effectsQuality`, `heatHaze`, `glassTiles`, `motionBlur`, `tiltShift`, `lightRays`, `softFocus`, `gradientMap`, `nightVision`, `colourBleed`, `rainbowEdges`, `stainedGlass`, `lightLeaks`, `matrixRain`, `copperBars`, `checkerFloor`, `spectrumBars`, `spectrumRing`, `waveformRing`, `beatFlash`, `bassShake`): the existing `twoWords` filter does this once the list is added to `SCENE_NAMES`.
- **Distinctive single words are anchors** (count 2, and let ordinary ones beside them count): `kaleidoscope`, `pixelate`, `vignette`, `posterize`, `duotone`, `scanlines`, `crt`, `metaballs`, `starfield`, `plasma`, `halftone`, `crosshatch`, `droste`, `rotozoom`, `solarize`, `sepia`, `moire`, `voronoi`, `caustics`, `interlace`, `bokeh`, `twister`, `dither`, `bloom`.
- **Ordinary words count only beside an anchor or a drawing name**: `mirror`, `waves`, `ripple`, `wobble`, `swirl`, `fisheye`, `bulge`, `tunnel`, `tile`, `hue`, `saturate`, `brighten`, `contrast`, `invert`, `tint`, `glitch`, `grain`, `edges`, `dots`, `letters`, `flow`, `blur`, `glow`, `trails`, `shader`, `look`, `react`, `bass`, `mids`, `highs`, `loudness`, `pulse`, `hexagons`, `frosted`, `shake`, `punch`, `streaks`, `smear`, `stutter`, `thermal`, `threshold`, `led`, `emboss`, `sharpen`, `sketch`, `cartoon`, `oil`, `dust`, `rain`, `snow`, `fog`, `lightning`, `warp`, `interference`, `aurora`, `fire`, `clouds`.

A scene with effects nearly always has `draw`, `background` or a shape as well, which already say what it is; the list matters for a file that is only a backdrop (`plasma()` and nothing else: an anchor) or only `fire()` (an ordinary word: it needs `function draw` beside it).

For Python, `detect.ts` needs `pyvisualfx` beside `synths` and `pydials` (a file that imports it is a scene), and `CIRCUITRY_PROVIDED_MODULES` needs it so nothing tries to install it.

## Words for the help pages

Two pages, one under pictures.js and one under Pyctures, each with the same shape as the libraries' own `docs/effects.md` (which can be taken as they are: every program on them is run by the libraries' tests), and the reference generated from `effects.definitions()` or `docs/effects.json` here, with the pictures in `docs/images/effects/`.

Title: **Effects**. Summary line: *Glow, trails, a kaleidoscope, old screens, rain and ninety more, done by the graphics card to whatever your scene draws. One line turns one on.*

Sections, in order: Turn one on · Change its settings · Several at once (order, trails, looks) · A picture with no drawing at all (backdrops, `background()`) · Music (`bass()`, `pulse()`, `react`) · With dials · With scenes (a change of scene is seen through the effects) · A shader of your own · How fast they are, and video · Every effect (the reference).

Three things worth a callout box on the page, because they are what a beginner trips on:
1. *A kaleidoscope shows one slice of your picture. If the screen goes dark, nothing was drawn in that slice.*
2. *A backdrop is behind your drawing: use `background()` with no colour, or you will paint over it.*
3. *Trails want a dark background.*

And for Record Video: *Effects are in the recording, and are the same every time: they take their time from the scene's clock.* (For a Python scene this is true once the change at the top of this page is made.) The music's numbers (`bass()`, `pulse()`) are not yet in step with a recording's sound.
