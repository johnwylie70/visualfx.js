# What Pyctures needs

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

with `dt = 0.0` among `_State`'s fields. Until then `pyvisualfx` reads the same number by wrapping `_call_frame_functions`, which works and is not pretty. Either way the effects' clock is the `dt` the scene's `update(dt)` is given, and the effects are run by the LAST command of each frame's batch (`frame(dt)`, added from `S.ending`), so they are stepped exactly with Python's frames: once a frame, after its drawing, however slow Python is.

## src/pyctures/web/pyctures.js

**The table** (`LIBRARIES`), and `pages.LIBRARIES` in Python with it:

```js
pyvisualfx: { folder: 'visualfx', js: 'visualfx.js', py: 'pyvisualfx.py' },
```

**A keeper**, beside `dialsKeeper` and the same shape (the module at once when the scene imports `pyvisualfx`, else loaded on the first command with the commands kept until then):

```js
function effectsKeeper({ given = null, module = null, sound = null }) {
  const made = (m, canvas) => m.effects(canvas, { fresh: true, manual: true, sound: sound ? () => sound.output() : null })
  // … as dialsKeeper, with loadLibrary('pyvisualfx', given) and api.close()
}
```

**In `createRenderer`**: a parameter `effects`, then

```js
const fx = effects ? effects(canvas) : null
if (fx) H.set(13, fx)
```

and `if (fx) fx.close()` where `panel.close()` is. In the scene's start: `effects: effectsKeeper({ given: this.opt.effects, module: libs.pyvisualfx, sound: this.sound })`, and the loop that fills `libs` passes `this.opt.effects` for `pyvisualfx`.

`sound` is what the effects listen to when the scene has not called `listen_to`: the page's own object for all the sound (`soundKeeper`'s `output()`, the one `sound_output().page` is), which has `samples()`.

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
