#!/usr/bin/env node
/**
 * The effects in real browsers. Each case draws a known picture on a canvas, turns effects on, steps
 * frames by hand and measures the pixels that come out: a kaleidoscope's symmetry, what a blur takes
 * away, where a hue lands, how fast a trail fades. Then that the same scene stepped twice gives the
 * same pixels, that nothing is left on the graphics card when a scene stops, that a lost context comes
 * back, that the music's bands follow a made-up tone and a click, and scenes run by pictures.js.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-visualfx.mjs
 *
 * pictures.js is taken from the folder beside this repository (or PICTURES=/path/to/pictures.js), with
 * the effects wired in as docs/pictures.js.md says (scripts/serve.mjs). Chromium, and WebKit when
 * Playwright has it. It ends with code 1 if a case fails. No sound is made: the "music" is a list of numbers.
 */
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { serve, ROOT } from './serve.mjs'

const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { at, close } = await serve({
  '/blank.html': '<!doctype html><body style="margin:0;background:#fff">',
  '/scene.html': '<!doctype html><body style="margin:20px;background:#fff"><div id="s" style="position:relative;width:400px;height:300px"></div>',
})

// What every case has on its page: a canvas of a size with a picture on it, and ways to measure pixels.
const TOOLS = () => {
  window.card = (w, h, paint) => {
    const box = document.createElement('div')
    box.style.cssText = `position:relative;width:${w}px;height:${h}px`
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.style.cssText = `display:block;width:${w}px;height:${h}px`
    box.append(canvas)
    document.body.append(box)
    const g = canvas.getContext('2d')
    if (paint) paint(g, w, h)
    return { canvas, g, box }
  }
  // Shapes that are the same every time: a small generator of numbers from a seed.
  window.shapes = (g, w, h, seed = 7, n = 24) => {
    let s = seed
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
    g.fillStyle = '#081020'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgb(${r() * 255 | 0},${r() * 255 | 0},${r() * 255 | 0})`
      g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 26, 0, 7); g.fill()
    }
  }
  window.at = (p, x, y) => { const i = (y * p.width + x) * 4; return [p.data[i], p.data[i + 1], p.data[i + 2]] }
  /** The mean difference of two pictures, 0 to 255, and the most any one number differs. */
  window.differ = (a, b) => {
    if (a.width !== b.width || a.height !== b.height) return { mean: 255, most: 255 }
    let sum = 0, most = 0
    for (let i = 0; i < a.data.length; i++) { if ((i & 3) === 3) continue; const d = Math.abs(a.data[i] - b.data[i]); sum += d; if (d > most) most = d }
    return { mean: sum / (a.data.length * 0.75), most }
  }
  window.mean = (p) => { let s = 0; for (let i = 0; i < p.data.length; i++) if ((i & 3) !== 3) s += p.data[i]; return s / (p.data.length * 0.75) }
  /** How sharply the picture changes from one pixel to the next (the square of each step): what a blur takes away. */
  window.detail = (p) => { let s = 0; for (let y = 0; y < p.height; y++) for (let x = 1; x < p.width; x++) { const i = (y * p.width + x) * 4; for (let k = 0; k < 3; k++) s += (p.data[i + k] - p.data[i + k - 4]) ** 2 } return s / (p.width * p.height * 3) }
  window.sum = (p) => { let h = 2166136261; for (let i = 0; i < p.data.length; i++) h = Math.imul(h ^ p.data[i], 16777619); return h >>> 0 }
  window.done = (...all) => { for (const a of all) { a.fx?.close(); a.box?.remove() } }
}

const near = (a, b, by) => Math.abs(a - b) <= by
const cases = [
  { what: 'a canvas with no effect on has no second canvas, no context and nothing on the graphics card',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(64, 64, shapes)
      a.fx = effects(a.canvas, { manual: true })
      a.fx.frame(1 / 60)
      const out = { canvases: a.box.querySelectorAll('canvas').length, ...a.fx.stats() }
      done(a)
      return out
    },
    check: (r) => r.canvases === 1 && !r.context && r.textures === 0 && r.programs === 0 },

  { what: 'a kaleidoscope of four is the same turned a quarter and the same mirrored, and is not one flat colour',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(256, 256, shapes)
      a.fx = effects(a.canvas, { manual: true })
      a.fx.kaleidoscope(4)
      a.fx.frame(1 / 60)
      const p = a.fx.pixels()
      let turned = 0, flipped = 0, n = 0
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const here = at(p, x, y), quarter = at(p, 255 - y, x), across = at(p, y, x)
        for (let k = 0; k < 3; k++) { turned += Math.abs(here[k] - quarter[k]); flipped += Math.abs(here[k] - across[k]); n++ }
      }
      const out = { turned: turned / n, flipped: flipped / n, detail: detail(p), layer: a.box.querySelectorAll('canvas').length }
      done(a)
      return out
    },
    check: (r) => r.turned < 1.5 && r.flipped < 1.5 && r.detail > 1 && r.layer === 2 },

  { what: 'eight segments: turning the picture an eighth of the way round changes almost nothing, and a twelfth changes a lot',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(256, 256, shapes)
      a.fx = effects(a.canvas, { manual: true })
      a.fx.kaleidoscope(8)
      a.fx.frame(1 / 60)
      const p = a.fx.pixels()
      const turnedBy = (deg) => {
        const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180)
        let sum = 0, n = 0
        for (let y = 28; y < 228; y += 2) for (let x = 28; x < 228; x += 2) {
          const dx = x + 0.5 - 128, dy = y + 0.5 - 128
          if (dx * dx + dy * dy > 95 * 95) continue
          const there = at(p, Math.floor(128 + dx * c - dy * s), Math.floor(128 + dx * s + dy * c)), here = at(p, x, y)
          for (let k = 0; k < 3; k++) { sum += Math.abs(here[k] - there[k]); n++ }
        }
        return sum / n
      }
      const out = { eighth: turnedBy(45), twelfth: turnedBy(30) }
      done(a)
      return out
    },
    check: (r) => r.eighth < 9 && r.twelfth > r.eighth * 2.5 },

  { what: 'a blur takes most of the fine detail away and leaves the picture as bright as it was; a wider one takes more',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(256, 192, shapes)
      a.fx = effects(a.canvas, { manual: true })
      const before = a.fx.pixels()
      const b = a.fx.blur(6)
      a.fx.frame(1 / 60)
      const six = a.fx.pixels()
      b.radius = 30
      a.fx.frame(1 / 60)
      const thirty = a.fx.pixels()
      const out = { was: detail(before), six: detail(six), thirty: detail(thirty), bright: [mean(before), mean(six), mean(thirty)] }
      done(a)
      return out
    },
    check: (r) => r.six < r.was * 0.45 && r.thirty < r.six * 0.5 && near(r.bright[0], r.bright[1], 2) && near(r.bright[0], r.bright[2], 4) },

  { what: 'a blurred slope from black to white has no bands: no step is more than one shade',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(512, 32, (g, w, h) => { const s = g.createLinearGradient(0, 0, w, 0); s.addColorStop(0, '#000'); s.addColorStop(1, '#404040'); g.fillStyle = s; g.fillRect(0, 0, w, h) })
      a.fx = effects(a.canvas, { manual: true })
      a.fx.blur(20)
      a.fx.frame(1 / 60)
      const p = a.fx.pixels()
      // Averaged down each column, the slope must rise smoothly: the fine grain is what hides the steps.
      const cols = []
      for (let x = 0; x < 512; x++) { let s = 0; for (let y = 0; y < 32; y++) s += at(p, x, y)[0]; cols.push(s / 32) }
      let most = 0
      for (let x = 41; x < 472; x++) most = Math.max(most, Math.abs(cols[x] - cols[x - 1]))
      done(a)
      return { most, ends: [cols[40], cols[470]] }
    },
    check: (r) => r.most < 0.75 && r.ends[1] - r.ends[0] > 40 },

  { what: 'hue turned a third of the way round makes red green, and two thirds makes it blue; invert, tint, duotone and posterize give the colours they should',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const one = async (paint, make) => {
        const a = card(16, 16, (g) => { g.fillStyle = paint; g.fillRect(0, 0, 16, 16) })
        a.fx = effects(a.canvas, { manual: true })
        make(a.fx)
        a.fx.frame(1 / 60)
        const c = at(a.fx.pixels(), 8, 8)
        done(a)
        return c
      }
      return {
        green: await one('#ff0000', (f) => f.hue(120)), blue: await one('#ff0000', (f) => f.hue(240)), same: await one('#3060c0', (f) => f.hue(360)),
        invert: await one('#204080', (f) => f.invert()), tint: await one('#808080', (f) => f.tint('#ff8000')), duo: await one('#ffffff', (f) => f.duotone('navy', '#ffd700')),
        poster: await one('#707070', (f) => f.posterize(2)), grey: await one('#ff0000', (f) => f.saturate(0)), half: await one('#204080', (f) => f.invert({ amount: 0.5 })),
      }
    },
    check: (r) => {
      const is = (c, to, by = 3) => c.every((v, i) => near(v, to[i], by))
      return is(r.green, [0, 255, 0]) && is(r.blue, [0, 0, 255]) && is(r.same, [0x30, 0x60, 0xc0]) && is(r.invert, [223, 191, 127], 1) && is(r.tint, [128, 64, 0], 2)
        && is(r.duo, [255, 215, 0], 1) && is(r.poster, [0, 0, 0], 0) && is(r.grey, [76, 76, 76], 2) && is(r.half, [127.5, 127.5, 127.5], 1)
    } },

  { what: 'a trail fades to a tenth in the seconds it was given, at sixty frames a second and at thirty',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const fade = (fps) => {
        const a = card(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64) })
        a.fx = effects(a.canvas, { manual: true })
        a.fx.trails(1)
        a.fx.frame(1 / fps)
        const first = at(a.fx.pixels(), 32, 32)[0]
        a.g.fillStyle = '#000'; a.g.fillRect(0, 0, 64, 64)
        const seen = {}
        for (let i = 1; i <= fps * 2; i++) {
          a.fx.frame(1 / fps)
          if (i === fps / 2 || i === fps || i === fps * 2) seen[i / fps] = at(a.fx.pixels(), 32, 32)[0]
        }
        const float = a.fx.stats().float
        done(a)
        return { first, seen, float }
      }
      return { sixty: fade(60), thirty: fade(30) }
    },
    // 255 x 0.1^t: 80.6 at half a second, 25.5 at one, 2.6 at two (a card with no fine shades ends sooner).
    check: (r) => [r.sixty, r.thirty].every((f) => f.first === 255 && near(f.seen[0.5], 80.6, f.float ? 3 : 12) && near(f.seen[1], 25.5, f.float ? 2.5 : 14) && f.seen[2] <= 4) },

  { what: 'a trail with zoom and spin moves what was drawn outward and round, and with nothing new drawn ends in black',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(128, 128, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.fillRect(84, 60, 8, 8) })
      a.fx = effects(a.canvas, { manual: true })
      a.fx.trails(2, { zoom: 2, spin: 90 })
      a.fx.frame(1 / 60)
      a.g.fillStyle = '#000'; a.g.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 30; i++) a.fx.frame(1 / 60)
      // Half a second on: 24 points right of the middle has become 34 points out, an eighth of a turn round.
      const p = a.fx.pixels()
      let bx = 0, by = 0, w = 0
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const v = at(p, x, y)[0]; bx += v * x; by += v * y; w += v }
      for (let i = 0; i < 600; i++) a.fx.frame(1 / 60)
      const end = mean(a.fx.pixels())
      done(a)
      return { x: bx / w - 64, y: by / w - 64, end }
    },
    check: (r) => near(Math.hypot(r.x, r.y), 34, 4) && near(Math.atan2(r.y, r.x) * 180 / Math.PI, 45, 8) && r.end === 0 },

  { what: 'glow leaves a dark picture alone, spreads light round a bright thing, and does not flicker as that thing moves a fraction of a pixel',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const dark = card(128, 128, (g) => { g.fillStyle = '#202020'; g.fillRect(0, 0, 128, 128) })
      dark.fx = effects(dark.canvas, { manual: true })
      dark.fx.glow(1)
      dark.fx.frame(1 / 60)
      const untouched = at(dark.fx.pixels(), 64, 64)
      const a = card(128, 128)
      a.fx = effects(a.canvas, { manual: true })
      a.fx.glow(1, { radius: 20 })
      const totals = [], beside = []
      for (let i = 0; i < 16; i++) {
        a.g.fillStyle = '#000'; a.g.fillRect(0, 0, 128, 128)
        a.g.fillStyle = '#fff'; a.g.beginPath(); a.g.arc(60 + i * 0.27, 64 + i * 0.19, 3, 0, 7); a.g.fill()
        a.fx.frame(1 / 60)
        const p = a.fx.pixels()
        totals.push(mean(p))
        beside.push(at(p, 72, 64)[0])
      }
      done(dark, a)
      return { untouched, totals, beside }
    },
    check: (r) => r.untouched.every((v) => near(v, 32, 1)) && Math.min(...r.beside) > 2 && (Math.max(...r.totals) - Math.min(...r.totals)) / Math.max(...r.totals) < 0.12 },

  { what: 'order matters, an effect that is off or has no amount changes nothing, and with every effect off the picture is the scene\'s own canvas again',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(96, 96, shapes)
      a.fx = effects(a.canvas, { manual: true })
      const before = a.fx.pixels()
      const i = a.fx.invert(), t = a.fx.tint('red')
      a.fx.frame(1 / 60)
      const invertThenTint = a.fx.pixels()
      i.remove(); t.remove()
      const t2 = a.fx.tint('red'), i2 = a.fx.invert()
      a.fx.frame(1 / 60)
      const tintThenInvert = a.fx.pixels()
      i2.off()
      a.fx.frame(1 / 60)
      const tintOnly = a.fx.pixels()
      t2.amount = 0
      a.fx.frame(1 / 60)
      const none = a.fx.pixels()
      t2.off()
      a.fx.frame(1 / 60)
      const shown = getComputedStyle(a.box.querySelectorAll('canvas')[1]).display
      const off = a.fx.pixels()
      i2.on()
      a.fx.frame(1 / 60)
      const back = getComputedStyle(a.box.querySelectorAll('canvas')[1]).display
      const out = { orders: differ(invertThenTint, tintThenInvert).mean, tint: differ(tintOnly, tintThenInvert).mean, none: differ(none, before), off: differ(off, before), shown, back }
      done(a)
      return out
    },
    check: (r) => r.orders > 20 && r.tint > 20 && r.none.most <= 1 && r.off.most === 0 && r.shown === 'none' && r.back === 'block' },

  { what: 'the same scene stepped twice gives the very same pixels, frame for frame: backdrops, trails, glow, grain, glitches and all',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const film = (fps, frames, pick) => {
        const a = card(160, 120)
        a.fx = effects(a.canvas, { manual: true })
        a.fx.plasma('neon', { amount: 0.5 })
        a.fx.kaleidoscope(6, { angle: () => a.fx.stats().time * 40 })
        a.fx.trails(0.4, { zoom: 1.3, spin: 30, hue: 90 })
        a.fx.glow(0.8)
        a.fx.wobble(4)
        a.fx.rgbSplit(2)
        a.fx.grain(0.2)
        a.fx.glitch(0.6)
        a.fx.vignette()
        const sums = []
        let t = 0
        for (let i = 1; i <= frames; i++) {
          t += 1 / fps
          a.g.clearRect(0, 0, 160, 120)
          a.g.fillStyle = 'gold'; a.g.beginPath(); a.g.arc(80 + 50 * Math.cos(t * 3), 60 + 40 * Math.sin(t * 2), 9, 0, 7); a.g.fill()
          a.g.fillStyle = 'deepskyblue'; a.g.fillRect(20 + 100 * (t % 1), 20, 14, 14)
          a.fx.frame(1 / fps)
          if (pick(i)) sums.push(sum(a.fx.pixels()))
        }
        const last = a.fx.pixels()
        done(a)
        return { sums, last }
      }
      const one = film(60, 90, (i) => i % 10 === 0), two = film(60, 90, (i) => i % 10 === 0)
      return { one: one.sums, two: two.sums, differ: differ(one.last, two.last) }
    },
    check: (r) => r.one.length === 9 && r.one.join() === r.two.join() && new Set(r.one).size === 9 && r.differ.most === 0 },

  { what: 'recorded at thirty frames a second and at sixty, the picture at the same moment is the same: exactly so without trails, and closely with them',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const film = (fps, trail) => {
        const a = card(160, 120)
        a.fx = effects(a.canvas, { manual: true })
        a.fx.flow('ocean', { amount: 0.6 })
        a.fx.kaleidoscope(6, { angle: () => a.fx.stats().time * 40 })
        if (trail) a.fx.trails(0.5, { zoom: 1.2, spin: 20 })
        a.fx.glow(0.8)
        a.fx.waves(5)
        a.fx.grain(0.15)
        a.fx.glitch(0.5)
        a.fx.crt()
        const shots = []
        let t = 0
        for (let i = 1; i <= fps * 2; i++) {
          t = i / fps
          a.g.clearRect(0, 0, 160, 120)
          a.g.fillStyle = 'gold'; a.g.beginPath(); a.g.arc(80 + 50 * Math.cos(t * 1.5), 60 + 40 * Math.sin(t), 12, 0, 7); a.g.fill()
          a.fx.frame(1 / fps)
          if (i % (fps / 2) === 0) shots.push(a.fx.pixels())
        }
        done(a)
        return shots
      }
      const plain30 = film(30, false), plain60 = film(60, false), trail30 = film(30, true), trail60 = film(60, true)
      return { plain: plain30.map((p, i) => differ(p, plain60[i])), trails: trail30.map((p, i) => differ(p, trail60[i]).mean), moving: differ(plain30[0], plain30[1]).mean }
    },
    check: (r) => r.plain.length === 4 && r.plain.every((d) => d.most <= 1) && r.trails.every((d) => d < 6) && r.moving > 3 },

  { what: 'nothing is left on the graphics card when a scene stops, however many times it is run, and a running scene holds the same from frame to frame',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const seen = []
      let steady = true, last = null
      for (let run = 0; run < 40; run++) {
        const a = card(200, 150, shapes)
        a.fx = effects(a.canvas, { fresh: true, manual: true })
        a.fx.blur(12); a.fx.glow(1); a.fx.trails(0.5); a.fx.kaleidoscope(5); a.fx.look('vhs')
        a.fx.shader('vec4 effect(vec2 uv) { return mix(texture(picture, uv), texture(previous, uv), 0.5); }')
        let held = ''
        for (let i = 0; i < 6; i++) { a.fx.frame(1 / 60); const s = a.fx.stats(); const now = `${s.textures}/${s.framebuffers}`; if (i > 1 && now !== held) steady = false; held = now }
        if (run === 39) last = mean(a.fx.pixels())
        const pipe = a.fx.pipeline
        a.fx.close()
        seen.push(`${pipe.counts.textures}/${pipe.counts.framebuffers}`)
        a.box.remove()
      }
      return { left: [...new Set(seen)], steady, last, canvases: document.querySelectorAll('canvas').length }
    },
    check: (r) => r.left.join() === '0/0' && r.steady && r.last > 5 && r.canvases === 0 },

  { what: 'when the graphics card takes its context away and gives it back, the effects are made again and the picture is as it was',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(128, 96, shapes)
      a.fx = effects(a.canvas, { manual: true })
      a.fx.kaleidoscope(6); a.fx.blur(4); a.fx.hue(80); a.fx.trails(0.3)
      a.fx.shader('vec4 effect(vec2 uv) { return texture(picture, uv).brga; }')
      for (let i = 0; i < 5; i++) a.fx.frame(1 / 60)
      const before = a.fx.pixels()
      const layer = a.box.querySelectorAll('canvas')[1]
      const ext = a.fx.pipeline.gl.getExtension('WEBGL_lose_context')
      const lost = new Promise((r) => layer.addEventListener('webglcontextlost', r, { once: true }))
      ext.loseContext()
      await lost
      // Giving it back is allowed once the browser has finished telling of the loss.
      await new Promise((r) => setTimeout(r, 0))
      let threw = ''
      try { a.fx.frame(1 / 60) } catch (e) { threw = e.message }
      const during = a.fx.stats().lost
      const found = new Promise((r) => layer.addEventListener('webglcontextrestored', r, { once: true }))
      ext.restoreContext()
      await found
      for (let i = 0; i < 5; i++) a.fx.frame(1 / 60)
      const out = { threw, during, after: differ(before, a.fx.pixels()), lost: a.fx.stats().lost }
      // This context is not one to keep for the next case.
      done(a)
      return out
    },
    check: (r) => r.threw === '' && r.during === true && r.lost === false && r.after.most <= 1 },

  { what: 'a low tone moves the bass and not the highs, a high tone the highs and not the bass, quiet music moves as much as loud, silence moves nothing, and with nothing to listen to there is no error',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const tone = (hz, loud = 0.5) => { let n = 0; return { samples: () => { const s = new Float32Array(1024); for (let i = 0; i < 1024; i++) s[i] = loud * Math.sin(2 * Math.PI * hz * (n + i) / 48000); n += 800; return s } } }
      const hear = (target, then) => {
        const a = card(32, 32, shapes)
        a.fx = effects(a.canvas, { manual: true })
        if (target !== undefined) a.fx.listenTo(target)
        for (let i = 0; i < 60; i++) a.fx.frame(1 / 60)
        if (then !== undefined) { a.fx.listenTo(then); for (let i = 0; i < 180; i++) a.fx.frame(1 / 60) }
        const out = { bass: a.fx.bass(), mids: a.fx.mids(), highs: a.fx.highs(), loudness: a.fx.loudness(), pulse: a.fx.pulse() }
        done(a)
        return out
      }
      return { nothing: hear(), low: hear(tone(70)), quietLow: hear(tone(70, 0.04)), high: hear(tone(6000)), middle: hear(tone(800)), silent: hear({ samples: () => new Float32Array(1024) }),
        stopped: hear(tone(70), null), broken: hear({ samples() { throw new Error('no') } }), level: hear({ level: () => 0.5 }), pair: hear({ samples: () => [tone(70).samples(), tone(70).samples()] }) }
    },
    check: (r) => {
      const quiet = (b) => b.bass < 0.01 && b.mids < 0.01 && b.highs < 0.01 && b.loudness < 0.01
      return quiet(r.nothing) && r.low.bass > 0.8 && r.low.highs < 0.05 && r.low.mids < 0.1 && r.high.highs > 0.8 && r.high.bass < 0.05 && r.middle.mids > 0.8 && r.middle.bass < 0.1 && r.middle.highs < 0.1
        && r.low.loudness > 0.5 && r.quietLow.bass > 0.8 && quiet(r.silent) && quiet(r.stopped) && quiet(r.broken) && quiet(r.level) && r.pair.bass > 0.8
    } },

  { what: 'a click every half second makes the pulse jump on each and fall away between them, and a setting tied to the bass follows it between the values given',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(32, 32, shapes)
      a.fx = effects(a.canvas, { manual: true })
      // A drum: a burst of 60 Hz that dies away, every half second, heard as the sound library gives it: the latest 1024 numbers.
      let t = 0
      const drum = { samples: () => Float32Array.from({ length: 1024 }, (_, i) => { const at = (t - (1024 - i) / 48000) % 0.5; return at >= 0 && at < 0.12 ? 0.8 * Math.exp(-at * 30) * Math.sin(2 * Math.PI * 60 * at) : 0 }) }
      a.fx.listenTo(drum)
      const g = a.fx.glow(0.3)
      a.fx.react(g, 'strength', 'bass', { from: 0.3, to: 1.2 })
      const pulses = [], strengths = []
      let jumps = 0, was = 0
      for (let i = 0; i < 240; i++) {
        t += 1 / 60
        a.fx.frame(1 / 60)
        const p = a.fx.pulse()
        if (p > 0.9 && was < 0.5) jumps++
        was = p
        pulses.push(p)
        strengths.push(g.strength)
      }
      done(a)
      return { jumps, least: Math.min(...pulses.slice(60)), strength: [Math.min(...strengths), Math.max(...strengths)] }
    },
    check: (r) => r.jumps >= 7 && r.jumps <= 9 && r.least < 0.15 && r.strength[0] >= 0.3 && r.strength[1] <= 1.2 && r.strength[1] > 0.7 },

  { what: 'a setting is a plain property, a function is asked every frame, an effect is something a dial can turn, and a wrong name or value is said in plain words',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(64, 64, shapes)
      a.fx = effects(a.canvas, { manual: true })
      const k = a.fx.kaleidoscope(6, { zoom: 2 })
      const out = { segments: k.segments, zoom: k.zoom, x: k.x, amount: k.amount, name: k.name }
      k.segments = 12
      k.set('angle', 30)
      let asked = 0
      k.zoom = () => { asked++; return 1.5 }
      a.fx.frame(1 / 60)
      out.after = [k.segments, k.get('angle'), k.zoom, asked > 0]
      out.describe = k.describe('segments')
      out.settings = k.settings
      out.snake = a.fx.zoomBlur(0.2).describe('strength').max
      const said = (fn) => { try { fn(); return '' } catch (e) { return e.message } }
      out.errors = [said(() => { k.segmnts = 3 }), said(() => { k.segments = 'many' }), said(() => a.fx.mirror('sideways')), said(() => a.fx.tint('notacolour')), said(() => a.fx.look('nope')),
        said(() => a.fx.colourCycle('nope')), said(() => a.fx.blur(1, 2, 3)), said(() => a.fx.react(k, 'zoom', 'treble'))]
      out.spellings = [typeof a.fx.colorCycle, typeof a.fx.bloom, a.fx.tint({ color: 'red' }).colour]
      done(a)
      return out
    },
    check: (r) => r.segments === 8 - 2 && r.zoom === 2 && r.x === 32 && r.amount === 1 && r.name === 'kaleidoscope' && r.after.join() === '12,30,1.5,true'
      && r.describe.min === 2 && r.describe.max === 32 && r.describe.kind === 'int' && r.describe.default === 8 && r.settings.includes('angle') && r.snake === 1
      && /no setting called "segmnts".*segments, angle, zoom/.test(r.errors[0]) && /is a number/.test(r.errors[1]) && /one of "left"/.test(r.errors[2]) && /not a colour/.test(r.errors[3])
      && /no look called "nope".*dream/.test(r.errors[4]) && /no palette called "nope".*rainbow/.test(r.errors[5]) && /was given 3 values and takes 1 \(radius\)/.test(r.errors[6]) && /bass, mids, highs/.test(r.errors[7])
      && r.spellings[0] === 'function' && r.spellings[1] === 'function' && r.spellings[2] === 'red' },

  { what: 'a shader of your own is given the picture, its settings and its own last frame, and a mistake in it is said with its line',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(32, 32, (g) => { g.fillStyle = '#ff8000'; g.fillRect(0, 0, 32, 32) })
      a.fx = effects(a.canvas, { manual: true })
      const s = a.fx.shader('vec4 effect(vec2 uv) {\n  vec4 c = texture(picture, uv);\n  return vec4(c.b + lift, c.g, c.r, 1.0) * vec4(shade, 1.0);\n}', { lift: [0.25, 0, 1], shade: 'white' })
      a.fx.frame(1 / 60)
      const swapped = at(a.fx.pixels(), 16, 16)
      s.lift = 0.5; s.shade = '#808080'
      a.fx.frame(1 / 60)
      const lifted = at(a.fx.pixels(), 16, 16)
      s.remove()
      // One that counts frames in its own last picture.
      a.fx.shader('vec4 effect(vec2 uv) { return vec4(texture(previous, uv).r + 0.1, 0.0, 0.0, 1.0); }')
      for (let i = 0; i < 5; i++) a.fx.frame(1 / 60)
      const counted = at(a.fx.pixels(), 16, 16)
      let said = ''
      try { a.fx.shader('vec4 effect(vec2 uv) {\n  return texture(picture, uv) * wrong;\n}') } catch (e) { said = e.message }
      let none = ''
      try { a.fx.shader('void main() {}') } catch (e) { none = e.message }
      done(a)
      return { swapped, lifted, counted, said, none }
    },
    check: (r) => near(r.swapped[0], 64, 2) && near(r.swapped[2], 255, 1) && near(r.lifted[0], 64, 2) && near(r.lifted[2], 128, 2) && near(r.counted[0], 128, 3)
      && /Your shader has a mistake/.test(r.said) && /line 2:/.test(r.said) && /wrong/.test(r.said) && !/\0/.test(r.said) && /vec4 effect\(vec2 uv\)/.test(r.none) },

  { what: 'at half quality the effects work on a quarter of the pixels and the picture is still the same picture; a look turns several effects on and off together',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const shot = (q) => {
        const a = card(200, 160, shapes)
        a.fx = effects(a.canvas, { manual: true })
        a.fx.effectsQuality(q)
        a.fx.blur(10); a.fx.kaleidoscope(6)
        a.fx.frame(1 / 60)
        const s = a.fx.stats(), layer = a.box.querySelectorAll('canvas')[1]
        // What is on the screen, at the screen's size.
        const full = card(200, 160)
        full.g.drawImage(layer, 0, 0, 200, 160)
        const out = { w: s.width, shown: layer.style.width, p: { width: 200, height: 160, data: full.g.getImageData(0, 0, 200, 160).data } }
        done(a, full)
        return out
      }
      const whole = shot(1), half = shot(0.5)
      const a = card(64, 64, shapes)
      a.fx = effects(a.canvas, { manual: true })
      const dream = a.fx.look('dream')
      const made = a.fx.stats().effects
      dream.off()
      a.fx.frame(1 / 60)
      const hidden = getComputedStyle(a.box.querySelectorAll('canvas')[1] || a.canvas).display
      dream.amount = 0.5
      const parts = [dream.glow.amount, typeof dream.vignette.strength]
      a.fx.clearEffects()
      const left = a.fx.stats().effects
      done(a)
      return { whole: whole.w, half: half.w, shown: half.shown, same: differ(whole.p, half.p).mean, made, hidden, parts, left }
    },
    check: (r) => r.whole === 200 && r.half === 100 && r.shown === '200px' && r.same < 4 && r.made === 3 && r.parts.join() === '0.5,number' && r.left === 0 },
  { what: 'a canvas a host lays over the scene as part of its picture (the old scene, during a transition) goes through the effects with it, and the effects are shown over both',
    run: async () => {
      const { effects } = await import('/visualfx.js')
      const a = card(64, 64, (g) => { g.fillStyle = 'rgb(255,0,0)'; g.fillRect(0, 0, 64, 64) })
      let over = null
      a.fx = effects(a.canvas, { manual: true, under: () => over })
      a.fx.invert()
      a.fx.frame(1 / 60)
      const alone = [at(a.fx.pixels(), 16, 32), at(a.fx.pixels(), 48, 32)]
      // The left half of the old picture, half gone: blue at half strength over the red.
      over = Object.assign(document.createElement('canvas'), { width: 64, height: 64 })
      over.style.cssText = 'position:absolute;left:0;top:0;width:64px;height:64px'
      const g = over.getContext('2d'); g.globalAlpha = 0.5; g.fillStyle = 'rgb(0,0,255)'; g.fillRect(0, 0, 32, 64)
      a.canvas.after(over)
      a.fx.frame(1 / 60)
      const during = [at(a.fx.pixels(), 16, 32), at(a.fx.pixels(), 48, 32)]
      const order = [...a.box.querySelectorAll('canvas')].map((c) => (c === a.canvas ? 'scene' : c === over ? 'old' : 'effects')).join()
      over.remove()
      a.fx.frame(1 / 60)
      const after = at(a.fx.pixels(), 16, 32), then = [...a.box.querySelectorAll('canvas')].length
      done(a)
      return { alone, during, order, after, then }
    },
    check: (r) => {
      const is = (c, to) => c.every((v, i) => near(v, to[i], 2))
      return is(r.alone[0], [0, 255, 255]) && is(r.during[0], [127, 255, 127]) && is(r.during[1], [0, 255, 255]) && r.order === 'scene,old,effects' && is(r.after, [0, 255, 255]) && r.then === 2
    } },

  { what: 'every effect and every look there is runs, changes the picture, leaves no error and is the same picture when the scene is stepped again',
    run: async () => {
      const { effects, effectNames, lookNames } = await import('/visualfx.js')
      const table = effects.definitions().effects
      const bad = []
      let count = 0
      const film = (name) => {
        const a = card(320, 240, table[name] && table[name].backdrop ? (g) => { g.fillStyle = 'gold'; g.fillRect(10, 10, 20, 20) } : shapes)
        a.fx = effects(a.canvas, { manual: true })
        let n = 0
        a.fx.listenTo({ samples: () => Float32Array.from({ length: 1024 }, (_, i) => { const t = (n + i) / 48000; return 0.4 * Math.sin(t * 440) * Math.exp(-((t * 4) % 1) * 5) + 0.25 * Math.sin(t * 2800) }) })
        const before = a.fx.pixels()
        if (name.startsWith('look:')) a.fx.look(name.slice(5)); else a.fx[name]()
        for (let i = 0; i < 8; i++) { n += 800; a.fx.frame(1 / 60) }
        const after = a.fx.pixels()
        const out = { changed: differ(before, after).mean, sum: sum(after) }
        done(a)
        return out
      }
      for (const name of [...effectNames(), ...lookNames().map((l) => 'look:' + l)]) {
        count++
        try {
          const one = film(name), two = film(name)
          // Trails and a held frame change nothing in a picture that is standing still.
          if (one.changed < 0.02 && !['trails', 'stutter', 'beatFlash', 'bassShake', 'lightning', 'dust'].includes(name)) bad.push(name + ' changed nothing')
          if (one.sum !== two.sum) bad.push(name + ' is not the same twice')
        } catch (e) { bad.push(name + ': ' + e.message.slice(0, 200)) }
      }
      return { bad, count }
    },
    check: (r) => r.bad.length === 0 && r.count > 100 },
]

// --- scenes run by pictures.js, with the effects given to a scene as its other functions are
const play = (page, source) => page.evaluate(async ({ source }) => {
  const { runScene } = await import('/pictures/pictures.js')
  window.result = undefined
  window.scene?.stop()
  document.getElementById('s').replaceChildren()
  return new Promise((done) => {
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', onError: (message, line) => done({ error: message, line }) })
    const look = () => (window.result !== undefined ? done(window.result) : setTimeout(look, 20))
    look()
    setTimeout(() => done({ error: 'the scene left no result' }), 12000)
  })
}, { source })
const layerOf = `document.querySelector('#s canvas[data-effects-layer]')`
const scenes = [
  { what: 'a scene that uses no effect is not sent the library at all',
    source: `function draw() { background("navy"); circle(100, 100, 30, "gold") }\nawait frame(); await frame(); window.result = { layers: document.querySelectorAll("#s canvas").length }`,
    check: (r, asked) => r.layers === 1 && !asked.some((u) => /visualfx/.test(u)) },
  { what: 'a scene that calls kaleidoscope() is given it with nothing to load, in either spelling, and its picture is on a canvas over the scene\'s, the same size',
    source: `let n = 0\nfunction draw() { background("black"); circle(60 + n++, 60, 30, "gold") }\nconst k = kaleidoscope(6)\nzoom_blur(0.1)\nfor (let i = 0; i < 4; i++) await frame()
const layer = ${layerOf}
window.result = { layers: document.querySelectorAll("#s canvas").length, w: layer.width, h: layer.height, cw: canvas.width, ch: canvas.height, left: layer.offsetLeft === canvas.offsetLeft, shown: layer.style.display, segments: k.segments }`,
    check: (r, asked) => r.layers === 2 && r.w === r.cw && r.h === r.ch && r.left && r.shown === 'block' && r.segments === 6 && asked.some((u) => /\/pictures\/visualfx\/visualfx\.js/.test(u)) },
  { what: 'a dial turns an effect\'s setting, takes its range from the effect, and is drawn over the effects, not under them',
    source: `function draw() { background("black"); circle(200, 150, 60, "gold") }\nconst b = blur(4)\nconst d = dial("radius", b, "radius")\nfor (let i = 0; i < 4; i++) await frame()\nd.value = 20\nawait frame()
const all = [...document.querySelectorAll("#s canvas")]
window.result = { radius: b.radius, min: d.min, max: d.max, order: all.map((c) => c.dataset.effectsLayer !== undefined ? "effects" : c.dataset.dialsLayer !== undefined ? "dials" : "scene").join() }`,
    check: (r) => r.radius === 20 && r.min === 0 && r.max === 200 && r.order === 'scene,effects,dials' },
  { what: 'the effects see the frame the scene has just drawn, not the one before, and their clock is the scene\'s',
    source: `const { effects } = await use("/pictures/visualfx/visualfx.js")\nlet n = 0, t = 0, began = null\nconst seen = []\nfunction update(dt) { t += dt }\nfunction draw() { n++; background(n % 2 ? "rgb(255,0,0)" : "rgb(0,0,255)") }\ninvert()
effects(canvas).onFrame((fx) => { if (!n) return; seen.push((n % 2 ? "red" : "blue") + ">" + (fx.pixels().data[0] < 128 ? "cyan" : "yellow")); if (seen.length === 1) began = [t, fx.stats().time]; if (seen.length === 6) window.result = { seen, t: t - began[0], clock: fx.stats().time - began[1] } })`,
    // The effects' clock may have begun a frame before the scene's own functions did: from then on they keep the same time.
    check: (r) => r.seen.every((s) => s === 'red>cyan' || s === 'blue>yellow') && new Set(r.seen).size === 2 && Math.abs(r.t - r.clock) < 1e-9 && r.t > 0 },
  { what: 'a scene that is stopped takes its effects with it: the canvas over the scene goes and nothing is left on the graphics card',
    source: `function draw() { background("black"); circle(100, 100, 30, "gold") }\nglow(1); trails(0.5); blur(3)\nfor (let i = 0; i < 4; i++) await frame()\nwindow.kept = ${layerOf}\nwindow.result = { layers: document.querySelectorAll("#s canvas").length }`,
    after: async (page) => page.evaluate(async () => { window.scene.stop(); await new Promise((r) => setTimeout(r, 50)); return { layers: document.querySelectorAll('#s canvas[data-effects-layer]').length, attached: window.kept.isConnected } }),
    check: (r, asked, after) => r.layers === 2 && after.layers === 0 && after.attached === false },
  { what: 'a page with no host to say when the scene has drawn (the library loaded by the scene itself) still shows each frame\'s own picture',
    source: `const { invert, effects } = await use("/visualfx.js")\nlet n = 0\nconst seen = []\nfunction draw() { n++; background(n % 2 ? "rgb(255,0,0)" : "rgb(0,0,255)") }\ninvert()
effects(canvas).onFrame((fx) => { seen.push((n % 2 ? "red" : "blue") + ">" + (fx.pixels().data[0] < 128 ? "cyan" : "yellow")); if (seen.length === 8) window.result = { seen, n } })`,
    check: (r, asked) => r.seen.every((s) => s === 'red>cyan' || s === 'blue>yellow') && new Set(r.seen).size === 2 && r.n === 8 && !asked.some((u) => /pictures\/visualfx/.test(u)) },
  { what: 'a 3D scene\'s picture goes through the effects too',
    source: `const { effects } = await use("/pictures/visualfx/visualfx.js")\nconst renderer = new THREE.WebGLRenderer({ canvas })\nconst scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 10)\ncamera.position.z = 3\nscene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "red" })))
