// A quick look while working: every effect compiled and run once on a test card, in both browsers.
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { serve, ROOT } from './serve.mjs'
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { at, close } = await serve({ '/blank.html': '<!doctype html><body style="margin:0;background:#222">' })
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
await mkdir(join(ROOT, 'shots'), { recursive: true })
for (const name of ['chromium', 'webkit']) {
  const browser = await playwright[name].launch(name === 'chromium' ? { args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : {})
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  page.on('console', (m) => console.log(`   ${name} console:`, m.text().slice(0, 600)))
  page.on('pageerror', (e) => console.log(`   ${name} error:`, e.message.slice(0, 600)))
  await page.goto(at + '/blank.html')
  const out = await page.evaluate(async (only) => {
    const lib = await import('/vfx.js')
    const names = lib.effectNames().filter((n) => !only.length || only.includes(n))
    const said = []
    for (const n of names) {
      const box = document.createElement('div')
      box.style.cssText = 'position:relative;display:inline-block;width:280px;height:200px;margin:4px'
      const c = document.createElement('canvas')
      c.width = 560; c.height = 400; c.style.cssText = 'width:280px;height:200px;display:block'
      box.append(c); document.body.append(box)
      const g = c.getContext('2d'); g.scale(2, 2)
      const backdrop = ['plasma', 'starfield', 'metaballs', 'flow'].includes(n)
      if (!backdrop) { const grad = g.createLinearGradient(0, 0, 280, 200); grad.addColorStop(0, '#102040'); grad.addColorStop(1, '#401030'); g.fillStyle = grad; g.fillRect(0, 0, 280, 200) }
      const cols = ['gold', 'deepskyblue', 'tomato', 'lime', 'white', 'magenta']
      for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.beginPath(); g.arc(40 + i * 38, 60 + 50 * Math.sin(i * 1.3), 12 + i * 3, 0, 7); g.fill() }
      g.fillStyle = 'white'; g.font = 'bold 34px system-ui'; g.fillText(n, 20, 170)
      g.strokeStyle = 'orange'; g.lineWidth = 3; g.strokeRect(200, 20, 60, 40)
      try {
        const fx = lib.effects(c, { manual: true })
        fx[n]()
        for (let i = 0; i < 20; i++) fx.frame(1 / 30)
        const s = fx.stats(), px = fx.pixels()
        fx.close()
        // The picture is kept on the plain canvas: a page may hold only a few of the graphics card's.
        g.setTransform(1, 0, 0, 1, 0, 0)
        g.putImageData(new ImageData(new Uint8ClampedArray(px.data.buffer), px.width, px.height), 0, 0)
        said.push(`${n}: passes ${s.passes} tex ${s.textures}`)
      } catch (e) { said.push(`${n}: FAILED ${e.message}`) }
    }
    return said
  }, only)
  console.log(name, out.filter((l) => /FAILED/.test(l)).join('\n') || 'all compiled', `(${out.length})`)
  await new Promise((r) => setTimeout(r, 300))
  await page.screenshot({ path: join(ROOT, 'shots', `try-${name}.png`), fullPage: true })
  await browser.close()
}
close()
