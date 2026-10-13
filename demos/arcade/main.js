// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Arcade: the screen an arcade machine shows while it waits for a coin, on the curved glass of an old
// television. The invaders, the score and the words are plain rectangles and text; look("arcade") is the glass.
// Use: tap or press a key to "insert a coin". Press G to take the glass away and see what is really drawn.
// Try changing: look("arcade") to look("vhs") or look("terminal"); the invader's shape in SHAPE; "INSERT COIN".

const SHAPE = [
  "..#.....#..",
  "...#...#...",
  "..#######..",
  ".##.###.##.",
  "###########",
  "#.#######.#",
  "#.#.....#.#",
  "...##.##...",
]
const glass = look("arcade")
let t = 0
let coins = 0
let flash = 0

function invader(x, y, size, colour, legs) {
  for (let row = 0; row < SHAPE.length; row++) {
    for (let col = 0; col < 11; col++) {
      // The bottom row swaps sides as they march.
      const c = legs && row === 7 ? 10 - col : col
      if (SHAPE[row][c] === "#") rect(x + col * size, y + row * size, size, size, colour)
    }
  }
}

function update(dt) {
  t += dt
  flash = Math.max(0, flash - dt)
  if (pressed.has("g")) glass.amount = glass.amount > 0 ? 0 : 1
}

function draw() {
  background("#050510")
  const step = Math.floor(t * 2)
  const sway = (step % 16 < 8 ? step % 8 : 8 - (step % 8)) * 10
  const colours = ["#ff4d6d", "#ffd23f", "#3ddc84", "#4cc9f0"]
  const size = Math.min(width / 200, height / 125)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      invader(width / 2 - 92 * size + col * 22 * size + sway, height * 0.2 + row * 13 * size, size * 1.4, colours[row], step % 2 === 1)
    }
  }
  text("SCORE 001980", 24, 34, "white", 18)
  text("HI 020480", width - 24, 34, "#ffd23f", 18, "right")
  text("VECTOR INVADERS", width / 2, height * 0.74, "#4cc9f0", 34, "centre")
  if (flash > 0) text("CREDIT " + coins, width / 2, height * 0.87, "#3ddc84", 22, "centre")
  else if (Math.floor(t * 1.6) % 2 === 0) text("INSERT COIN", width / 2, height * 0.87, "white", 22, "centre")
}

function onMouseDown() {
  coins++
  flash = 1.5
}
function onKeyDown(key) {
  if (key !== "g") onMouseDown()
}
