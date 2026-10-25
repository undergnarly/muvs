/**
 * Opt-in menu audio. Importing/constructing this controller does not create an
 * AudioContext or fetch media. Call enableFromGesture directly in a trusted
 * button handler; the context's resume happens before the first async boundary.
 */
export const MENU_SOUND_LIMITS = Object.freeze({
  masterGain: 0.8,
  ambientGain: 0.35,
  effectGain: 0.45,
  fadeSeconds: 0.16,
  loadTimeoutMs: 12000,
  maxAssetBytes: 8 * 1024 * 1024,
})

const SECTION_PROFILES = Object.freeze({
  music: { gain: 1, cutoff: 1600, tone: 110 },
  mixes: { gain: 0.94, cutoff: 1250, tone: 165 },
  code: { gain: 0.82, cutoff: 2100, tone: 330 },
  about: { gain: 0.78, cutoff: 1000, tone: 220 },
})
const bounded = (value, fallback, max) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(0, Number(value))) : fallback
const sectionKey = (value) => Object.hasOwn(SECTION_PROFILES, value) ? value : 'music'
const defaultContextFactory = () => {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext
  return Context ? new Context({ latencyHint: 'interactive' }) : null
}
const ignoreRejection = (value) => { value?.catch?.(() => {}) }

function ramp(parameter, value, time, seconds = MENU_SOUND_LIMITS.fadeSeconds) {
  if (!parameter) return
  parameter.cancelScheduledValues(time)
  parameter.setValueAtTime(parameter.value, time)
  parameter.linearRampToValueAtTime(value, time + seconds)
}

function disconnect(node) {
  try { node?.disconnect() } catch { /* A disconnected Web Audio node is fine. */ }
}

/** Missing optional effects may use these small original, non-musical gestures. */
function originalEffect(context, section) {
  const sampleRate = 24000
  const duration = section === 'code' ? 0.28 : 0.42
  const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate)
  const data = buffer.getChannelData(0)
  const profile = SECTION_PROFILES[section]
  let seed = 0x51f15e
  let noise = 0
  for (let index = 0; index < data.length; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    noise = noise * 0.84 + ((seed / 0x100000000) * 2 - 1) * 0.16
    const position = index / data.length
    const envelope = Math.sin(Math.PI * position) ** 2 * Math.exp(-position * 3)
    const tone = Math.sin((index / sampleRate) * Math.PI * 2 * profile.tone)
    data[index] = envelope * (noise * 0.65 + tone * (section === 'code' ? 0.18 : 0.08))
  }
  return buffer
}

function decode(context, bytes) {
  // Callback + Promise supports Safari versions with either implementation.
  return new Promise((resolve, reject) => {
    try {
      const result = context.decodeAudioData(bytes, resolve, reject)
      result?.then?.(resolve, reject)
    } catch (error) { reject(error) }
  })
}

