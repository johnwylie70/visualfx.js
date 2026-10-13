# Lava Lamp

This scene draws nothing. `metaballs("lava")` is a backdrop: a picture the graphics card makes by itself, of blobs that melt into each other when they meet. A `wobble`, a `glow` and a `vignette` make it a lamp.

## How to use it

- Move the mouse or a finger up the screen to warm the lamp: the blobs move faster.
- Tap or click for other colours.

## What's inside

Four lines of effects, and `background()` with no colour in `draw`, which wipes the picture clear each frame so the backdrop shows through. Draw something of your own after it and it will float in front of the lava.

Try `plasma()`, `flow()` or `starfield()` in place of `metaballs()`.

## The same scene in Python

`main.py` is the same scene for Pyctures, with `from vfx import *`. The two do the same thing in the same order, so you can read one beside the other.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
