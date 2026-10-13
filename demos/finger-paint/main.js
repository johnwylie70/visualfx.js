// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Finger Paint: draw with a finger or the mouse. Whatever you draw is mirrored four ways and glows,
// and the paint slowly fades, so the picture is always changing.
// Use: drag to paint. Press C to clear, M to change the mirror, K for a kaleidoscope.
// Try changing: 8, how long the paint lasts; 14, the brush; mirror("four") to mirror("left").

const reflect = mirror("four")
const pattern = kaleidoscope(8).off()
const paint = trails(8)
glow(1.1, { threshold: 0.3, radius: 30 })

let hueNow = 0
let last = null
const sides = ["four", "left", "top"]
let side = 0

// Until a finger arrives, the scene paints by itself.
let t = 0
let touched = false

function brush(x, y) {
  hueNow = (hueNow + 2) % 360
  const colour = `hsl(${hueNow}, 100%, 60%)`
  if (last) line(last.x, last.y, x, y, colour, 14)
  circle(x, y, 7, colour)
  last = { x, y }
}

function update(dt) {
  t += dt
  if (pressed.has("c")) { paint.length = 0.01; setTimeout(() => { paint.length = 8 }, 100) }
  if (pressed.has("m")) { side = (side + 1) % sides.length; reflect.side = sides[side] }
  if (pressed.has("k")) { if (pattern.active) { pattern.off(); reflect.on() } else { pattern.on(); reflect.off() } }
}

function draw() {
  background("black")     // only this frame's stroke is drawn: the trails keep the rest
  if (mouse.down) {
    touched = true
    brush(mouse.x, mouse.y)
  } else if (!touched) {
    const x = width * (0.27 + 0.2 * Math.sin(t * 1.3) * Math.cos(t * 0.31)), y = height * (0.27 + 0.2 * Math.sin(t * 1.7 + 1))
    brush(x, y)
  } else last = null
}
