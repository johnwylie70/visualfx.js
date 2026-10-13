# Arcade

Rows of invaders march from side to side, the score sits in the corners and INSERT COIN blinks. All of it is plain rectangles and text. `look("arcade")` puts it behind the curved glass of an old television: lines across the picture, thin stripes of red, green and blue, a soft glow and dark corners.

## How to use it

- Tap or press a key to insert a coin.
- Press G to take the glass away and see what is really drawn, and again to put it back.

## What's inside

A look is several effects at once: this one is `glow` and `crt`. `glass.amount = 0` mixes them out without turning them off. Try `look("vhs")` or `look("terminal")` in its place.

## The same scene in Python

`main.py` is the same scene for Pyctures, with `from vfx import *`. The two do the same thing in the same order, so you can read one beside the other.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
