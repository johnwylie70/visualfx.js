#!/usr/bin/env node
/**
 * Pictures of the demos, taken from the demos themselves running in a real browser: each demo's
 * thumbnail.jpg (800 x 500, as Circuitry's are) and the README's pictures in docs/images.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/shots.mjs [demo …]
 *
 * A demo that draws with the mouse is given a mouse. No sound is made: nothing clicks the page of one that plays.
 */
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { serve, ROOT } from './serve.mjs'

const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { at, close } = await serve()
// How long each is left to run before its picture, and anything it needs done to it first.
const WAIT = { tunnel: 5, 'finger-paint': 6, 'lava-lamp': 3, visualiser: 4, arcade: 2.6, 'glitch-title': 2.2 }
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const demos = (await readdir(join(ROOT, 'demos'))).filter((d) => existsSync(join(ROOT, 'demos', d, 'main.js')) && (!only.length || only.includes(d)))
await mkdir(join(ROOT, 'docs', 'images'), { recursive: true })
const browser = await playwright.chromium.launch({ args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
let bad = 0
for (const demo of demos) {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => { bad++; console.log(`  ${demo}: ${e.message}`) })
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  ${demo} says: ${m.text().slice(0, 300)}`) })
  await page.goto(`${at}/demo.html?d=demos/${demo}/main.js`)
  await page.waitForTimeout((WAIT[demo] || 3) * 1000)
  const problems = await page.evaluate(() => window.problems)
  if (problems.length) { bad++; console.log(`  ${demo}: ${problems.join('; ')}`) }
  const png = join(ROOT, 'docs', 'images', `${demo}.png`)
  await page.screenshot({ path: png })
  const jpg = join(ROOT, 'demos', demo, 'thumbnail.jpg')
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-z', '500', '800', png, '--out', jpg], { stdio: 'ignore' })
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-z', '500', '800', png, '--out', join(ROOT, 'docs', 'images', `${demo}.jpg`)], { stdio: 'ignore' })
  await rm(png)
  console.log(`  ${demo}: demos/${demo}/thumbnail.jpg`)
  await page.close()
}
await browser.close()
close()
process.exit(bad ? 1 : 0)
