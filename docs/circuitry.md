# What Circuitry needs

Found by reading Circuitry's source on 13 October 2026; none of it has been changed. The effects themselves are in pictures.js and Pyctures on their `effects` branches (see docs/pictures.js.md and docs/pyctures.md), for a release after 2.1.0.

**The whole list, in the order to do it** (each is explained below):

1. Run `scripts/sync-pictures.mjs` once pictures.js with effects is its main: `public/pictures/visualfx/` arrives with the rest, and the script must also write `SCENE_EFFECT_NAMES` into `scene-names.ts` and copy `pyvisualfx.py`.
2. `scene.ts`: score the effects' names (Telling that a file is a scene).
3. Python: `pyvisualfx` in `detect.ts` and `CIRCUITRY_PROVIDED_MODULES`; `H_EFFECTS = 13` and `S.dt` in `canvas-runtime-py.ts`; the page's few lines for handle 13; `<app>/pictures/visualfx/` in the Python preview's `script-src` for a file that imports it.
4. The Python recorder: draw the effects' canvas into the frame, a microtask after the frame's commands are applied (How its recorder works).
5. The help pages (Words for the help pages), and the demos when the owner wants them.

Nothing is needed for a JavaScript scene beyond step 1 and 2: it loads, runs and records as it is.

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
- `canvas-runtime-py.ts`: `H_EFFECTS = 13`, and `S.dt` (see docs/pyctures.md). The page's part is in the next section.

## The app's own Python runtime and page, piece by piece

The app runs Python scenes with its own port of Pyctures' two halves, so each thing Pyctures gained on its `effects` branch has a place in the app. In Pyctures they are in `src/pyctures/__init__.py` and `src/pyctures/web/pyctures.js`; take the text from there.

**`scripts/sync-pictures.mjs`** (the copies and what is written from them):
- `{ repo: 'pyvisualfx', file: 'src/pyvisualfx/__init__.py', to: 'public/pictures/visualfx/pyvisualfx.py' }`, beside the `pydials` line. `public/pictures/visualfx/visualfx.js` and its `LICENSE` come with pictures.js's folder.
- A `pyvisualfx: { url: '/pictures/visualfx/pyvisualfx.py', tag }` entry where `pydials` has one, and the page's half at `/pictures/visualfx/visualfx.js`.
- `SCENE_EFFECT_NAMES` into `scene-names.ts`, from pictures.js's `/* EFFECT_NAMES:BEGIN */ … /* EFFECT_NAMES:END */` marks, as the other lists are read.
- Nothing to take into `sound-vendor.ts`: Pyctures has no keeper for the effects (see docs/pyctures.md). The page's part is the few lines below.

**`canvas-runtime-py.ts`** (the Python half):
- `H_EFFECTS = 13   # the page's effects: the library pyvisualfx turns each on with one command (12 is the page's scenes)`. The sound button is 14.
- `_State.__init__`: `self.dt = None`.
- Where a frame's functions are called: `S.dt = dt` before them (the same `dt` `update(dt)` is given).
- In `_reply`, straight after the `for end in S.ending: end()` loop: `S.dt = None`.
That is all pyvisualfx reads: `p.H_EFFECTS`, `p.JsRef`, `p.js` (to tell one run from the next), `p.S.ending` (it appends one function, which sends `frame(dt)` as the frame's last command) and `p.S.dt`. Without `S.dt` it wraps `_call_frame_functions`, which the port may not have: give it `S.dt`.

**`canvas-renderer-script.ts` / `python-sound.ts`** (the page):
- For a file that imports `pyvisualfx`, load `/pictures/visualfx/visualfx.js` as a module before the program starts (as scenes' module is), and make the effects for the canvas with it: `module.effects(canvas, { fresh: true, manual: true, sound: () => the sound kit's output(), under: () => (stage && stage.running ? stage.running.layer : null) })`. `sound` is what the effects listen to until the scene says; `under` is what lets a change of scene be seen through the effects.
- `H.set(13, …)` with Pyctures' wrapper, exactly: every call goes to the effects, except `frame`, which is `(dt) => queueMicrotask(() => fx.frame(dt))`. The effects must run after the scene's keeper has painted a transition (`stage.caught()`), which happens once the batch is applied.
- As the app has it (told by its writer, 2026-10-13), in two ways that differ from Pyctures:
  - `sound` is given to the effects only in a file that also imports `synths`. In a file with effects alone it is null: asking the sound kit for its output would load synths.js, which that file's policy does not name, and a refused request stops the program. So in the app the effects hear music only when the file imports `synths` too.
  - There is no `fx.close()`: every run is a new page, and a stopped program's picture and dials stay where they are, so its effects do too.
- The recorder: see above. The effects' canvas is `canvas[data-effects-layer]`, the next element after the scene's canvas (or after a transition's layer).

**`detect.ts`** and **`CIRCUITRY_PROVIDED_MODULES`**: `pyvisualfx`, beside `synths` and `pydials`.

**`preview-isolation-script.ts`**: for a Python file that imports `pyvisualfx`, `<app>/pictures/visualfx/` in `script-src` only, as `pythonSoundPreviewPolicy` adds the other two.

## Web export

**A JavaScript scene** (`src/lib/pictures/web-export/build-web-page.ts`): `sceneUses(source).effects` says whether to pack; the packed text is `visualfx/visualfx.js`, added to the `pictures-siblings` JSON as `effects`, and mapped as the others are: `imports[new URL('visualfx/visualfx.js', document.baseURI).href] = made(packed.effects)`. The file has no `import.meta.url` and loads nothing else (no wasm, no worker), so it packs as plain text; a check like the dials' one can look for `effectsLayer` in it.

**A Python scene**: as synths and pydials are (refused today, per sound-in-preview.md); when that is done, Pyctures' `pages.single_page` packs it as `visualfx: { js, py }`.

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

And for Record Video: *Effects are in the recording, and are the same every time: they take their time from the scene's clock.* (For a Python scene this is true once the recorder's change above is made.) Whether the music's numbers (`bass()`, `pulse()`) are in step with a recording's sound depends on the recorder stepping the sound: see Sound and picture in step.
