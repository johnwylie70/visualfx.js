# What pictures.js needs

So that a scene can write `glow(1)` with nothing to load, as it writes `playNote("C4")` and `dial(…)`. Five small changes to `pictures.js`, one to `scripts/sync-siblings.mjs`, one line in `package.json`. `scripts/serve.mjs` in this repository makes the five to pictures.js's text on the way out (and stops with a plain message if pictures.js has moved on), so the tests and every demo here already run on exactly this.

## pictures.js

**1. The names**, after the `DIAL_NAMES` marks (written by the sync script, as the other two lists are):

```js
/* EFFECT_NAMES:BEGIN */
const EFFECT_NAMES = ['kaleidoscope', 'mirror', 'pixelate', 'waves', 'ripple', 'wobble', 'swirl', 'fisheye', 'bulge', 'tunnel', 'tile', 'zoomBlur', 'spinBlur', 'rgbSplit', 'hue', 'saturate', 'brighten', 'contrast', 'invert', 'posterize', 'tint', 'duotone', 'colourCycle', 'colorCycle', 'scanlines', 'crt', 'glitch', 'grain', 'vignette', 'edges', 'dots', 'halftone', 'letters', 'plasma', 'starfield', 'metaballs', 'flow', 'blur', 'glow', 'bloom', 'trails', 'droste', 'rotozoom', 'hexagons', 'glassTiles', 'frosted', 'heatHaze', 'caustics', 'shake', 'punch', 'motionBlur', 'tiltShift', 'lightRays', 'streaks', 'softFocus', 'smear', 'stutter', 'gradientMap', 'thermal', 'nightVision', 'sepia', 'threshold', 'solarize', 'colourBleed', 'rainbowEdges', 'dither', 'interlace', 'led', 'emboss', 'sharpen', 'sketch', 'cartoon', 'stainedGlass', 'crosshatch', 'oil', 'dust', 'lightLeaks', 'rain', 'snow', 'bokeh', 'fog', 'lightning', 'warp', 'voronoi', 'moire', 'interference', 'aurora', 'fire', 'clouds', 'matrixRain', 'copperBars', 'checkerFloor', 'twister', 'spectrumBars', 'spectrumRing', 'waveformRing', 'beatFlash', 'bassShake', 'colorBleed', 'godRays', 'shader', 'look', 'clearEffects', 'listenTo', 'react', 'effectsQuality', 'bass', 'mids', 'highs', 'loudness', 'pulse', 'lookNames', 'effectNames', 'paletteNames', 'renderFrames', 'recordVideo', 'saveVideo']
/* EFFECT_NAMES:END */
```

None of them is a name pictures.js, synths.js or dials.js already gives a scene (there is no `pinch` here because pictures.js has one: a pinch is `fisheye` below zero) (the sound library's `beat` is why the beat here is `pulse`, and dials.js's `grid` is why the repeat here is `tile`). One-word names (`look`, `hue`, `dots`, `flow`, `tile`) count only where they are called, and never where the scene makes its own, by `usesAny`'s existing rules.

**2. Where it is**, in `SIBLINGS`:

```js
const SIBLINGS = { sound: 'sound/synths.js', dials: 'dials/dials.js', effects: 'vfx/vfx.js' }
```

(and `loadSibling`'s message has a third word: `which === 'sound' ? 'sound' : which === 'effects' ? 'effects' : 'on-screen controls'`.)

**3. Loaded only for a scene that uses one**, in `start()`:

```js
const wantsEffects = usesAny(code, EFFECT_NAMES)
const [{ THREE, addons }, soundLib, controlsLib, effectsLib] = await Promise.all([is3D ? loadThree() : {}, wantsSound && loadSibling('sound'), wantsControls && loadSibling('dials'), wantsEffects && loadSibling('effects')])
```

and in `sceneUses`: `effects: usesAny(code, EFFECT_NAMES)`, so `pictures build` copies the `vfx` folder for a scene that needs it.

**4. Given to the scene**, after the on-screen controls and before `let last = 0`:

```js
// --- EFFECTS (glow, trails, kaleidoscope…): run by the graphics card over what the scene drew, each frame after its draw.
let fx = null
if (effectsLib) {
  fx = effectsLib.effects(canvas, { fresh: true, manual: true, sound: sound ? () => sound.soundOutput() : null })
  cleanup.push(() => fx.close())
  for (const n of bothSpellings(EFFECT_NAMES)) if (!(n in more)) more[n] = fx[n] ?? fx[camel(n)]
}
```

`sound` is what the effects listen to when the scene has not said: all of the scene's sound. `manual` means pictures.js says when a frame has been drawn (5); without it the library frames itself, one browser frame behind nothing but a little less surely.

**5. The frame**, in `tick`, straight after the scene's draw:

```js
if (looping) {
  call(hooks.update, dt)
  call(hooks.draw)
}
if (fx) fx.frame(dt)
```

That `dt` is the effects' whole clock. It is the one the scene's `update` was given, so under Circuitry's recorder (which steps `requestAnimationFrame`) the effects are stepped with the scene.

## scripts/sync-siblings.mjs

- `COPIES` gains `['vfx.js', 'vfx', ['vfx.js', 'LICENSE']]`.
- The list is every name `vfx.js` exports but `effects` and `version` (this repository's `scripts/names.mjs` prints it), written between the `EFFECT_NAMES` marks by the loop that writes the other two, after `free()`.

## package.json

`"files"` gains `"vfx"`.

## One thing in dials.js

`onlyCanvas()` there counts every canvas that is not its own layer, so on a page of your own (not in pictures.js, which names the canvas) `dial(…)` after an effect is on finds two canvases and says so. Its filter should also leave out `c.dataset.effectsLayer !== undefined`. vfx.js's own `onlyCanvas()` already leaves dials.js's layer out.
