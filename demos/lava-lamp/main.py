# This demo shows Python drawing graphics in Circuitry Studio.
# The same file runs in a web browser with Pyctures, the free library:
# https://github.com/johnwylie70/pyctures
# pyctures: autorun

# Lava Lamp: nothing is drawn here at all. metaballs() is a backdrop the graphics card makes by itself:
# blobs that melt into each other. The glow and the wobble are two more lines.
# Use: move the mouse or a finger up and down to warm the lamp: the blobs move faster. Tap for other colours.
# Try changing: "lava" to "neon", "ocean" or "candy"; 8, how many blobs; 1.3, their size; or try plasma() or flow() instead.
from vfx import *

palettes = ["lava", "neon", "ocean", "candy", "sunset"]
which = 0

lamp = metaballs("lava", count=8, size=1.3, speed=0.35)
wobble(8, scale=200)
glow(0.6, threshold=0.3, radius=44)
vignette(0.6)

def update(dt):
    if mouse.inside:
        lamp.speed = 0.15 + 1.2 * (1 - mouse.y / height)

def draw():
    background()          # with no colour: the picture is wiped clear, so the backdrop shows

def on_mouse_down(x, y, button):
    global which
    which = (which + 1) % len(palettes)
    lamp.palette = palettes[which]
