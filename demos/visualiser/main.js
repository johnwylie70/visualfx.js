// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Visualiser: a short tune in a few lines, and a picture that moves to it. bass(), mids(), highs() and pulse()
// are numbers from 0 to 1 that follow the music: here they size the rings, push the trails and flash the glow.
// Use: tap, click or press a key to turn the sound on (a browser keeps a page silent until then).
// With no sound it still moves, by the clock.
// Try changing: the notes; 6, the segments; what each band does; add colourCycle("neon") at the end.

const STEP = 0.134
makeSynth("kick").playNotes("C2 - - - C2 - - C2", STEP, { repeat: true })
makeSynth("hat").playNotes("- - C5 - - - C5 C5", STEP, { repeat: true })
makeSynth("bass").playNotes("C2:2 C2 - C3 - C2:2 A1:2 A1 - A2 - A1:2 F1:2 F1 - F2 - F1:2 G1:2 G1 - G2 - B1:2", STEP, { repeat: true })
makeSynth("pluck").playNotes("E5 G5 C6 G5 E5 C5 D5 G5 E5 A5 C6 A5 E5 C5 B4 E5", STEP, { repeat: true })

kaleidoscope(6)
const tail = trails(0.7, { zoom: 1.5, spin: 25, hue: 90 })
const shine = glow(0.7, { radius: 36 })
vignette(0.5)
react(shine, "strength", "bass", { from: 0.4, to: 1.5 })
react(tail, "zoom", "pulse", { from: 1.3, to: 2.6 })

let t = 0

function update(dt) {
  t += dt
}

function draw() {
  background("black")
  // With nothing playing, the clock stands in for the music.
  const quiet = loudness() < 0.02
  const low = quiet ? 0.5 + 0.5 * Math.sin(t * 3) : bass()
  const mid = quiet ? 0.5 + 0.5 * Math.sin(t * 2.1 + 1) : mids()
  const high = quiet ? 0.5 + 0.5 * Math.sin(t * 5.3 + 2) : highs()
  // Only a thin slice of the picture is seen (the kaleidoscope repeats it six times), so everything is drawn
  // along one line out from the middle: a ring for the bass, a star for the middle and beads for the highs.
  const cx = width / 2, cy = height / 2
  const out = (far, across) => [cx + far * 0.966 - across * 0.259, cy + far * 0.259 + across * 0.966]
  circle(...out(70, 0), 12 + 26 * low, { outline: "tomato", thickness: 5 })
  star(...out(150 + 20 * mid, 0), 10 + 22 * mid, 5, "gold")
  for (let i = 0; i < 5; i++) circle(...out(200 + i * 26, 30 * high * Math.sin(t * 4 + i)), 5, "deepskyblue")
  line(...out(20, 0), ...out(110, 34 * Math.sin(t * 1.3)), "orchid", 2 + 5 * low)
}
