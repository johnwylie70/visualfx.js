# Glitch Title

Bars of colour, two big words and a counter in the corner, drawn as plain rectangles and text. Six effects are the videotape: stronger colour, red and blue pulled apart, blocks that jump and a line that tears, dark lines across, grain and dark corners.

## How to use it

- Hold the mouse button or a finger down to shake the signal.
- Tap to change the words.

Every few seconds the signal drops for a moment by itself.

## What's inside

`look("vhs")` turns the six on together and gives them back by name, so `tape.glitch.strength = 1` makes one of them worse while the rest carry on. The glitches come from a seed and the scene's clock, not from chance, so the same scene always glitches at the same moments: a video recorded of it is the same every time.

## The same scene in Python

`main.py` is the same scene for Pyctures, with `from vfx import *`. The two do the same thing in the same order, so you can read one beside the other.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