export function createMenuSoundEngine({
  manifest = {},
  audioContextFactory = defaultContextFactory,
  fetchImpl = (...args) => globalThis.fetch(...args),
  onState,
  setTimeoutImpl = globalThis.setTimeout.bind(globalThis),
  clearTimeoutImpl = globalThis.clearTimeout.bind(globalThis),
  loadTimeoutMs = MENU_SOUND_LIMITS.loadTimeoutMs,
} = {}) {
  let context = null
  let contextGeneration = 0
  let master = null
  let ambientFilter = null
  let ambient = null
  let enabled = false
  let disposed = false
  let ready = false
  let blocked = false
  let unsupported = false
  let error = ''
  let loading = null
  let revision = 0
  let loadRevision = 0
  let expectedSuspension = false
  let resuming = false
  let suspending = false
  let resumeOperation = null
  let suspendTimer = null
  let lastNavigationId = null
  let activeNavigationId = null
  const effects = new Set()
  const buffers = new Map()
  const controllers = new Set()
  const listeners = new Set(onState ? [onState] : [])
  const environment = {
    menuActive: false, hidden: false, splash: true, playerActive: false, section: 'music',
  }
  const ambientSpec = manifest.ambient || {}
  const effectSpecs = manifest.sfx || {}
  const ambientGain = bounded(ambientSpec.gain, 0.16, MENU_SOUND_LIMITS.ambientGain)
  const masterGain = bounded(manifest.masterGain, 0.7, MENU_SOUND_LIMITS.masterGain)
  const isActive = () => environment.menuActive && !environment.hidden
    && !environment.splash && !environment.playerActive
  const canPlay = () => !disposed && enabled && ready && isActive()
    && !blocked && context?.state === 'running'

  function getState() {
    let status = 'off'
    if (unsupported) status = 'unsupported'
    else if (enabled) {
      if (blocked) status = 'blocked'
      else if (error) status = 'error'
      else if (loading) status = 'loading'
      else if (!isActive() || context?.state !== 'running') status = 'paused'
      else status = ready ? 'on' : 'loading'
    }
    return Object.freeze({
      enabled: !disposed && enabled,
      status: disposed ? 'off' : status,
      ready: !disposed && ready,
      active: !disposed && isActive(),
      ambientPlaying: Boolean(ambient && canPlay()),
      section: environment.section,
      error: error || null,
    })
  }

  function publish() {
    const state = getState()
    for (const listener of listeners) {
      try { listener(state) } catch { /* A UI observer cannot break audio cleanup. */ }
    }
    return state
  }

  function clearSuspendTimer() {
    if (suspendTimer !== null) clearTimeoutImpl(suspendTimer)
    suspendTimer = null
  }

  function stopVoice(voice, seconds = MENU_SOUND_LIMITS.fadeSeconds) {
    if (!voice || voice.stopped) return
    voice.stopped = true
    const now = context?.currentTime || 0
    try { ramp(voice.gain.gain, 0, now, seconds) } catch { /* A closing context may reject automation. */ }
    try { voice.source.stop(now + seconds + 0.01) } catch { /* Already stopped. */ }
  }

  function stopAll(seconds = MENU_SOUND_LIMITS.fadeSeconds) {
    stopVoice(ambient, seconds)
    ambient = null
    for (const voice of effects) stopVoice(voice, seconds)
    activeNavigationId = null
  }

  function suspendWhenQuiet(seconds = MENU_SOUND_LIMITS.fadeSeconds) {
    clearSuspendTimer()
    if (!context || context.state === 'closed') return
    suspendTimer = setTimeoutImpl(() => {
      suspendTimer = null
      if (disposed || (!enabled || !isActive() || blocked)) {
        expectedSuspension = true
        suspending = true
        try {
          ignoreRejection(Promise.resolve(context.suspend()).finally(() => { suspending = false }))
        } catch { suspending = false }
      }
    }, Math.ceil(seconds * 1000) + 30)
  }

  function makeVoice(buffer, gainValue, { loop = false, pan = 0 } = {}) {
    let source, gain, panner
    try {
      source = context.createBufferSource()
      gain = context.createGain()
      panner = !loop && context.createStereoPanner ? context.createStereoPanner() : null
      source.buffer = buffer
      source.loop = loop
      if (loop) {
        const start = bounded(ambientSpec.loopStart, 0, Math.max(0, buffer.duration - 0.01))
        const end = bounded(ambientSpec.loopEnd, buffer.duration, buffer.duration)
        if (end > start) { source.loopStart = start; source.loopEnd = end }
      }
      gain.gain.setValueAtTime(0, context.currentTime)
      source.connect(gain)
      if (loop && ambientFilter) gain.connect(ambientFilter)
      else if (panner) {
        panner.pan.setValueAtTime(pan, context.currentTime)
        gain.connect(panner)
        panner.connect(master)
      } else gain.connect(master)
      const voice = { source, gain, panner, stopped: false }
      source.onended = () => {
        disconnect(source); disconnect(gain); disconnect(panner)
        effects.delete(voice)
        if (ambient === voice) { ambient = null; publish() }
      }
      ramp(gain.gain, gainValue, context.currentTime, loop ? 0.5 : 0.015)
      source.start(0)
      return voice
    } catch (cause) {
      try { source?.stop() } catch { /* A source that failed to start is inert. */ }
      disconnect(source); disconnect(gain); disconnect(panner)
      throw cause
    }
  }

  function updateAmbientProfile() {
    if (!ambient || !context) return
    const profile = SECTION_PROFILES[environment.section]
    ramp(ambient.gain.gain, ambientGain * profile.gain, context.currentTime, 0.32)
    ramp(ambientFilter?.frequency, profile.cutoff, context.currentTime, 0.32)
  }

  function reconcile() {
    if (!canPlay()) return
    clearSuspendTimer()
    expectedSuspension = false
    try {
      if (!ambient) {
        ambient = makeVoice(buffers.get('ambient'), ambientGain, { loop: true })
        updateAmbientProfile()
        publish()
      } else updateAmbientProfile()
    } catch {
      blocked = true
      stopAll(0)
      publish()
    }
  }

  function handleContextState() {
    if (disposed || !context) return
    if (context.state === 'running') {
      expectedSuspension = false
      return
    }
    if (enabled && isActive() && !expectedSuspension && !resuming) {
      blocked = true
      stopAll(0)
      publish()
    }
  }

  function ensureContext() {
    if (context?.state === 'closed') {
      clearSuspendTimer()
      contextGeneration += 1
      resumeOperation = null
      resuming = false
      context.removeEventListener?.('statechange', handleContextState)
      loadRevision += 1
      for (const controller of controllers) controller.abort()
      controllers.clear()
      loading = null
      context = null
      master = null
      ambientFilter = null
      ready = false
      buffers.clear()
    }
    if (context) return true
    context = audioContextFactory()
    if (!context) { unsupported = true; return false }
    contextGeneration += 1
    unsupported = false
    master = context.createGain()
    master.gain.setValueAtTime(masterGain, context.currentTime)
    master.connect(context.destination)
    if (context.createBiquadFilter) {
      ambientFilter = context.createBiquadFilter()
      ambientFilter.type = 'lowpass'
      ambientFilter.frequency.setValueAtTime(SECTION_PROFILES[environment.section].cutoff, context.currentTime)
      ambientFilter.connect(master)
    }
    context.addEventListener?.('statechange', handleContextState)
    return true
  }

  // This function invokes context.resume synchronously, including from the
  // trusted enable handler. No fetch/decode/promise is awaited first.
  function resumeContext() {
    clearSuspendTimer()
    expectedSuspension = false
    if (context.state === 'running' && !suspending) return Promise.resolve(true)
    if (resumeOperation) return resumeOperation
    const generation = contextGeneration
    const resumedContext = context
    resuming = true
    let result
    try { result = resumedContext.resume() } catch (cause) { result = Promise.reject(cause) }
    resumeOperation = Promise.resolve(result).then(() => {
      if (generation !== contextGeneration) return false
      if (disposed || !enabled || !isActive()) {
        suspendWhenQuiet(0)
        return false
      }
      if (resumedContext.state !== 'running') { blocked = true; return false }
      blocked = false
      return true
    }, () => {
      if (!disposed && enabled && isActive() && generation === contextGeneration) {
        blocked = true
        stopAll(0)
      }
      return false
    }).finally(() => {
      if (generation !== contextGeneration) return
      resuming = false
      resumeOperation = null
      if (!disposed) { reconcile(); publish() }
    })
    return resumeOperation
  }

  async function loadAsset(key, spec, token) {
    if (buffers.has(key)) return
    if (!spec?.url || typeof spec.url !== 'string' || !spec.url.startsWith('/') || spec.url.startsWith('//')) {
      throw new Error('Sound files are unavailable. Please try again.')
    }
    const controller = new AbortController()
    controllers.add(controller)
    let timer
    let rejectAbort
    const aborted = new Promise((_, reject) => { rejectAbort = reject })
    const onAbort = () => rejectAbort(new Error('Sound loading was cancelled.'))
    controller.signal.addEventListener('abort', onAbort, { once: true })
    const timeout = new Promise((_, reject) => {
      timer = setTimeoutImpl(() => {
        reject(new Error('Sound loading timed out. Please try again.'))
        controller.abort()
      }, Math.max(1, Number(loadTimeoutMs) || MENU_SOUND_LIMITS.loadTimeoutMs))
    })
    try {
      const buffer = await Promise.race([timeout, aborted, (async () => {
        const response = await fetchImpl(spec.url, { signal: controller.signal, credentials: 'same-origin' })
        if (!response.ok) throw new Error('Sound files could not be loaded. Please try again.')
        if (Number(response.headers?.get?.('content-length')) > MENU_SOUND_LIMITS.maxAssetBytes) {
          throw new Error('Sound file is too large.')
        }
        const bytes = await response.arrayBuffer()
        if (bytes.byteLength > MENU_SOUND_LIMITS.maxAssetBytes) throw new Error('Sound file is too large.')
        return decode(context, bytes)
      })()])
      if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('Sound file is invalid.')
      if (!disposed && token === loadRevision) buffers.set(key, buffer)
    } finally {
      clearTimeoutImpl(timer)
      controller.signal.removeEventListener('abort', onAbort)
      controllers.delete(controller)
    }
  }

  function loadBuffers() {
    if (ready) return Promise.resolve(true)
    if (loading) return loading
    const token = ++loadRevision
    const jobs = []
    try {
      jobs.push(loadAsset('ambient', ambientSpec, token))
      for (const section of Object.keys(SECTION_PROFILES)) {
        if (effectSpecs[section]?.url) jobs.push(loadAsset(section, effectSpecs[section], token))
        else if (!buffers.has(section)) buffers.set(section, originalEffect(context, section))
      }
    } catch (cause) { jobs.push(Promise.reject(cause)) }
    loading = Promise.all(jobs).then(() => {
      if (disposed || token !== loadRevision) return false
      ready = true
      error = ''
      return true
    }, (cause) => {
      if (!disposed && token === loadRevision) {
        for (const controller of controllers) controller.abort()
        ready = false
        error = cause?.message || 'Sound files could not be loaded. Please try again.'
      }
      return false
    }).finally(() => {
      if (token === loadRevision) loading = null
      if (!disposed) { reconcile(); publish() }
    })
    return loading
  }

  function enableFromGesture() {
    if (disposed) return Promise.resolve(getState())
    enabled = true
    blocked = false
    error = ''
    const token = ++revision
    let resumed
    try {
      if (!ensureContext()) return Promise.resolve(publish())
      resumed = resumeContext()
    } catch {
      enabled = false
      error = 'Sound is unavailable in this browser.'
      unsupported = true
      context?.removeEventListener?.('statechange', handleContextState)
      disconnect(ambientFilter)
      disconnect(master)
      if (context) {
        try { ignoreRejection(context.close()) } catch { /* Partial initialization. */ }
      }
      context = null
      master = null
      ambientFilter = null
      return Promise.resolve(publish())
    }
    // resumeContext above MUST stay before this load (and before any await).
    let loaded
    try { loaded = loadBuffers() } catch {
      ready = false
      error = 'Sound files could not be prepared. Please try again.'
      return Promise.resolve(publish())
    }
    publish()
    return Promise.all([resumed, loaded]).then(() => {
      if (!disposed && enabled && token === revision) {
        if (isActive()) reconcile()
        else suspendWhenQuiet(0)
      }
      return publish()
    })
  }

  function disable() {
    if (disposed) return getState()
    enabled = false
    revision += 1
    blocked = false
    error = ''
    stopAll()
    suspendWhenQuiet()
    return publish()
  }

  function setEnvironment(next = {}) {
    if (disposed) return getState()
    const wasActive = isActive()
    for (const key of ['menuActive', 'hidden', 'splash', 'playerActive']) {
      if (Object.hasOwn(next, key)) environment[key] = Boolean(next[key])
    }
    if (Object.hasOwn(next, 'section')) environment.section = sectionKey(next.section)
    if (!isActive()) {
      if (wasActive || ambient || effects.size) { revision += 1; stopAll() }
      if (enabled) suspendWhenQuiet()
    } else if (enabled && context && !blocked && !error) {
      if (!wasActive || context.state !== 'running') {
        const token = revision
        ignoreRejection(resumeContext().then(() => {
          if (!disposed && revision === token) reconcile()
        }))
      }
      reconcile()
    }
    return publish()
  }

  function startNavigation({ id, section = environment.section, direction = 0 } = {}) {
    if (disposed || id === undefined || id === null || id === lastNavigationId || !canPlay()) return false
    const key = sectionKey(section)
    const buffer = buffers.get(key)
    if (!buffer) return false // Never replay a navigation later after loading.
    lastNavigationId = id
    activeNavigationId = id
    environment.section = key
    for (const voice of effects) stopVoice(voice, 0.025)
    const horizontal = typeof direction === 'string'
      ? (direction === 'left' ? -1 : direction === 'right' ? 1 : 0) : Math.sign(Number(direction) || 0)
    const volume = bounded(effectSpecs[key]?.gain, 0.2, MENU_SOUND_LIMITS.effectGain)
    try {
      updateAmbientProfile()
      const voice = makeVoice(buffer, volume, { pan: horizontal * 0.28 })
      effects.add(voice)
      return true
    } catch {
      blocked = true
      stopAll(0)
      publish()
      return false
    }
  }

  function endNavigation(id) {
    if (id !== activeNavigationId) return false
    activeNavigationId = null
    for (const voice of effects) stopVoice(voice, 0.08)
    return true
  }

  function dispose() {
    if (disposed) return
    disposed = true
    contextGeneration += 1
    enabled = false
    revision += 1
    loadRevision += 1
    clearSuspendTimer()
    for (const controller of controllers) controller.abort()
    controllers.clear()
    stopAll(0)
    effects.clear()
    context?.removeEventListener?.('statechange', handleContextState)
    disconnect(ambientFilter)
    disconnect(master)
    if (context && context.state !== 'closed') {
      try { ignoreRejection(context.close()) } catch { /* Best-effort teardown. */ }
    }
    buffers.clear()
    ready = false
    loading = null
    publish()
    listeners.clear()
  }

  return Object.freeze({
    enableFromGesture, disable, setEnvironment, startNavigation, endNavigation,
    getState, dispose,
    subscribe(listener) {
      if (typeof listener !== 'function' || disposed) return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  })
}
