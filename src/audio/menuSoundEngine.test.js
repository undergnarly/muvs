import assert from 'node:assert/strict'
import test from 'node:test'
import { createMenuSoundEngine, MENU_SOUND_LIMITS } from './menuSoundEngine.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve() }

function fixture({ manifest, resume, decode, fetch, timeout = 12000, contextFactory } = {}) {
  const calls = []
  const timers = new Map()
  let timerId = 0
  let elapsed = 0
  const clock = {
    set(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: elapsed + delay }); return id },
    clear(id) { timers.delete(id) },
    advance(amount) {
      elapsed += amount
      for (const [id, timer] of [...timers]) {
        if (timer.at <= elapsed) { timers.delete(id); timer.fn() }
      }
    },
  }
  const parameter = (label) => ({
    value: 0,
    cancelScheduledValues(time) { calls.push([label, 'cancel', time]) },
    setValueAtTime(value, time) { this.value = value; calls.push([label, 'set', value, time]) },
    linearRampToValueAtTime(value, time) { this.value = value; calls.push([label, 'ramp', value, time]) },
  })
  let nodes = 0
  const allNodes = []
  const node = (type) => {
    const id = `${type}${++nodes}`
    const result = {
      id, connect(target) { calls.push([id, 'connect', target.id]) },
      disconnect() { calls.push([id, 'disconnect']) },
    }
    if (type === 'gain') result.gain = parameter(id)
    if (type === 'filter') result.frequency = parameter(id)
    if (type === 'pan') result.pan = parameter(id)
    if (type === 'source') {
      result.start = (when) => calls.push([id, 'start', when])
      result.stop = (when) => calls.push([id, 'stop', when])
    }
    allNodes.push(result)
    return result
  }
  const stateListeners = new Set()
  const context = {
    state: 'suspended', currentTime: 0, destination: { id: 'destination' },
    addEventListener(type, listener) { if (type === 'statechange') stateListeners.add(listener) },
    removeEventListener(type, listener) { if (type === 'statechange') stateListeners.delete(listener) },
    changeState(state) { this.state = state; for (const listener of stateListeners) listener() },
    resume() {
      calls.push(['context', 'resume'])
      if (resume) return resume(context)
      this.changeState('running')
      return Promise.resolve()
    },
    suspend() { calls.push(['context', 'suspend']); this.changeState('suspended'); return Promise.resolve() },
    close() { calls.push(['context', 'close']); this.changeState('closed'); return Promise.resolve() },
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'),
    createStereoPanner: () => node('pan'), createBufferSource: () => node('source'),
    createBuffer(channels, length, sampleRate) {
      calls.push(['context', 'createBuffer', channels, length, sampleRate])
      const data = new Float32Array(length)
      return { duration: length / sampleRate, getChannelData: () => data }
    },
    decodeAudioData(bytes) {
      calls.push(['context', 'decode', bytes.byteLength])
      return decode ? decode(bytes) : Promise.resolve({ duration: 12 })
    },
  }
  const requests = []
  const engine = createMenuSoundEngine({
    manifest: manifest || {
      ambient: { url: '/audio/pad.mp3', gain: 0.065 },
      sfx: Object.fromEntries(['music', 'mixes', 'code', 'about'].map((key) => [key, { url: `/audio/${key}.mp3` }])),
    },
    audioContextFactory: () => {
      calls.push(['context', 'create'])
      return contextFactory ? contextFactory() : context
    },
    fetchImpl(url, options) {
      calls.push(['fetch', url])
      requests.push({ url, ...options })
      return fetch ? fetch(url, options) : Promise.resolve({
        ok: true, headers: { get: () => '8' }, arrayBuffer: async () => new ArrayBuffer(8),
      })
    },
    setTimeoutImpl: clock.set, clearTimeoutImpl: clock.clear, loadTimeoutMs: timeout,
  })
  const activate = () => engine.setEnvironment({ menuActive: true, splash: false })
  const sources = () => allNodes.filter((item) => item.id.startsWith('source'))
  return { engine, context, calls, clock, timers, requests, allNodes, activate, sources, stateListeners }
}

test('construction and environment/preferences never create, fetch, or unlock audio', () => {
  const f = fixture()
  assert.equal(f.engine.getState().enabled, false)
  assert.equal(f.engine.getState().status, 'off')
  f.activate()
  f.engine.setEnvironment({ section: 'mixes' })
  assert.equal(f.engine.startNavigation({ id: 1 }), false)
  assert.deepEqual(f.calls, [])
  f.engine.dispose()
})

