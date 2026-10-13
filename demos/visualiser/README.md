# Visualiser

Four lines play a tune: a kick drum, a hi-hat, a bass line and a melody. The picture is a ring, a star, five beads and a line, folded six times by a kaleidoscope, with trails and a glow.

`bass()`, `mids()`, `highs()` and `pulse()` are numbers from 0 to 1 that follow the music. Here the ring grows with the bass, the star with the middle, the beads dance to the highs, and two `react` lines tie the glow to the bass and the trails' zoom to the beat.

## How to use it

Tap, click or press a key to turn the sound on: a browser keeps a page silent until then. With no sound the picture still moves, by the clock.

## What's inside

`react(shine, "strength", "bass", { from: 0.4, to: 1.5 })` is the whole of making an effect follow the music. Change the notes and the picture changes with them.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
