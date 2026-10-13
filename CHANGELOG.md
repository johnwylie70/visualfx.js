# Changes

## 0.0.0 (not released)

The first version: effects for a scene, done by the graphics card (WebGL 2).

- Thirty-seven effects, each one line to turn on: shapes of the picture (kaleidoscope, mirror, tile, pixelate, waves, ripple, wobble, swirl, fisheye, tunnel), blurs (blur, zoomBlur, spinBlur), glow, trails, colours (rgbSplit, hue, saturate, brighten, contrast, invert, posterize, tint, duotone, colourCycle), screens and print (scanlines, crt, glitch, grain, vignette, edges, dots, letters) and four backdrops that need no drawing (plasma, starfield, metaballs, flow).
- Settings are plain properties, in the scene's points and in degrees; a setting given a function is asked every frame; `amount`, `off()`, `on()`, `remove()`, `clearEffects()`.
- Nine looks: dream, arcade, vhs, neon, comic, underwater, oldfilm, disco, terminal.
- Music: `listenTo`, `bass`, `mids`, `highs`, `loudness`, `pulse`, `react`, and the spectrum and the wave for a shader.
- `shader()`: an effect of your own, with mistakes said by line.
- An effect is a target for dials.js (`set`, `get`, `describe`).
- The same pixels every time: effects take their time from the scene's clock. `renderFrames` and `recordVideo` step a page a frame at a time and write a WebM.
- `effectsQuality`: how many pixels the effects work on, which by default follows what the device can do.
- Eight demos with their pictures, five with a Python twin.
