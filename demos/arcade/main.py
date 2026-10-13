# This demo shows Python drawing graphics in Circuitry Studio.
# The same file runs in a web browser with Pyctures, the free library:
# https://github.com/johnwylie70/pyctures
# pyctures: autorun

# Arcade: the screen an arcade machine shows while it waits for a coin, on the curved glass of an old
# television. The invaders, the score and the words are plain rectangles and text; look("arcade") is the glass.
# Use: tap or press a key to "insert a coin". Press G to take the glass away and see what is really drawn.
# Try changing: look("arcade") to look("vhs") or look("terminal"); the invader's shape in SHAPE; "INSERT COIN".
from pyvisualfx import *

SHAPE = [
    "..#.....#..",
    "...#...#...",
    "..#######..",
    ".##.###.##.",
    "###########",
    "#.#######.#",
    "#.#.....#.#",
    "...##.##...",
]
glass = look("arcade")
t = 0
coins = 0
flash = 0

def invader(x, y, size, colour, legs):
    for row in range(len(SHAPE)):
        for col in range(11):
            # The bottom row swaps sides as they march.
            c = 10 - col if legs and row == 7 else col
            if SHAPE[row][c] == "#":
                rect(x + col * size, y + row * size, size, size, colour)

def update(dt):
    global t, flash
    t += dt
    flash = max(0, flash - dt)

def draw():
    background("#050510")
    step = int(t * 2)
    sway = (step % 8 if step % 16 < 8 else 8 - step % 8) * 10
    colours = ["#ff4d6d", "#ffd23f", "#3ddc84", "#4cc9f0"]
    size = min(width / 200, height / 125)
    for row in range(4):
        for col in range(8):
            invader(width / 2 - 92 * size + col * 22 * size + sway, height * 0.2 + row * 13 * size, size * 1.4, colours[row], step % 2 == 1)
    text("SCORE 001980", 24, 34, "white", 18)
    text("HI 020480", width - 24, 34, "#ffd23f", 18, "right")
    text("VECTOR INVADERS", width / 2, height * 0.74, "#4cc9f0", 34, "centre")
    if flash > 0:
        text("CREDIT %d" % coins, width / 2, height * 0.87, "#3ddc84", 22, "centre")
    elif int(t * 1.6) % 2 == 0:
        text("INSERT COIN", width / 2, height * 0.87, "white", 22, "centre")

def on_mouse_down(x, y, button):
    global coins, flash
    coins += 1
    flash = 1.5

def on_key_down(key, code):
    if key == "g":
        glass.amount = 0 if glass.amount > 0 else 1
    else:
        on_mouse_down(0, 0, "left")