function draw() { renderer.render(scene, camera) }\nhue(120)\nlet n = 0\neffects(canvas).onFrame((fx) => { if (++n < 3) return; const p = fx.pixels(), at = (x, y) => [...p.data.slice((y * p.width + x) * 4, (y * p.width + x) * 4 + 3)]; window.result = { middle: at(p.width >> 1, p.height >> 1), corner: at(2, 2) } })`,
    check: (r) => r.middle[1] > 240 && r.middle[0] < 15 && r.corner[0] + r.corner[1] + r.corner[2] < 10 },
  { what: 'renderFrames steps the page a frame at a time, each exactly a thirtieth of a second after the last, and gives every picture with its effects; then the page has its own clock back',
    source: `const { renderFrames, effects } = await use("/pictures/visualfx/visualfx.js")\nlet t = 0\nconst dts = []\nfunction update(dt) { t += dt; dts.push(dt) }\nfunction draw() { background("black"); rect(t * 120, 0, 40, 300, "rgb(255,0,0)") }\ninvert()
setTimeout(async () => {
  await new Promise((r) => setTimeout(r, 200))
  const edges = []
  let at = 0
  await renderFrames({ frames: 12, fps: 30, onFrame: async (picture, n, time) => {
    const row = picture.getContext("2d").getImageData(0, 5, picture.width, 1).data
    let x = 0; while (x < picture.width && row[x * 4] > 128) x++
    edges.push(x)
    if (n === 0) at = dts.length - 1
    if (n === 5) await new Promise((r) => setTimeout(r, 120))
  } })
  const steps = dts.slice(at, at + 12)
  const before = dts.length
  await new Promise((r) => setTimeout(r, 300))
  window.result = { edges, steps, after: dts.length - before, native: /native code/.test(String(window.requestAnimationFrame)) }
}, 0)`,
    // The bar moves 120 points a second: 4 points a frame at thirty frames a second, whatever the real time between them.
    check: (r) => r.edges.length === 12 && r.edges.slice(1).every((x, i) => Math.abs(x - r.edges[i] - 4) <= 1) && r.steps.length === 12 && r.steps.every((d) => Math.abs(d - 1 / 30) < 1e-9) && r.after > 3 && r.native },
  { what: 'recordVideo gives a WebM film a player can open, of the right size and length, or says plainly that this browser cannot make one',
    source: `const { recordVideo } = await use("/pictures/visualfx/visualfx.js")\nlet t = 0\nfunction update(dt) { t += dt }\nfunction draw() { background("navy"); circle(100 + t * 100, 150, 40, "gold") }\nglow(1)
