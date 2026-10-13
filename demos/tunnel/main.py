# This demo shows Python drawing graphics in Circuitry Studio.
# The same file runs in a web browser with Pyctures, the free library:
# https://github.com/johnwylie70/pyctures
# pyctures: autorun

# Tunnel: five small stars circle the middle. Trails keep every frame and push it outwards, a little bigger,
# a little turned and a little changed in colour, so five stars become a tunnel you fall through for ever.
# Use: move the mouse or a finger to steer the tunnel. Hold it down to turn the other way.
# Try changing: 2.5, how long a trail lasts; 1.9, how fast it grows; 50, how fast it turns; 140, how fast the colour moves.
import math
from vfx import *

tail = trails(2.5, zoom=1.9, spin=50, hue=140)
glow(0.5, radius=30)
vignette(0.5)

t = 0
colours = ["gold", "deepskyblue", "hotpink", "springgreen", "white"]

def update(dt):
    global t
    t += dt
    tail.spin = -50 if mouse.down else 50
    tail.x = mouse.x if mouse.inside else width / 2 + 60 * math.sin(t * 0.7)
    tail.y = mouse.y if mouse.inside else height / 2 + 40 * math.cos(t * 0.9)

def draw():
    background("black")
    for i in range(5):
        a = t * 1.3 + i * 1.2566
        r = 50 + 22 * math.sin(t * 2.3 + i * 2)
        star(tail.x + r * math.cos(a), tail.y + r * math.sin(a), 11, 5, colours[i])
