# This demo shows Python drawing graphics in Circuitry Studio.
# The same file runs in a web browser with Pyctures, the free library:
# https://github.com/johnwylie70/pyctures
# pyctures: autorun

# Kaleidoscope: sixty shapes drift about, and a kaleidoscope folds them into a pattern that never repeats.
# Use: move the mouse or a finger to move the middle of the pattern. Tap to change how many segments it has.
# Try changing: 60, the shapes; 8, the segments; 12, how fast the pattern turns; take the glow away.
from vfx import *

colours = ["gold", "deepskyblue", "tomato", "springgreen", "orchid", "white", "darkorange", "royalblue"]
shapes = []
for i in range(60):
    shapes.append({"x": random(0, 800), "y": random(0, 500), "vx": random(-70, 70), "vy": random(-70, 70),
                   "size": random(14, 46), "colour": pick(colours), "sides": random(3, 6)})

pattern = kaleidoscope(8)
glow(0.45, threshold=0.6)
vignette(0.4)

def update(dt):
    for s in shapes:
        s["x"] += s["vx"] * dt
        s["y"] += s["vy"] * dt
        if s["x"] < 0 or s["x"] > width:
            s["vx"] = -s["vx"]
        if s["y"] < 0 or s["y"] > height:
            s["vy"] = -s["vy"]
    pattern.angle += 12 * dt
    if mouse.inside:
        pattern.x = mouse.x
        pattern.y = mouse.y

def draw():
    background("#0a0a1e")
    for s in shapes:
        if s["sides"] == 6:
            star(s["x"], s["y"], s["size"], 5, s["colour"])
        elif s["sides"] == 5:
            circle(s["x"], s["y"], s["size"] * 0.7, outline=s["colour"], thickness=6)
        else:
            polygon(s["x"], s["y"], s["size"], s["sides"], s["colour"])

def on_mouse_down(x, y, button):
    pattern.segments = 4 if pattern.segments >= 16 else pattern.segments + 2
