# Kaleidoscope

Sixty plain shapes drift about the screen and bounce off its edges. That is all the drawing there is. `kaleidoscope(8)` takes one slice of that picture and folds it round eight times, and because the shapes keep moving, the pattern never comes back the same.

## How to use it

- Move the mouse or a finger: the middle of the pattern follows it.
- Tap or click: two more segments, up to sixteen, then back to four.

## What's inside

Three lines are the effects: `kaleidoscope(8)`, a little `glow` and a `vignette`. The pattern turns because `update` adds to `pattern.angle` every frame: an effect's settings are plain properties.

Try taking the kaleidoscope line out to see what is really being drawn.

## The same scene in Python

`main.py` is the same scene for Pyctures, with `from pyvisualfx import *`. The two do the same thing in the same order, so you can read one beside the other.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
