# What Pyctures needs

**Done, on Pyctures' branch `effects`** (worktree `../pyctures-effects`): `H_EFFECTS = 13` (12 is scenes), `S.dt` (set for a frame, `None` otherwise), the few lines of the page below, the `pyvisualfx` entry in both `LIBRARIES` tables, the copies under `web/visualfx/`, the worker's path, and `scripts/sync_libraries.py`. What follows is the record of the design.

`from pyvisualfx import *` already works under `pyctures run` with no change to Pyctures: like pydials, the Python module carries `visualfx.js` and puts it in the page itself. These changes build it in, which a built page, a single-file page and Python in the browser need (there the module is one file with no `web/` folder beside it), and which makes the frame's clock exact without the module having to listen for it.

## src/pyctures/__init__.py

```python
H_EFFECTS = 13   # the page's effects: `from pyvisualfx import *` turns each on with one command
```

(12 is left free; nothing in the family uses it today.) And in the frame handler, so a library can read the seconds a frame was given:

```python
        S.dt = float(p.get("dt", 0.0))
        _call_frame_functions(S.dt)
```

with `dt = None` among `_State`'s fields, `S.dt = None` after the `S.ending` loop in `_reply`, and `S.dt = 0.0` before the start's own call of the scene's functions (what a file draws as it starts is a frame given no time, and the effects are run on it). Until then `pyvisualfx` reads the same number by wrapping `_call_frame_functions`, which works and is not pretty. Either way the effects' clock is the `dt` the scene's `update(dt)` is given, and the effects are run by the LAST command of each frame's batch (`frame(dt)`, added from `S.ending`), so they are stepped exactly with Python's frames: once a frame, after its drawing, however slow Python is.

## src/pyctures/web/pyctures.js

**The table** (`LIBRARIES`), and `pages.LIBRARIES` in Python with it:

```js
pyvisualfx: { folder: 'visualfx', js: 'visualfx.js', py: 'pyvisualfx.py' },
```

**No keeper of its own.** The library is loaded before a scene that imports it starts (as the others are, from the import in the scene's own file), so the page's part is two places and a few lines. A keeper like `dialsKeeper`, which loads the library late, was written and taken out again: a single-file page with no effects must stay under the size Pyctures' tests hold it to, and the keeper cost more than there was room for.

**In `createRenderer`**: a parameter `effects` (a function that makes them for the canvas), then

```js
const fx = effects ? effects(canvas) : null
if (fx) H.set(13, new Proxy({}, { has: () => true, get: (_, n) => (n === 'frame' ? (dt) => queueMicrotask(() => fx.frame(dt)) : (...a) => fx[n](...a)) }))
```

and `if (fx) fx.close()` where `panel.close()` is. Python's `frame(dt)` is the last command of a batch, but it is run at the end of the turn: a change of scene paints its layer once the batch is applied (`stage.caught()`), and the effects must be given that.

**Where a scene starts**:

```js
effects: libs.pyvisualfx && ((canvas) => libs.pyvisualfx.effects(canvas, { fresh: true, manual: true,
  sound: () => this.sound && this.sound.output && this.sound.output(),
  under: () => this.stage && this.stage.running && this.stage.running.layer })),
```

`sound` is what the effects listen to when the scene has not called `listen_to`: the page's own object for all the sound, which has `samples()`. `under` is the old scene's picture while one scene changes to the next. A scene that imports `pyvisualfx` only in a second file of its own, not in the scene's file, is not given the effects: the import must be in the scene's file.

**The copies**: `web/visualfx/visualfx.js` and `LICENSE` from this repository, `web/visualfx/pyvisualfx.py` from `pyvisualfx/src/pyvisualfx/__init__.py` (one file: the table of effects is inside it), by the script that copies the other two libraries; `pages.py`'s list of files and `single_page`'s `visualfx: {js, py}`.

## What the page's half is asked (the commands)

All on handle 13, each one `call`:

| | |
|---|---|
| `make(kind, id, [settings])` | turn an effect on: `kind` is its JavaScript name, `id` Python's number for it |
| `make("look", id, [name, amount])`, `make("shader", id, [source, settings])` | |
| `set(id, name, value)` | a setting (or a look's `amount`) |
| `call(id, "off" \| "on" \| "remove")` | |
| `react(id, name, band, { from, to })` | tie a setting to the music, in the page |
| `listen(target)` | what the music is taken from: a reference to an object in the page |
| `clearEffects()`, `effectsQuality(value)` | |
| `report(fn)`, `ack()` | the music's five numbers, told to Python as `{ b: [bass, mids, highs, loudness, pulse] }` when they change and it has answered the last |
| `frame(dt)` | the last command of every frame |
