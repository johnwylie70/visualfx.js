// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Kaleidoscope: sixty shapes drift about, and a kaleidoscope folds them into a pattern that never repeats.
// Use: move the mouse or a finger to move the middle of the pattern. Tap to change how many segments it has.
// Try changing: 60, the shapes; 8, the segments; 12, how fast the pattern turns; take the glow away.

const colours = ["gold", "deepskyblue", "tomato", "springgreen", "orchid", "white", "darkorange", "royalblue"]
const shapes = []
for (let i = 0; i < 60; i++) {
  shapes.push({ x: random(0, 800), y: random(0, 500), vx: random(-70, 70), vy: random(-70, 70), size: random(14, 46), colour: pick(colours), sides: random(3, 6), turn: random(0, 360) })
}

const pattern = kaleidoscope(8)
glow(0.45, { threshold: 0.6 })
vignette(0.4)

function update(dt) {
  for (const s of shapes) {
    s.x += s.vx * dt
    s.y += s.vy * dt
    if (s.x < 0 || s.x > width) s.vx = -s.vx
    if (s.y < 0 || s.y > height) s.vy = -s.vy
  }
  pattern.angle += 12 * dt
  if (mouse.inside) {
    pattern.x = mouse.x
    pattern.y = mouse.y
  }
}

function draw() {
  background("#0a0a1e")
  for (const s of shapes) {
    if (s.sides === 6) star(s.x, s.y, s.size, 5, s.colour)
    else if (s.sides === 5) circle(s.x, s.y, s.size * 0.7, { outline: s.colour, thickness: 6 })
    else polygon(s.x, s.y, s.size, s.sides, s.colour)
  }
}

function onMouseDown() {
  pattern.segments = pattern.segments >= 16 ? 4 : pattern.segments + 2
}
