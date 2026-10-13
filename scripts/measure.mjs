#!/usr/bin/env node
/**
 * What the effects cost on this computer: milliseconds a frame for a few chains, at a tablet-sized picture
 * (1180 x 820 points) with one and with two real pixels to the point. Each frame the scene's canvas is
 * drawn on, handed to the graphics card and run through the chain, and the card is made to finish before
 * the clock is read. It is a measure of this machine, not of an iPad: there, run it on the iPad.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/measure.mjs
 */
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { serve } from './serve.mjs'

const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { at, close } = await serve({ '/blank.html': '<!doctype html><body style="margin:0">' })
// --size=390x844 --ratio=3 is a phone held upright; with neither it is a tablet on its side, at one and two pixels to the point.
const [W, H] = (process.argv.find((a) => a.startsWith('--size=')) || '--size=1180x820').slice(7).split('x').map(Number)
const RATIOS = process.argv.find((a) => a.startsWith('--ratio=')) ? [Number(process.argv.find((a) => a.startsWith('--ratio=')).slice(8))] : [1, 2]
const ONLY = (process.argv.find((a) => a.startsWith('--browser=')) || '').slice(10)
const CHAINS = {
  'nothing (the scene alone)': [],
  'invert (the hand-over and one pass)': [['invert']],
  'kaleidoscope': [['kaleidoscope', 8]],
  'blur 8': [['blur', 8]],
  'blur 40': [['blur', 40]],
  'glow': [['glow', 0.8]],
  'trails': [['trails', 0.5, { zoom: 1.5, spin: 20 }]],
  'kaleidoscope, trails, glow (the visualiser)': [['kaleidoscope', 6], ['trails', 0.7, { zoom: 1.5 }], ['glow', 0.7], ['vignette']],
  'look("vhs"): six effects': [['look', 'vhs']],
  'look("arcade"): glow and crt': [['look', 'arcade']],
  'metaballs, wobble, glow (the lava lamp)': [['metaballs'], ['wobble', 8], ['glow', 0.6], ['vignette']],
  'flow backdrop': [['flow']],
}
for (const name of ['chromium', 'webkit'].filter((n) => !ONLY || n === ONLY)) {
  let browser
  try { browser = await playwright[name].launch(name === 'chromium' ? { args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : {}) } catch (e) { continue }
  for (const ratio of RATIOS) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: ratio })
    await page.goto(`${at}/blank.html`)
    const got = await page.evaluate(async ({ chains, ratio, quality, W, H }) => {
      const { effects } = await import('/visualfx.js')
      const out = {}
      for (const [what, chain] of Object.entries(chains)) {
        const canvas = Object.assign(document.createElement('canvas'), { width: W * ratio, height: H * ratio })
        canvas.style.cssText = `display:block;width:${W}px;height:${H}px`
        document.body.replaceChildren(canvas)
        const g = canvas.getContext('2d')
        g.scale(ratio, ratio)
        const fx = effects(canvas, { manual: true })
        fx.effectsQuality(quality)
        for (const [effect, ...args] of chain) fx[effect](...args)
        const one = new Uint8Array(4)
        const frame = (i) => {
          g.fillStyle = '#0a0a1e'; g.fillRect(0, 0, W, H)
          for (let k = 0; k < 40; k++) { g.fillStyle = `hsl(${k * 31},90%,60%)`; g.beginPath(); g.arc(W / 2 + W * 0.34 * Math.cos(i * 0.03 + k), H / 2 + H * 0.36 * Math.sin(i * 0.041 + k * 2), 12 + k % 9 * 4, 0, 7); g.fill() }
          fx.frame(1 / 60)
          const gl = fx.pipeline.gl
          // Reading a pixel back makes the card finish everything it was asked: the 2D canvas too, with no effects.
          if (gl) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one)
          else g.getImageData(0, 0, 1, 1)
        }
        for (let i = 0; i < 20; i++) frame(i)
        const t0 = performance.now()
        for (let i = 0; i < 60; i++) frame(i + 20)
        out[what] = { ms: (performance.now() - t0) / 60, passes: fx.stats().passes }
        fx.close()
      }
      return out
    }, { chains: CHAINS, ratio, quality: process.argv.includes('--auto') ? 'auto' : 1, W, H })
    const base = got['nothing (the scene alone)'].ms
    console.log(`\n${name}, ${W * ratio} x ${H * ratio} pixels (the scene's own drawing: ${base.toFixed(2)} ms a frame)`)
    for (const [what, r] of Object.entries(got)) if (r.passes) console.log(`  ${(r.ms - base).toFixed(2).padStart(6)} ms  ${String(r.passes).padStart(2)} passes  ${what}`)
    await page.close()
  }
  await browser.close()
}
close()
