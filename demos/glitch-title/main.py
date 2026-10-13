# This demo shows Python drawing graphics in Circuitry Studio.
# The same file runs in a web browser with Pyctures, the free library:
# https://github.com/johnwylie70/pyctures
# pyctures: autorun

# Glitch Title: the title of a film that was taped off the television a long time ago.
# The words are plain text. The six effects are the tape, and the glitch gets worse when the signal drops.
# Use: hold the mouse button or a finger down to shake the signal. Tap the words to change them.
# Try changing: the titles; 0.35, how bad the tape is; "#ff2a6d" and "#05d9e8", its two colours.
import math
from pyvisualfx import *

titles = [["SIGNAL", "LOST"], ["GAME", "OVER"], ["PLEASE", "STAND BY"], ["THE", "END"]]
which = 0
t = 0

saturate(1.35)
split = rgb_split(3)
tear = glitch(0.35)
scanlines(0.3, size=4)
grain(0.2, size=2)
vignette(0.45)

def update(dt):
    global t
    t += dt
    # Every few seconds the signal drops for a moment by itself.
    drop = math.sin(t * 0.9) > 0.93 or mouse.down
    tear.strength = 1 if drop else 0.35
    split.size = 12 if drop else 3 + 2 * math.sin(t * 3)

def draw():
    # Bars of colour, as a television shows when it has nothing else.
    bars = ["#111d35", "#0c164f", "#ba1e68", "#4379fd", "#49b4fe", "#0c164f", "#111d35"]
    for i in range(len(bars)):
        rect(i * width / len(bars), 0, width / len(bars) + 1, height, bars[i])
    rect(0, height * 0.24, width, height * 0.52, "rgba(5, 5, 16, 0.86)")
    size = min(width / 6.5, height / 3.6)
    text(titles[which][0], width / 2 + 4, height * 0.4 + 4, "#05d9e8", size, "centre")
    text(titles[which][0], width / 2, height * 0.4, "#ff2a6d", size, "centre")
    text(titles[which][1], width / 2, height * 0.62, "white", size * 0.8, "centre")
    text("PLAY ▶", 28, 40, "white", 22)
    s = int(t)
    text("0:0%d:%02d" % (s // 60 % 10, s % 60), width - 28, height - 28, "white", 22, "right")

def on_mouse_down(x, y, button):
    global which
    which = (which + 1) % len(titles)