test('trusted enable creates/resumes synchronously BEFORE any fetch and uses one context/loop', async () => {
  const f = fixture()
  f.activate()
  const promise = f.engine.enableFromGesture()
  const resumeIndex = f.calls.findIndex((call) => call[1] === 'resume')
  const fetchIndex = f.calls.findIndex((call) => call[0] === 'fetch')
  assert.ok(resumeIndex >= 0 && resumeIndex < fetchIndex)
  assert.equal(f.engine.getState().status, 'loading')
  await promise
  assert.equal(f.engine.getState().status, 'on')
  assert.equal(f.engine.getState().ambientPlaying, true)
  assert.equal(f.sources().filter((source) => source.loop).length, 1)
  await f.engine.enableFromGesture()
  f.engine.setEnvironment({ section: 'code' })
  assert.equal(f.calls.filter((call) => call[1] === 'create').length, 1)
  assert.equal(f.requests.length, 5)
  assert.equal(f.sources().filter((source) => source.loop).length, 1)
  f.engine.dispose()
})

test('all gains/loop bounds/pan are capped and section changes crossfade without restarting ambient', async () => {
  const f = fixture({ manifest: {
    masterGain: 999, ambient: { url: '/pad.mp3', gain: 999, loopStart: -9, loopEnd: 999 },
    sfx: { code: { url: '/code.mp3', gain: 999 } },
  } })
  f.activate()
  await f.engine.enableFromGesture()
  const ambient = f.sources()[0]
  assert.equal(ambient.loopStart, 0)
  assert.equal(ambient.loopEnd, 12)
  assert.ok(f.engine.startNavigation({ id: 1, section: 'code', direction: 999 }))
  const master = f.allNodes.find((item) => item.id.startsWith('gain'))
  assert.equal(master.gain.value, MENU_SOUND_LIMITS.masterGain)
  const volumeValues = f.calls.filter((call) => call[0].startsWith('gain') && call[1] === 'ramp').map((call) => call[2])
  assert.ok(volumeValues.every((value) => value <= MENU_SOUND_LIMITS.effectGain))
  assert.equal(f.allNodes.find((item) => item.id.startsWith('pan')).pan.value, 0.28)
  assert.equal(f.sources().filter((source) => source.loop).length, 1)
  const filter = f.allNodes.find((item) => item.id.startsWith('filter'))
  assert.equal(filter.frequency.value, 2100)
  f.engine.dispose()
})

test('navigation starts synchronously, deduplicates ids, has matching end and never queues unloaded events', async () => {
  const gate = deferred()
  const f = fixture({ decode: () => gate.promise })
  f.activate()
  const loading = f.engine.enableFromGesture()
  assert.equal(f.engine.startNavigation({ id: 'early', section: 'mixes' }), false)
  gate.resolve({ duration: 8 })
  await loading
  assert.equal(f.sources().length, 1, 'the skipped event must not play after load')
  assert.equal(f.engine.startNavigation({ id: 'now', section: 'mixes', direction: 'left' }), true)
  assert.equal(f.sources().length, 2)
  assert.equal(f.engine.startNavigation({ id: 'now', section: 'mixes' }), false)
  assert.equal(f.engine.endNavigation('wrong-id'), false)
  assert.equal(f.engine.endNavigation('now'), true)
  assert.equal(f.engine.endNavigation('now'), false)
  assert.equal(f.allNodes.find((item) => item.id.startsWith('pan')).pan.value, -0.28)
  f.engine.dispose()
})

test('disable during delayed decode never resurrects playback; later explicit enable reuses decoded buffers', async () => {
  const gate = deferred()
  const f = fixture({ decode: () => gate.promise })
  f.activate()
  const loading = f.engine.enableFromGesture()
  f.engine.disable()
  gate.resolve({ duration: 8 })
  await loading
  assert.equal(f.engine.getState().status, 'off')
  assert.equal(f.engine.getState().ambientPlaying, false)
  assert.equal(f.sources().length, 0)
  f.clock.advance(500)
  await flush()
  assert.equal(f.context.state, 'suspended')
  await f.engine.enableFromGesture()
  assert.equal(f.engine.getState().status, 'on')
  assert.equal(f.sources().length, 1)
  assert.equal(f.requests.length, 5)
  f.engine.dispose()
})