setTimeout(async () => {
  try {
    const film = await recordVideo({ seconds: 1, fps: 30 })
    const head = [...new Uint8Array(await film.slice(0, 4).arrayBuffer())].join()
    const video = document.createElement("video")
    if (!video.canPlayType('video/webm; codecs="' + film.codec + '"')) { window.result = { unplayable: true, type: film.type, size: film.size, head }; return }
    video.muted = true
    video.src = URL.createObjectURL(film)
    const opened = await new Promise((done) => { video.onloadeddata = () => done(true); video.onerror = () => done(false); setTimeout(() => done(false), 4000) })
    // Playwright's WebKit says it can play WebM and then does not open one from memory. The file it encoded is
    // sound all the same (ffprobe reads it: VP9, sixty frames in two seconds), so there only the file is asked for.
    if (!opened) { window.result = { unplayable: true, type: film.type, size: film.size, head }; return }
    await new Promise((done) => { video.onseeked = done; video.currentTime = 0.5 })
    const g = Object.assign(document.createElement("canvas"), { width: video.videoWidth, height: video.videoHeight }).getContext("2d")
    g.drawImage(video, 0, 0)
    window.result = { type: film.type, size: film.size, head, w: video.videoWidth, h: video.videoHeight, cw: canvas.width, ch: canvas.height, seconds: video.duration, corner: [...g.getImageData(4, 4, 1, 1).data], ball: [...g.getImageData(150, 150, 1, 1).data] }
  } catch (e) { window.result = { said: e.message } }
}, 0)`,
    check: (r) => (r.said ? /cannot make a video file|cannot encode/.test(r.said) && /renderFrames\(\)/.test(r.said)
      // A browser that can encode a WebM and cannot play one (Safari's engine here) is asked only for the file.
      : r.type === 'video/webm' && r.size > 2000 && r.head === '26,69,223,163' && (r.unplayable || (r.w === (r.cw & ~1) && r.h === (r.ch & ~1) && Math.abs(r.seconds - 1) < 0.05 && r.corner[2] > 90 && r.corner[0] < 40 && r.ball[0] > 200 && r.ball[2] < 120))) },
  { what: 'a stepped sound is moved with the frames, a frame\'s worth of samples for each, and recordVideo puts it in the film as Opus with every sound where its frame is and the film\'s own length (or beside it as a WAV file, where the browser cannot encode Opus)',
    // A stepped sound of the test's own, shaped like synths.js's stepped player: a short click each time the clock passes a half second.
    source: `const { renderFrames, recordVideo } = await use("/pictures/visualfx/visualfx.js")\nfunction draw() { background("navy") }
