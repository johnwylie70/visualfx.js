# Neon Sign

The words are drawn as outlines: a coloured line with a thin white one down its middle, on a wall of bricks almost too dark to see. `glow()` does the rest: everything bright spreads light around itself, the way a real tube lights the wall behind it.

## How to use it

Tap or click to change what the sign says.

## What's inside

`glow(1.1, { threshold: 0.3, radius: 34 })`, a touch of `rgbSplit` for the coloured fringe a camera gives bright lights, and a `vignette`. The glow breathes because `update` changes `shine.strength` a little every frame, and the second letter flickers because it is sometimes drawn nearly transparent.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