for (const gateKey of ['hidden', 'splash', 'playerActive', 'menuActive']) {
  test(`${gateKey} environment gate stops ambient/effects, rejects navigation, then resumes the already unlocked document`, async () => {
    const f = fixture()
    f.activate()
    await f.engine.enableFromGesture()
    f.engine.startNavigation({ id: 1 })
    f.engine.setEnvironment({ [gateKey]: gateKey !== 'menuActive' })
    assert.equal(f.engine.getState().status, 'paused')
    assert.equal(f.engine.getState().ambientPlaying, false)
    assert.equal(f.engine.startNavigation({ id: 2 }), false)
    assert.ok(f.calls.filter((call) => call[1] === 'stop').length >= 2)
    f.clock.advance(500)
    await flush()
    assert.equal(f.context.state, 'suspended')
    f.engine.setEnvironment({ [gateKey]: gateKey === 'menuActive' })
    await flush()
    assert.equal(f.engine.getState().status, 'on')
    assert.equal(f.engine.getState().ambientPlaying, true)
    assert.equal(f.calls.filter((call) => call[1] === 'create').length, 1)
    f.engine.dispose()
  })
}

test('loading completion after exiting menu remains silent until returning', async () => {
  const gate = deferred()
  const f = fixture({ decode: () => gate.promise })
  f.activate()
  const loading = f.engine.enableFromGesture()
  f.engine.setEnvironment({ menuActive: false })
  gate.resolve({ duration: 12 })
  await loading
  assert.equal(f.sources().length, 0)
  assert.equal(f.engine.getState().ambientPlaying, false)
  f.engine.setEnvironment({ menuActive: true })
  await flush()
  assert.equal(f.sources().length, 1)
  f.engine.dispose()
})

test('blocked resume is handled without rejection and can retry on the next trusted tap', async () => {
  let attempts = 0
  const f = fixture({ resume: (context) => {
    attempts += 1
    if (attempts === 1) return Promise.reject(new Error('NotAllowedError'))
    context.changeState('running')
    return Promise.resolve()
  } })
  f.activate()
  await f.engine.enableFromGesture()
  assert.equal(f.engine.getState().status, 'blocked')
  assert.equal(f.sources().length, 0)
  f.engine.setEnvironment({ section: 'code' })
  await flush()
  assert.equal(attempts, 1, 'environment updates must not retry browser-blocked audio')
  await f.engine.enableFromGesture()
  assert.equal(attempts, 2)
  assert.equal(f.engine.getState().status, 'on')
  f.engine.dispose()
})

test('external iOS-style interruption does not resume or play until another trusted tap', async () => {
  const f = fixture()
  f.activate()
  await f.engine.enableFromGesture()
  f.context.changeState('interrupted')
  assert.equal(f.engine.getState().status, 'blocked')
  assert.equal(f.engine.getState().ambientPlaying, false)
  f.engine.setEnvironment({ section: 'about' })
  f.engine.setEnvironment({ hidden: true })
  f.clock.advance(500)
  await flush()
  f.engine.setEnvironment({ hidden: false })
  await flush()
  assert.equal(f.calls.filter((call) => call[1] === 'resume').length, 1)
  assert.equal(f.engine.startNavigation({ id: 3 }), false)
  await f.engine.enableFromGesture()
  assert.equal(f.engine.getState().status, 'on')
  f.engine.dispose()
})

test('failed fetch is truthful, does not silently substitute a pad, and retry fetches only missing buffers', async () => {
  let fail = true
  const f = fixture({ fetch: async (url) => ({
    ok: url !== '/audio/pad.mp3' || !fail,
    arrayBuffer: async () => new ArrayBuffer(8),
  }) })
  f.activate()
  await f.engine.enableFromGesture()
  assert.equal(f.engine.getState().status, 'error')
  assert.equal(f.engine.getState().ready, false)
  assert.equal(f.sources().length, 0)
  assert.match(f.engine.getState().error, /try again/)
  fail = false
  await f.engine.enableFromGesture()
  assert.equal(f.engine.getState().status, 'on')
  assert.equal(f.requests.filter((request) => request.url === '/audio/pad.mp3').length, 2)
  f.engine.dispose()
})

test('timeout covers a fetch/decode that never settles and leaves no playback/unhandled rejection', async () => {
  const f = fixture({ fetch: () => new Promise(() => {}), timeout: 30 })
  f.activate()
  const loading = f.engine.enableFromGesture()
  f.clock.advance(31)
  await loading
  assert.equal(f.engine.getState().status, 'error')
  assert.match(f.engine.getState().error, /timed out/)
  assert.equal(f.sources().length, 0)
  assert.ok(f.requests.every((request) => request.signal.aborted))
  assert.equal(f.timers.size, 0)
  f.engine.dispose()
})

