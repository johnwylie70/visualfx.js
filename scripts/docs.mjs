#!/usr/bin/env node
/**
 * The effects' own documentation, written from the table in visualfx.js so it cannot drift from it:
 *
 *   docs/effects.md               every effect in its group: its picture, the line that turns it on (JavaScript
 *                                 and Python), what it is, and its settings with where they start and their range
 *   docs/effects.json             the same table as data, for a website's help pages
 *   docs/images/effects/*.jpg     one small picture (320 x 200) of each effect, and look-*.jpg of each look
 *   docs/images/effects.jpg       all of them on one sheet
 *
 *   node scripts/docs.mjs --check                                      nothing is written: code 1 if the page or the data is
 *                                                                      not what the table gives, or a picture is missing
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/docs.mjs  write the page, the data and every picture
 *   … node scripts/docs.mjs glow trails                                the page, and only these pictures again
 *
 * An effect added to visualfx.js is on the page and in the pictures the next time this runs, with nothing edited by
 * hand. Each picture is the effect itself run on a small moving scene; HOW says where one wants other settings than
 * its own to show what it does. No sound is made: the music is a made-up drum.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { serve, ROOT } from './serve.mjs'

const check = process.argv.includes('--check')
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const { effects } = await import(pathToFileURL(join(ROOT, 'visualfx.js')).href)
const table = effects.definitions()
const snake = (name) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const PICTURES = join(ROOT, 'docs', 'images', 'effects')

/** What a picture is made with, where the effect's own settings would not show it off on so small a scene. */
const HOW = {
  trails: [1.2, { zoom: 1.3, spin: 30, hue: 120 }], smear: [2.5, { size: 70 }], stutter: [3], kaleidoscope: [8, { x: 160, y: 100, angle: 150, zoom: 0.6 }], tile: [3],
  tiltShift: [8, { size: 30 }], spectrumRing: [{ size: 45 }], waveformRing: [{ size: 55 }], lightRays: [1, { x: 105, y: 70 }], shake: [14], punch: [0.5],
  stainedGlass: [22], hexagons: [9], pixelate: [8], glassTiles: [28], dots: [7], led: [6], letters: [8], dither: ['gameboy', { size: 2 }], snow: [1], bokeh: [0.8, { size: 22 }],
  streaks: [1, { size: 90 }], droste: [3], lightLeaks: [1], fog: [0.8], dust: [1], lightning: [1.5, { speed: 4 }], copperBars: [{ size: 18 }], matrixRain: [{ size: 9 }],
}

