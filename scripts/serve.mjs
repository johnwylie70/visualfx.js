/**
 * The little server the tests and the pictures are made with: this repository's files, and pictures.js
 * from the folder beside it (or PICTURES=/path/to/pictures.js) under /pictures/, GIVEN THE EFFECTS:
 * its text is changed on the way out as docs/pictures.js.md says it should be changed for good, and
 * /pictures/vfx/vfx.js is this repository's vfx.js. So a scene here uses `glow(1)` with nothing to load.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const PICTURES = resolve(process.env.PICTURES || join(ROOT, '..', 'pictures.js'))
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.py': 'text/plain' }

/** pictures.js with the effects wired in: the four changes of docs/pictures.js.md, made to its text. */
export async function picturesWithEffects() {
  const { effectNames } = await import('./names.mjs')
  let text = await readFile(join(PICTURES, 'pictures.js'), 'utf8')
  const change = (from, to) => {
    if (!text.includes(from)) throw new Error(`pictures.js has changed: it no longer has\n${from}\nso docs/pictures.js.md and scripts/serve.mjs must be brought up to date`)
    text = text.replace(from, to)
  }
  change('/* DIAL_NAMES:END */', `/* DIAL_NAMES:END */\n/* EFFECT_NAMES:BEGIN */\nconst EFFECT_NAMES = ${JSON.stringify(await effectNames())}\n/* EFFECT_NAMES:END */`)
  change(`const SIBLINGS = { sound: 'sound/synths.js', dials: 'dials/dials.js' }`, `const SIBLINGS = { sound: 'sound/synths.js', dials: 'dials/dials.js', effects: 'vfx/vfx.js' }`)
  change(`const [{ THREE, addons }, soundLib, controlsLib] = await Promise.all([is3D ? loadThree() : {}, wantsSound && loadSibling('sound'), wantsControls && loadSibling('dials')])`,
    `const wantsEffects = usesAny(code, EFFECT_NAMES)\n      const [{ THREE, addons }, soundLib, controlsLib, effectsLib] = await Promise.all([is3D ? loadThree() : {}, wantsSound && loadSibling('sound'), wantsControls && loadSibling('dials'), wantsEffects && loadSibling('effects')])`)
  change(`      let last = 0\n      let counted = 0`, `      // --- EFFECTS (glow, trails, kaleidoscope…): run by the graphics card over what the scene drew, each frame after its draw.
      let fx = null
      if (effectsLib) {
        fx = effectsLib.effects(canvas, { fresh: true, manual: true, sound: sound ? () => sound.soundOutput() : null })
        cleanup.push(() => fx.close())
        for (const n of bothSpellings(EFFECT_NAMES)) if (!(n in more)) more[n] = fx[n] ?? fx[camel(n)]
      }
      let last = 0\n      let counted = 0`)
  change(`          call(hooks.draw)\n        }\n        const due = waiting`, `          call(hooks.draw)\n        }\n        if (fx) fx.frame(dt)\n        const due = waiting`)
  return text
}

/** A page that runs one scene full size: /demo.html?d=demos/tunnel/main.js */
const DEMO = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;overflow:hidden;background:#000"><div id="s" style="position:absolute;inset:0"></div>
<script type="module">import { runScene } from '/pictures/pictures.js'
window.problems = []
window.scene = runScene(document.getElementById('s'), { src: new URLSearchParams(location.search).get('d'), keyboard: true, onError: (m, line) => window.problems.push(line ? 'line ' + line + ': ' + m : m) })</script>`

export async function serve(pages = {}) {
  pages = { '/demo.html': DEMO, ...pages }
  let pictures = null
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (pages[path]) return res.writeHead(200, { 'content-type': 'text/html' }).end(pages[path])
    try {
      let body
      if (path === '/pictures/pictures.js') body = pictures ??= await picturesWithEffects()
      else if (path === '/pictures/vfx/vfx.js') body = await readFile(join(ROOT, 'vfx.js'))
      else body = await readFile(path.startsWith('/pictures/') ? join(PICTURES, path.slice(10)) : join(ROOT, path))
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' || e.code === 'EISDIR' ? 404 : 500).end(String(e.message))
    }
  })
  await new Promise((done) => server.listen(Number(process.env.PORT) || 0, done))
  return { at: `http://localhost:${server.address().port}`, close: () => server.close() }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log((await serve()).at)
