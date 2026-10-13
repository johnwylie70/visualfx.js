// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Tunnel: five small stars circle the middle. Trails keep every frame and push it outwards, a little bigger,
// a little turned and a little changed in colour, so five stars become a tunnel you fall through for ever.
// Use: move the mouse or a finger to steer the tunnel. Hold it down to turn the other way.
// Try changing: 2.5, how long a trail lasts; 1.9, how fast it grows; 50, how fast it turns; 140, how fast the colour moves.

const tail = trails(2.5, { zoom: 1.9, spin: 50, hue: 140 })
glow(0.5, { radius: 30 })
vignette(0.5)

let t = 0

function update(dt) {
  t += dt
  tail.spin = mouse.down ? -50 : 50
  tail.x = mouse.inside ? mouse.x : width / 2 + 60 * Math.sin(t * 0.7)
  tail.y = mouse.inside ? mouse.y : height / 2 + 40 * Math.cos(t * 0.9)
}

function draw() {
  background("black")
  const colours = ["gold", "deepskyblue", "hotpink", "springgreen", "white"]
  for (let i = 0; i < 5; i++) {
    const a = t * 1.3 + i * 1.2566
    const r = 50 + 22 * Math.sin(t * 2.3 + i * 2)
    star(tail.x + r * Math.cos(a), tail.y + r * Math.sin(a), 11, 5, colours[i])
  }
}