function stepper() {
  let start = 0, made = 0
  const heard = new Set(), rate = 48000
  return { stepped: { sampleRate: rate, fps: 30, get samples() { return made }, startAt(s) { start = s - made / rate },
    take() { return { left: new Float32Array(0), right: new Float32Array(0), length: 0, sampleRate: rate } },
    onAdvance(fn) { heard.add(fn); return () => heard.delete(fn) },
    async advance(seconds) {
      const to = Math.round((seconds - start) * rate), count = to - made
      if (count <= 0) return 0
      const left = new Float32Array(count)
      for (let i = 0; i < count; i++) { const k = (made + i) % 24000; if (k < 240) left[i] = 0.9 * Math.sin(k * 0.5) }
      made = to
      for (const fn of heard) fn(left, left.slice(), rate)
      return count
    } } }
}
setTimeout(async () => {
  try {
    const each = []
    await renderFrames({ frames: 7, fps: 30, sound: stepper(), onSound: (left, right, rate, frame) => each.push([left.length, right.length, rate, frame]) })
    const odd = []
    await renderFrames({ frames: 1001, fps: 30000 / 1001, sound: stepper(), onFrame: () => {}, onSound: (left) => odd.push(left.length) })
    const film = await recordVideo({ seconds: 2, fps: 30, sound: stepper() })
    const silent = await recordVideo({ seconds: 0.5, fps: 30 })
    let found = null
    if (film.audio === "opus") {
      try {
        const sound = await new OfflineAudioContext(2, 48000, 48000).decodeAudioData(await film.arrayBuffer())
        const samples = sound.getChannelData(0), starts = []
        let quiet = 2000
        for (let i = 0; i < samples.length; i++) { if (Math.abs(samples[i]) > 0.25) { if (quiet >= 2000) starts.push(i); quiet = 0 } else quiet++ }
        found = { length: sound.length, rate: sound.sampleRate, starts }
      } catch (e) { found = { undecodable: String(e && e.message || e) } }
    }
    window.result = { each, odd: [odd.length, odd.reduce((a, b) => a + b, 0), Math.min(...odd), Math.max(...odd)], audio: film.audio, samples: film.samples, rate: film.sampleRate, wav: film.sound ? film.sound.size : 0, found, size: film.size, silent: [silent.audio, silent.samples, !!silent.sound] }
  } catch (e) { window.result = { said: e.message } }
}, 0)`,
    check: (r) => (r.said ? /cannot make a video file|cannot encode/.test(r.said)
      // Seven frames at thirty a second: 1600 samples after each. 1001 frames at 29.97 (1601.6 samples each): 1 603 202 samples, 1601 or 1602 a frame.
      : r.each.length === 7 && r.each.every(([left, right, rate, frame], i) => left === 1600 && right === 1600 && rate === 48000 && frame === i) && r.odd[0] === 1001 && r.odd[1] === 1603202 && r.odd[2] === 1601 && r.odd[3] === 1602
        && r.samples === 96000 && r.rate === 48000 && r.silent[0] === null && r.silent[1] === 0 && !r.silent[2]
        && (r.audio === 'opus'
          // Where the browser can read its own film back, each click is where it was made (Opus keeps the place to within a millisecond) and the sound is as long as the film.
          ? (r.found.undecodable ? true : r.found.starts.length === 4 && r.found.starts.every((at, i) => Math.abs(at - i * 24000) <= 48) && Math.abs(r.found.length - 96000) <= 1)
          : r.audio === 'wav' && r.wav === 44 + 96000 * 4)) },
]

let failed = 0, ran = 0
const check = (browser, what, ok, got) => {
  ran++
  if (ok) return console.log(`  ok   ${browser}: ${what}`)
  failed++
  console.log(`  FAIL ${browser}: ${what}\n       ${JSON.stringify(got)?.slice(0, 900)}`)
}
const only = process.argv.slice(2).filter((a) => !a.startsWith('-')).join(' ')
for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await playwright[name].launch(name === 'chromium' ? { args: ['--mute-audio'] } : {}) } catch (e) { console.log(`     ${name}: not installed, skipped`); continue }
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(TOOLS)
  await page.goto(`${at}/blank.html`)
  for (const c of cases) {
    if (only && !c.what.includes(only)) continue
    let got
    try { got = await page.evaluate(c.run) } catch (e) { got = { error: e.message.split('\n')[0] } }
    check(name, c.what, !got.error && !!c.check(got), got)
  }
  const asked = []
  page.on('request', (r) => asked.push(r.url()))
  for (const s of scenes) {
    if (only && !s.what.includes(only)) continue
    await page.goto(`${at}/scene.html`)
    asked.length = 0
    const got = await play(page, (s.prelude || '') + s.source)
    const after = s.after ? await s.after(page) : null
    check(name, s.what, !got.error && !!s.check(got, asked, after), after ? { got, after } : got)
  }
  check(name, 'no case left an error on its page', errors.length === 0, errors)
  await browser.close()
}
// The page of every effect is written from the table: it must be what the table gives now, with a picture for each.
if (!only) {
  let said = ''
  try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'docs.mjs'), '--check'], { encoding: 'utf8' }) } catch (e) { said = (e.stdout || e.message).trim() }
  check('docs', 'docs/effects.md, docs/effects.json and the pictures are what the table of effects gives', said === '', said)
}
close()
console.log(failed ? `\n${failed} of ${ran} failed` : `\nall ${ran} passed`)
process.exit(failed ? 1 : 0)