test('dispose aborts in-flight decoding, removes subscriptions/timers and never creates later audio', async () => {
  const gate = deferred()
  const f = fixture({ decode: () => gate.promise })
  f.activate()
  let notices = 0
  f.engine.subscribe(() => { notices += 1 })
  const loading = f.engine.enableFromGesture()
  await flush()
  f.engine.dispose()
  const noticesAfterDispose = notices
  await loading
  assert.ok(f.requests.every((request) => request.signal.aborted))
  assert.equal(f.timers.size, 0)
  assert.equal(f.stateListeners.size, 0)
  gate.resolve({ duration: 12 })
  await flush()
  assert.equal(f.sources().length, 0)
  assert.equal(f.context.state, 'closed')
  assert.equal(f.engine.getState().status, 'off')
  assert.equal(notices, noticesAfterDispose)
  await f.engine.enableFromGesture()
  assert.equal(f.calls.filter((call) => call[1] === 'create').length, 1)
})

test('unsupported context and synchronous browser failures resolve to truthful state', async () => {
  for (const contextFactory of [() => null, () => { throw new Error('unsupported') }]) {
    const f = fixture({ contextFactory })
    f.activate()
    await f.engine.enableFromGesture()
    assert.equal(f.engine.getState().status, 'unsupported')
    assert.equal(f.requests.length, 0)
    f.engine.dispose()
  }
})

test('two trusted taps during a pending resume share one context and correctly expose a blocked result', async () => {
  const gate = deferred()
  const f = fixture({ resume: () => gate.promise })
  f.activate()
  const first = f.engine.enableFromGesture()
  const second = f.engine.enableFromGesture()
  gate.reject(new Error('NotAllowedError'))
  await Promise.all([first, second])
  assert.equal(f.engine.getState().status, 'blocked')
  assert.equal(f.calls.filter((call) => call[1] === 'resume').length, 1)
  assert.equal(f.calls.filter((call) => call[1] === 'create').length, 1)
  assert.equal(f.sources().length, 0)
  f.engine.dispose()
})

test('a late successful resume cannot restart sound after disable or disposal', async () => {
  for (const dispose of [false, true]) {
    const gate = deferred()
    const f = fixture({ resume: (context) => gate.promise.then(() => { context.changeState('running') }) })
    f.activate()
    const enabling = f.engine.enableFromGesture()
    await flush()
    if (dispose) f.engine.dispose()
    else f.engine.disable()
    gate.resolve()
    await enabling
    f.clock.advance(500)
    await flush()
    assert.equal(f.engine.getState().status, 'off')
    assert.equal(f.sources().length, 0)
    if (!dispose) assert.equal(f.context.state, 'suspended')
    f.engine.dispose()
  }
})

test('browser node/start/buffer failures never escape as an unhandled enabled promise or navigation throw', async () => {
  const f = fixture()
  f.activate()
  f.context.createBufferSource = () => { throw new Error('context interrupted') }
  await f.engine.enableFromGesture()
  assert.equal(f.engine.getState().status, 'blocked')
  assert.equal(f.engine.startNavigation({ id: 1 }), false)
  f.engine.dispose()

  const g = fixture({ manifest: { ambient: { url: '/pad.mp3' } } })
  g.activate()
  g.context.createBuffer = () => { throw new Error('no memory') }
  await g.engine.enableFromGesture()
  assert.equal(g.engine.getState().status, 'error')
  assert.equal(g.sources().length, 0)
  g.engine.dispose()
})

test('optional original effects are finite, bounded, and generated only after opt-in', async () => {
  const f = fixture({ manifest: { ambient: { url: '/pad.mp3' } } })
  f.activate()
  assert.equal(f.calls.filter((call) => call[1] === 'createBuffer').length, 0)
  await f.engine.enableFromGesture()
  assert.equal(f.calls.filter((call) => call[1] === 'createBuffer').length, 4)
  for (const section of ['music', 'mixes', 'code', 'about']) {
    assert.equal(f.engine.startNavigation({ id: section, section }), true)
    const data = f.sources().at(-1).buffer.getChannelData(0)
    assert.ok(data.every((value) => Number.isFinite(value) && Math.abs(value) < 0.3))
  }
  f.engine.dispose()
})

test('foreign/data URLs and oversized assets are rejected without an alternative soundtrack', async () => {
  for (const url of ['https://example.com/pad.mp3', '//example.com/pad.mp3', 'data:audio/mp3;base64,AA==']) {
    const f = fixture({ manifest: { ambient: { url } } })
    f.activate()
    await f.engine.enableFromGesture()
    assert.equal(f.engine.getState().status, 'error')
    assert.equal(f.requests.length, 0)
    assert.equal(f.sources().length, 0)
    f.engine.dispose()
  }
  const f = fixture({ fetch: async () => ({ ok: true, headers: { get: () => String(MENU_SOUND_LIMITS.maxAssetBytes + 1) } }) })
  f.activate()
  await f.engine.enableFromGesture()
  assert.equal(f.engine.getState().status, 'error')
  assert.match(f.engine.getState().error, /too large/)
  f.engine.dispose()
})
