# Finger Paint

Drag a finger or the mouse and a line of changing colour follows it. `mirror("four")` shows it four times, `glow` makes it shine, and `trails(8)` is the paint: the scene only ever draws the newest bit of the stroke, and the trails keep the rest for eight seconds while it fades.

Until you touch it, it paints by itself.

## How to use it

- Drag to paint.
- C clears the picture. M changes the mirror. K swaps the mirror for a kaleidoscope.

## What's inside

The canvas is painted black every frame, so nothing you draw would last without the trails: they are the memory. Change `8` to `60` and the paint stays for a minute.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
