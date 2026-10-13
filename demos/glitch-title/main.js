// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Glitch Title: the title of a film that was taped off the television a long time ago.
// The words are plain text. look("vhs") is the tape, and the glitch gets worse when the signal drops.
// Use: hold the mouse button or a finger down to shake the signal. Tap the words to change them.
// Try changing: the titles; 0.35, how bad the tape is; "#ff2a6d" and "#05d9e8", its two colours.

const titles = [["SIGNAL", "LOST"], ["GAME", "OVER"], ["PLEASE", "STAND BY"], ["THE", "END"]]
let which = 0
let t = 0

const tape = look("vhs")
tape.glitch.strength = 0.35

function update(dt) {
  t += dt
  // Every few seconds the signal drops for a moment by itself.
  const drop = Math.sin(t * 0.9) > 0.93 || mouse.down
  tape.glitch.strength = drop ? 1 : 0.35
  tape.rgbSplit.size = drop ? 12 : 3 + 2 * Math.sin(t * 3)
}

function draw() {
  // Bars of colour, as a television shows when it has nothing else.
  const bars = ["#1d1135", "#0c164f", "#ba1e68", "#5643fd", "#7649fe", "#0c164f", "#1d1135"]
  for (let i = 0; i < bars.length; i++) rect(i * width / bars.length, 0, width / bars.length + 1, height, bars[i])
  rect(0, height * 0.24, width, height * 0.52, "rgba(5, 5, 16, 0.86)")
  const size = Math.min(width / 6.5, height / 3.6)
  text(titles[which][0], width / 2 + 4, height * 0.4 + 4, "#05d9e8", size, "centre")
  text(titles[which][0], width / 2, height * 0.4, "#ff2a6d", size, "centre")
  text(titles[which][1], width / 2, height * 0.62, "white", size * 0.8, "centre")
  text("PLAY ▶", 28, 40, "white", 22)
  const s = Math.floor(t)
  text("0:0" + Math.floor(s / 60) % 10 + ":" + String(s % 60).padStart(2, "0"), width - 28, height - 28, "white", 22, "right")
}

function onMouseDown() {
  which = (which + 1) % titles.length
}