// --- the page, as text
const value = (v, python) => (v === null ? (python ? 'None' : 'null') : typeof v === 'boolean' ? (python ? (v ? 'True' : 'False') : String(v)) : JSON.stringify(v))
const call = (name, def, python) => `${python ? snake(name) : name}(${def.order.map((n) => value(def.settings[n].default, python)).join(', ')})`
function settingRows(def) {
  return Object.entries(def.settings).map(([name, s]) => {
    const starts = s.place ? 'the middle' : value(s.default)
    const range = s.kind === 'choice' ? s.choices.map((c) => `\`"${c}"\``).join(', ')
      : s.kind === 'colour' ? 'any colour' : s.kind === 'palette' ? 'a palette\'s name, or a list of colours' : s.kind === 'bool' ? 'true or false'
        : s.place ? 'a place in the scene' : `${s.min} to ${s.max}${s.unit === 'degrees' ? ' degrees' : s.unit === 's' ? ' seconds' : ''}${s.kind === 'int' ? ', a whole number' : ''}`
    return `| \`${name}\` | \`${snake(name)}\` | ${s.place ? starts : `\`${starts}\``} | ${range} |`
  })
}
function page() {
  const out = ['# Every effect', '',
    '<!-- Written by scripts/docs.mjs from the table in visualfx.js. Do not edit it by hand: change the table and run the script. -->', '',
    `There are ${Object.keys(table.effects).length} effects and ${table.looks.length} looks. Each effect is one line to turn on; the value in the brackets is the one a plain number (or name) sets, and every other setting goes in by name: \`glow(0.8, { radius: 40 })\`, or in Python \`glow(0.8, radius=40)\`. A setting can be changed at any time: \`shine.radius = 60\`.`, '',
    'Every effect also has `amount`, from 0 to 1: how much of it is mixed in. Lengths are in the scene\'s points and angles in degrees. A place (`x`, `y`) is the middle of the picture unless you say.', '',
    `The palettes: ${table.palettes.map((p) => `\`${p}\``).join(', ')}, or your own list of colours.`, '',
    '![Every effect and every look](images/effects.jpg)', '']
  out.push('## Contents', '')
  for (const group of table.groups) {
    const names = Object.keys(table.effects).filter((n) => table.effects[n].group === group)
    if (names.length) out.push(`- **${group}**: ${names.map((n) => `[${n}](#${n.toLowerCase()})`).join(', ')}`)
  }
  out.push(`- **Looks**: ${table.looks.map((l) => `[${l}](#look-${l})`).join(', ')}`, '')
  for (const group of table.groups) {
    const names = Object.keys(table.effects).filter((n) => table.effects[n].group === group)
    if (!names.length) continue
    out.push(`## ${group}`, '')
    if (/Backdrops/.test(group)) out.push('A backdrop is a picture the graphics card makes by itself. It is behind whatever you draw, and shows wherever you have left the canvas clear: wipe the picture each frame with `background()` (no colour) rather than painting over it.', '')
    if (/music/.test(group)) out.push('These follow the sound: see Music in the README. With nothing to listen to they are still and dark.', '')
    for (const name of names) {
      const def = table.effects[name]
      const alias = Object.entries(table.aliases).filter(([, to]) => to === name).map(([from]) => `\`${from}\``)
      out.push(`### ${name}`, '', `<img src="images/effects/${name}.jpg" width="320" height="200" alt="${name}">`, '', def.about, '',
        '| JavaScript | Python |', '|---|---|', `| \`${call(name, def)}\` | \`${call(name, def, true)}\` |`, '')
      if (alias.length) out.push(`Also called ${alias.join(' and ')}.`, '')
      if (def.cost === 'heavy') out.push('**Heavy.** It looks at dozens of places for every pixel: use it alone, or at a lower `effectsQuality`.', '')
      else if (def.cost === 'some') out.push('It looks at a dozen or more places for every pixel, so it costs a little more than most.', '')
      if (def.feedback) out.push('It keeps its own last frame, so it wants a scene that moves.', '')
      out.push('| Setting | In Python | Starts at | Can be |', '|---|---|---|---|', ...settingRows(def), '')
    }
  }
  out.push('## Looks', '', 'A look is several effects at once: `look("dream")`. It gives its parts back by name (`look("vhs").glitch.strength = 1`), and has `amount`, `off()`, `on()` and `remove()` for the lot.', '')
  for (const name of table.looks) {
    const parts = table.recipes[name].map(([effect, settings]) => `\`${effect}(${Object.keys(settings).length ? JSON.stringify(settings).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }') : ''})\``)
    out.push(`### look: ${name}`, '', `<a id="look-${name}"></a>`, '', `<img src="images/effects/look-${name}.jpg" width="320" height="200" alt="look ${name}">`, '', table.lookAbout[name] || '', '',
      `\`look("${name}")\` is ${parts.join(', then ')}.`, '')
  }
  return out.join('\n')
}
const md = page()
const json = JSON.stringify({ ...table, pictures: 'images/effects/<name>.jpg, images/effects/look-<look>.jpg' }, null, 1) + '\n'
// In the order of the page: group by group, then the looks.
const wanted = [...table.groups.flatMap((g) => Object.keys(table.effects).filter((n) => table.effects[n].group === g)), ...table.looks.map((l) => `look-${l}`)]

if (check) {
  const problems = []
  for (const [file, text] of [['docs/effects.md', md], ['docs/effects.json', json]]) {
    const there = existsSync(join(ROOT, file)) ? await readFile(join(ROOT, file), 'utf8') : null
    if (there !== text) problems.push(`${file} is not what the table in visualfx.js gives: run scripts/docs.mjs`)
  }
  for (const name of wanted) if (!existsSync(join(PICTURES, `${name}.jpg`))) problems.push(`docs/images/effects/${name}.jpg is missing: run scripts/docs.mjs ${name.replace(/^look-/, '')}`)
  for (const p of problems) console.log(p)
  process.exit(problems.length ? 1 : 0)
}

await mkdir(PICTURES, { recursive: true })
await writeFile(join(ROOT, 'docs', 'effects.md'), md)
await writeFile(join(ROOT, 'docs', 'effects.json'), json)
console.log('docs/effects.md, docs/effects.json')

