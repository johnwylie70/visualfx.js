# Tunnel

Five small stars circle the middle of the screen. `trails()` keeps every frame and pushes it outwards: a little bigger, a little turned and a little changed in colour each time. So each star leaves a ribbon that spirals away past you, and five stars become a tunnel.

This is how the classic screensavers were made: the picture is fed back into itself.

## How to use it

- Move the mouse or a finger to steer the middle of the tunnel.
- Hold it down to turn the other way.

## What's inside

`trails(2.5, { zoom: 1.9, spin: 50, hue: 140 })`: a trail lasts two and a half seconds, nearly doubles in size every second, turns fifty degrees a second and moves 140 degrees round the colour wheel a second. Change any of the four and it is a different tunnel.

## The same scene in Python

`main.py` is the same scene for Pyctures, with `from pyvisualfx import *`. The two do the same thing in the same order, so you can read one beside the other.

## The effects

The effects come from a small library that runs them on the graphics card, so they cost almost nothing. Each is one line to turn on, and its settings can be changed while the scene runs.
