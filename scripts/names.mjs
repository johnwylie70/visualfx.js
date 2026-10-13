/** The names a scene is given: every function visualfx.js gives, less what belongs to a host. Read from the file itself. */
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NOT_A_SCENES = new Set(['effects', 'version'])
export async function effectNames() {
  const text = await readFile(join(ROOT, 'visualfx.js'), 'utf8')
  const list = text.match(/\nexport \{([\s\S]*?)\}/)[1]
  return list.split(',').map((n) => n.trim()).filter((n) => n && !NOT_A_SCENES.has(n))
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log((await effectNames()).join(' '))
