#!/usr/bin/env node
/**
 * One picture of every effect on the same small scene, for the README: docs/images/effects.jpg.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/gallery.mjs
 */
import { execFileSync } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { serve, ROOT } from './serve.mjs'

const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { at, close } = await serve({ '/blank.html': '<!doctype html><body style="margin:0;background:#16181d;font:600 13px system-ui;color:#eef0f4"><div id="all" style="display:grid;grid-template-columns:repeat(8,200px);gap:6px;padding:6px;width:max-content">' })
const browser = await playwright.chromium.launch({ args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1680, height: 900 }, deviceScaleFactor: 2 })
page.on('console', (m) => { if (m.type() === 'error') console.log(m.text()) })
page.on('pageerror', (e) => console.log(e.message.slice(0, 500)))
await page.goto(`${at}/blank.html`)
await page.evaluate(async () => {
  const lib = await import('/vfx.js')
  const table = lib.effects.definitions().effects
  const BACKDROPS = Object.keys(table).filter((n) => table[n].backdrop)
  for (const n of [...lib.effectNames(), ...lib.lookNames().map((l) => `look:${l}`)]) {
    const cell = document.createElement('div')
    const c = Object.assign(document.createElement('canvas'), { width: 400, height: 260 })
    c.style.cssText = 'width:200px;height:130px;display:block;border-radius:6px'
    cell.append(c, Object.assign(document.createElement('div'), { textContent: n.startsWith('look:') ? `look("${n.slice(5)}")` : n, style: 'padding:3px 2px 6px' }))
    document.getElementById('all').append(cell)
    const g = c.getContext('2d')
    g.scale(2, 2)
    if (!BACKDROPS.includes(n)) { const sky = g.createLinearGradient(0, 0, 200, 130); sky.addColorStop(0, '#0b1030'); sky.addColorStop(1, '#3a0d3a'); g.fillStyle = sky; g.fillRect(0, 0, 200, 130) }
    const cols = ['gold', 'deepskyblue', 'tomato', 'springgreen', 'white', 'orchid', 'darkorange']
    let s = 5
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
    for (let i = 0; i < (BACKDROPS.includes(n) ? 4 : 16); i++) {
      g.fillStyle = g.strokeStyle = cols[i % cols.length]
      const x = 12 + r() * 176, y = 12 + r() * 106, size = 6 + r() * 14
      g.beginPath()
      if (i % 3 === 0) { g.lineWidth = 3; g.arc(x, y, size, 0, 7); g.stroke() } else if (i % 3 === 1) { g.arc(x, y, size * 0.8, 0, 7); g.fill() } else g.fillRect(x - size * 0.7, y - size * 0.7, size * 1.4, size * 1.4)
    }
    g.fillStyle = 'white'; g.font = 'bold 26px system-ui'; g.fillText('hello', 104, 76)
    const fx = lib.effects(c, { manual: true })
    try { if (n.startsWith('look:')) fx.look(n.slice(5)); else fx[n]() } catch (e) { console.error(n + ': ' + e.message.slice(0, 400)) }
    // A made-up tune, so the effects that draw the music have something to draw.
    let heard = 0
    fx.listenTo({ samples: () => Float32Array.from({ length: 1024 }, (_, i) => { const t = (heard + i) / 48000; return 0.4 * Math.sin(t * 440) * Math.exp(-((t * 4) % 1) * 5) + 0.25 * Math.sin(t * 2800) + 0.15 * Math.sin(t * 17000) }) })
    for (let i = 0; i < 24; i++) { heard += 1600; try { fx.frame(1 / 30) } catch (e) { console.error(n + ': ' + e.message.slice(0, 400)); break } }
    const p = fx.pixels()
    fx.close()
    // Kept on the plain canvas: a page may hold only a few of the graphics card's.
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.putImageData(new ImageData(new Uint8ClampedArray(p.data.buffer), p.width, p.height), 0, 0)
  }
})
const png = join(ROOT, 'docs', 'images', 'effects.png')
await (await page.$('#all')).screenshot({ path: png })
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '2400', png, '--out', join(ROOT, 'docs', 'images', 'effects.jpg')], { stdio: 'ignore' })
await rm(png)
await browser.close()
close()
console.log('docs/images/effects.jpg')
