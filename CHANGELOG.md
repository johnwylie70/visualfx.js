# Changes

## 0.0.0 (not released)

The first version: effects for a scene, done by the graphics card (WebGL 2).

- **A film with its sound**: `recordVideo({ seconds, fps, sound })` puts a scene's sound in the WebM file (Opus), beginning on the first frame's first sample and ending with the last frame, every sound on the frame it was made in. `sound` is a stepped sound (synths.js's `createPlayer({ stepped })`, or a pictures.js scene run with `{ stepped: { fps } }`): `renderFrames` tells it where the clock is before each frame is drawn, so it makes exactly a frame's worth of samples (the remainder carried: n frames are `round(n × 48000 / fps)`), and what `bass()` and `pulse()` hear is the frame they are drawn on. `renderFrames({ sound, onSound })` hands over each frame's samples. A browser with no Opus encoder gives the sound beside the film as a WAV file of the same length (`film.sound`, `film.audio === "wav"`), and `saveVideo` saves both. A film with no `sound` is what it was.
- Thirty-seven effects, each one line to turn on: shapes of the picture (kaleidoscope, mirror, tile, pixelate, waves, ripple, wobble, swirl, fisheye, tunnel), blurs (blur, zoomBlur, spinBlur), glow, trails, colours (rgbSplit, hue, saturate, brighten, contrast, invert, posterize, tint, duotone, colourCycle), screens and print (scanlines, crt, glitch, grain, vignette, edges, dots, letters) and four backdrops that need no drawing (plasma, starfield, metaballs, flow).
- Fifty-seven more: droste, rotozoom, hexagons, glassTiles, frosted, heatHaze, caustics, shake, punch, motionBlur, tiltShift, lightRays, streaks, softFocus, smear, stutter, gradientMap, thermal, nightVision, sepia, threshold, solarize, colourBleed, rainbowEdges, dither, interlace, led, emboss, sharpen, sketch, cartoon, stainedGlass, crosshatch, oil, dust, lightLeaks, rain, snow, bokeh, fog, lightning, and the backdrops warp, voronoi, moire, interference, aurora, fire, clouds, matrixRain, copperBars, checkerFloor, twister, spectrumBars, spectrumRing and waveformRing, with beatFlash and bassShake; seven more looks.
- Settings are plain properties, in the scene's points and in degrees; a setting given a function is asked every frame; `amount`, `off()`, `on()`, `remove()`, `clearEffects()`.
- Nine looks: dream, arcade, vhs, neon, comic, underwater, oldfilm, disco, terminal.
- Music: `listenTo`, `bass`, `mids`, `highs`, `loudness`, `pulse`, `react`, and the spectrum and the wave for a shader.
- `shader()`: an effect of your own, with mistakes said by line.
- An effect is a target for dials.js (`set`, `get`, `describe`).
- The same pixels every time: effects take their time from the scene's clock. `renderFrames` and `recordVideo` step a page a frame at a time and write a WebM.
- `effectsQuality`: how many pixels the effects work on, which by default follows what the device can do.
- Eight demos with their pictures, five with a Python twin.
