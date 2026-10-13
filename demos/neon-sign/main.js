// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Neon Sign: words drawn as plain outlines, and a glow that makes them a sign in a dark street.
// One letter has a loose wire. Use: tap or click to change what the sign says.
// Try changing: the words; "hotpink" and "cyan"; 1.1, how strong the glow is; 34, how far it spreads.

const signs = [["OPEN", "LATE"], ["GOOD", "VIBES"], ["HELLO", "WORLD"]]
let which = 0
let t = 0

const shine = glow(1.1, { threshold: 0.3, radius: 34 })
rgbSplit(1.5)
vignette(0.7)

function update(dt) {
  t += dt
  // The glow breathes, as a tube that is warming up does.
  shine.strength = 1.1 + 0.12 * Math.sin(t * 9) + 0.08 * Math.sin(t * 23)
}

function neon(words, y, colour, size) {
  ctx.font = `bold ${size}px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.lineJoin = "round"
  const wide = ctx.measureText(words).width
  let x = width / 2 - wide / 2
  for (let i = 0; i < words.length; i++) {
    const w = ctx.measureText(words[i]).width
    // The second letter of the top word flickers: now and then it is nearly out.
    const loose = y < height / 2 && i === 1 && (Math.sin(t * 31) + Math.sin(t * 7.3) > 1.2)
    ctx.globalAlpha = loose ? 0.15 : 1
    ctx.lineWidth = size / 14
    ctx.strokeStyle = colour
    ctx.strokeText(words[i], x + w / 2, y)
    ctx.lineWidth = size / 70
    ctx.strokeStyle = "white"
    ctx.strokeText(words[i], x + w / 2, y)
    x += w
  }
  ctx.globalAlpha = 1
}

function draw() {
  background("#07060d")
  // A wall of bricks, almost too dark to see until the sign lights it.
  for (let row = 0; row < height / 22; row++) {
    for (let col = -1; col < width / 60; col++) rect(col * 60 + (row % 2) * 30 + 2, row * 22 + 2, 56, 18, "#120f1c")
  }
  const size = Math.min(width / 4.6, height / 3.2)
  neon(signs[which][0], height * 0.32, "hotpink", size)
  neon(signs[which][1], height * 0.68, "cyan", size)
}

function onMouseDown() {
  which = (which + 1) % signs.length
}