// --- the pictures
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { at, close } = await serve({ '/blank.html': '<!doctype html><body style="margin:0;background:#16181d">' })
const browser = await playwright.chromium.launch({ args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page_ = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
page_.on('pageerror', (e) => console.log(e.message.slice(0, 400)))
await page_.goto(`${at}/blank.html`)
const todo = wanted.filter((n) => !only.length || only.includes(n) || only.includes(n.replace(/^look-/, '')))
for (const name of todo) {
  const jpeg = await page_.evaluate(async ({ name, how }) => {
    const lib = await import('/visualfx.js')
    const def = lib.effects.definitions().effects[name]
    const W = 320, H = 200
    const c = Object.assign(document.createElement('canvas'), { width: W * 2, height: H * 2 })
    c.style.cssText = `display:block;width:${W}px;height:${H}px`
    document.body.replaceChildren(c)
    const g = c.getContext('2d')
    g.scale(2, 2)
    // The small scene every picture is of: still shapes all over, three bright things that move, and a word.
    let seed = 11
    const r = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    const cols = ['gold', 'deepskyblue', 'tomato', 'springgreen', 'white', 'orchid', 'darkorange']
    const still = Array.from({ length: 16 }, (_, i) => ({ x: 14 + r() * (W - 28), y: 12 + r() * (H - 24), size: 7 + r() * 15, colour: cols[i % cols.length], kind: i % 3 }))
    const draw = (t) => {
      g.clearRect(0, 0, W, H)
      if (!def || !def.backdrop) {
        const sky = g.createLinearGradient(0, 0, W, H)
        sky.addColorStop(0, '#0b1030'); sky.addColorStop(1, '#3a0d3a')
        g.fillStyle = sky
        g.fillRect(0, 0, W, H)
        for (const s of still) {
          g.fillStyle = g.strokeStyle = s.colour
          g.lineWidth = 3
          g.beginPath()
          if (s.kind === 0) { g.arc(s.x, s.y, s.size, 0, 7); g.stroke() } else if (s.kind === 1) { g.arc(s.x, s.y, s.size * 0.8, 0, 7); g.fill() } else g.fillRect(s.x - s.size * 0.7, s.y - s.size * 0.7, s.size * 1.4, s.size * 1.4)
        }
        g.fillStyle = 'white'
        g.font = 'bold 40px system-ui, sans-serif'
        g.textAlign = 'center'
        g.fillText('hello', W / 2, H / 2 + 14)
      }
      for (let i = 0; i < 3; i++) {
        g.fillStyle = ['gold', 'deepskyblue', 'hotpink'][i]
        g.beginPath()
        g.arc(W / 2 + (60 + 30 * i) * Math.cos(t * (1.6 - 0.3 * i) + i * 2.1), H / 2 + (36 + 18 * i) * Math.sin(t * (1.6 - 0.3 * i) + i * 2.1), 9 - i, 0, 7)
        g.fill()
      }
    }
    const fx = lib.effects(c, { manual: true })
    fx.effectsQuality(1)
    // A made-up tune: a drum four times a second, a tone and a hiss.
    let heard = 0
    fx.listenTo({ samples: () => Float32Array.from({ length: 1024 }, (_, i) => { const t = (heard + i - 1024) / 48000, beat = (t * 4) % 1; return 0.5 * Math.sin(beat * 60 * 6.283 * 0.25) * Math.exp(-beat * 7) + 0.2 * Math.sin(t * 2764) + 0.12 * Math.sin(t * 17000) + 0.1 * Math.sin(t * 6200) }) })
    if (name.startsWith('look-')) fx.look(name.slice(5)); else fx[name](...(how || []))
    for (let i = 1; i <= 46; i++) { heard += 1600; draw(i / 30); fx.frame(1 / 30) }
    const p = fx.pixels()
    fx.close()
    const big = Object.assign(document.createElement('canvas'), { width: p.width, height: p.height })
    big.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(p.data.buffer), p.width, p.height), 0, 0)
    const small = Object.assign(document.createElement('canvas'), { width: W, height: H })
    const s = small.getContext('2d')
    s.imageSmoothingQuality = 'high'
    s.drawImage(big, 0, 0, W, H)
    return small.toDataURL('image/jpeg', 0.8)
  }, { name, how: HOW[name] })
  await writeFile(join(PICTURES, `${name}.jpg`), Buffer.from(jpeg.split(',')[1], 'base64'))
}
console.log(`docs/images/effects/: ${todo.length} pictures`)

// --- and all of them on one sheet
const tiles = []
for (const name of wanted) tiles.push({ label: name.startsWith('look-') ? `look("${name.slice(5)}")` : name, src: `data:image/jpeg;base64,${(await readFile(join(PICTURES, `${name}.jpg`))).toString('base64')}` })
await page_.evaluate((tiles) => {
  document.body.innerHTML = `<div id="all" style="display:grid;grid-template-columns:repeat(8,160px);gap:5px;padding:6px;width:max-content;font:600 11px system-ui;color:#eef0f4">${tiles.map((t) => `<div><img src="${t.src}" style="display:block;width:160px;height:100px;border-radius:5px"><div style="padding:2px 1px 5px">${t.label}</div></div>`).join('')}</div>`
  return Promise.all([...document.images].map((i) => i.decode()))
}, tiles)
const png = join(ROOT, 'docs', 'images', 'effects.png')
await (await page_.$('#all')).screenshot({ path: png })
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '--resampleWidth', '1600', png, '--out', join(ROOT, 'docs', 'images', 'effects.jpg')], { stdio: 'ignore' })
await rm(png)
console.log('docs/images/effects.jpg')
await browser.close()
close()
