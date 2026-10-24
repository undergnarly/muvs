import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createFilmLeakController, dispatchFilmTransition, dispatchFilmTransitionEnd,
    consumeFilmTransition, takeFilmTransition,
    FILM_LEAK_CLIPS, FILM_DUST_CLIPS, FILM_DUST_DURATION,
    FILM_TRANSITION_EVENT, FILM_TRANSITION_END_EVENT,
    filmDeadline, filmLeakIdleDelay, filmDustIdleDelay, filmLeakSeek, filmLeakPlaybackPlan, waitForFilmMedia,
} from './filmLeak.js';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function clock() {
    let time = 0;
    let id = 0;
    const tasks = new Map();
    const setTimer = (fn, delay) => { tasks.set(++id, { fn, due: time + delay }); return id; };
    const clearTimer = (key) => tasks.delete(key);
    return { tasks, setTimer, clearTimer, now: () => time, tick(ms) {
        const until = time + ms;
        for (;;) {
            const next = [...tasks].filter(([, value]) => value.due <= until).sort((a, b) => a[1].due - b[1].due)[0];
            if (!next) break;
            tasks.delete(next[0]); time = next[1].due; next[1].fn();
        }
        time = until;
    } };
}

test('both film families have bounded jitter and excerpt seeking leaves the visible duration plus margin', () => {
    assert.equal(filmLeakIdleDelay(() => 0), 9000);
    assert.equal(filmLeakIdleDelay(() => 1), 15000);
    assert.equal(filmLeakSeek(1.2, () => 0), 0);
    assert.ok(filmLeakSeek(1.2, () => 1) <= .1);
    assert.equal(filmLeakSeek(.5, () => .8), 0);
    assert.equal(filmLeakSeek(NaN, () => .8), 0);
    assert.equal(filmLeakSeek(Infinity, () => .8), 0);
    assert.equal(filmDustIdleDelay(() => 0), 6000);
    assert.equal(filmDustIdleDelay(() => 1), 7000);
    assert.equal(FILM_DUST_DURATION, 2400);
    assert.ok(filmLeakSeek(3, () => 1, FILM_DUST_DURATION / 1000) <= .5);
    assert.ok(filmLeakSeek(3, () => 1, FILM_DUST_DURATION / 1000) > .49);
    assert.equal(filmLeakSeek(2, () => 1, FILM_DUST_DURATION / 1000), 0);
    assert.equal(filmLeakSeek(2, () => 1, NaN), filmLeakSeek(2, () => 1));
    assert.equal(FILM_LEAK_CLIPS.length, 4);
    assert.deepEqual(FILM_DUST_CLIPS, ['a', 'b', 'c', 'd'].map(name => `/videos/atmosphere/film-dust-${name}-v1.mp4`));
});

test('no media source, warming or timer until splash/preferences permit motion; no initial-route pulse', async () => {
    const c = clock(); const played = []; const warmed = []; const stops = [];
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => played.push(args), warm: src => warmed.push(src), stop: mode => stops.push(mode) });
    effect.routeChanged('/');
    assert.equal(effect.trigger(), false);
    for (const mode of ['waiting', 'still', 'paused', 'waiting']) { effect.setMode(mode); effect.routeChanged(`/${mode}`); }
    assert.equal(played.length, 0); assert.equal(warmed.length, 0); assert.equal(c.tasks.size, 0);
    effect.setMode('running');
    assert.equal(warmed.length, 1); assert.equal(warmed[0], FILM_LEAK_CLIPS[0]); assert.equal(c.tasks.size, 1);
    await flush(); assert.equal(played.length, 0);
    assert.equal(effect.routeChanged('/waiting'), false);
    assert.equal(effect.routeChanged('/veiled'), true);
    await flush(); assert.equal(played.length, 1); assert.equal(played[0].opacity, .7);
    effect.dispose(); assert.equal(c.tasks.size, 0); assert.equal(stops.at(-1), 'running');
});

test('one active pulse coalesces rapid transitions and schedules next idle after completion', async () => {
    const c = clock(); const played = []; let pulse = deferred();
    const effect = createFilmLeakController({ ...c, dustClips: [], random: () => .5, play: args => { played.push(args); return pulse.promise; } });
    effect.setMode('running'); assert.equal(c.tasks.size, 1);
    assert.equal(effect.trigger(), true); assert.equal(effect.trigger(), false);
    await flush(); assert.equal(played.length, 1); assert.equal(c.tasks.size, 0);
    c.tick(14000); assert.equal(effect.trigger(), false); assert.equal(c.tasks.size, 0);
    pulse.resolve(); await flush();
    assert.equal(c.tasks.size, 1); assert.equal([...c.tasks.values()][0].due, c.now() + 12000);
    pulse = deferred(); c.tick(12000); await flush();
    assert.equal(played.length, 2); assert.equal(played[1].kind, 'idle'); assert.equal(played[1].opacity, .32);
    assert.notEqual(played[0].clip, played[1].clip, 'consecutive pulses vary even with a fixed random value');
    effect.dispose(); assert.equal(played[1].signal.aborted, true);
});

test('dust uses the same single player and retains a six-second start-to-start cadence', async () => {
    const c = clock(); const played = []; let pulse = deferred();
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => { played.push({ ...args, at: c.now() }); return pulse.promise; } });
    effect.setMode('running');
    assert.equal(c.tasks.size, 1); assert.equal([...c.tasks.values()][0].due, 6000);
    c.tick(5999); await flush(); assert.equal(played.length, 0);
    c.tick(1); await flush();
    assert.equal(played.length, 1); assert.equal(played[0].variant, 'dust');
    assert.equal(played[0].kind, 'dust'); assert.equal(played[0].duration, 2400);
    assert.equal(played[0].opacity, .5); assert.equal(played[0].clip, FILM_DUST_CLIPS[0]);
    assert.equal(c.tasks.size, 0, 'no second deadline timer while the shared player is active');
    c.tick(2400); pulse.resolve(); await flush();
    assert.equal(c.tasks.size, 1); assert.equal([...c.tasks.values()][0].due, 9200, 'overdue light idle waits for 800ms of quiet');
    pulse = deferred(); c.tick(800); await flush();
    assert.equal(played[1].variant, 'leak'); assert.equal(played[1].opacity, .32);
    c.tick(1000); pulse.resolve(); await flush();
    assert.equal(c.tasks.size, 1); assert.equal([...c.tasks.values()][0].due, 12000, 'dust deadline is not moved by the light pulse');
    pulse = deferred(); c.tick(1800); await flush();
    assert.equal(played[2].variant, 'dust'); assert.equal(played[2].at - played[0].at, 6000);
    assert.notEqual(played[2].clip, played[0].clip, 'each family avoids consecutive identical excerpts');
    effect.dispose();
});

test('idle effects preserve the dust deadline and wait for quiet without chaining flashes', async () => {
    const c = clock(); const played = []; let pulse = deferred();
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => { played.push({ ...args, at: c.now() }); return pulse.promise; } });
    effect.setMode('running');
    c.tick(5500); assert.equal(effect.trigger('transition'), true); await flush();
    assert.equal(played[0].variant, 'leak'); assert.equal(played[0].duration, 1000);
    c.tick(1000); assert.equal(effect.trigger('gesture'), false); assert.equal(c.tasks.size, 0);
    pulse.resolve(); await flush();
    assert.equal([...c.tasks.values()][0].due, 7300, 'delayed dust respects 800ms quiet and the 1.5s start cooldown');
    c.tick(799); assert.equal(effect.trigger('idle'), false); await flush(); assert.equal(played.length, 1);
    pulse = deferred(); c.tick(1); await flush();
    assert.equal(played.length, 2); assert.equal(played[1].variant, 'dust'); assert.equal(played[1].at, 7300);
    assert.equal(effect.trigger('idle'), false);
    c.tick(2400); pulse.resolve(); await flush();
    assert.equal([...c.tasks.values()][0].due, 13300, 'next dust is six seconds from its actual delayed start');
    effect.dispose();
});

test('navigation preempts dust synchronously, keeps its deadline and rejects stale completion or overlapping input', async () => {
    const c = clock(); const played = []; const pulses = []; const open = new Set();
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => {
        assert.equal(open.size, 0, 'one shared decoder operation at a time');
        open.add(args);
        args.signal.addEventListener('abort', () => open.delete(args), { once: true });
        const pulse = deferred(); pulses.push(pulse); played.push({ ...args, at: c.now() });
        return pulse.promise.finally(() => open.delete(args));
    } });
    effect.setMode('running'); c.tick(6000); await flush();
    assert.equal(played[0].variant, 'dust');
    c.tick(100); assert.equal(effect.trigger('transition'), true);
    assert.equal(played[0].signal.aborted, true, 'abort reaches the old decoder synchronously before replacement starts');
    assert.equal(open.size, 0); await flush();
    assert.equal(played.length, 2); assert.equal(played[1].kind, 'transition');
    assert.equal(played[1].at, 6100); assert.equal(open.size, 1); assert.equal(c.tasks.size, 0);
    pulses[0].resolve(); await flush();
    assert.equal(effect.snapshot().active, true); assert.equal(c.tasks.size, 0, 'old completion cannot restore idle scheduling');
    c.tick(1000); pulses[1].resolve(); await flush();
    assert.equal([...c.tasks.values()][0].due, 12000, 'navigation does not reset the original dust deadline');
    c.tick(499); assert.equal(effect.trigger('gesture'), false, 'accepted navigation has its own 1.5 second cooldown');
    c.tick(1); assert.equal(effect.trigger('gesture'), true, 'accepted input can bypass idle quiet 500ms after the previous pulse ended');
    await flush(); assert.equal(played.length, 3); assert.equal(played[2].kind, 'gesture');
    c.tick(2000); assert.equal(effect.trigger('transition'), false, 'an active accepted transition coalesces input even after its cooldown');
    pulses[2].resolve(); await flush();
    assert.equal([...c.tasks.values()][0].due, 12000);
    c.tick(2400); await flush(); assert.equal(played[3].variant, 'dust');
    effect.setMode('paused'); assert.equal(played[3].signal.aborted, true);
    assert.equal(open.size, 0); assert.equal(c.tasks.size, 0);
    pulses[3].resolve(); await flush(); assert.equal(c.tasks.size, 0);
    effect.dispose(); assert.equal(c.tasks.size, 0);
});

test('accepted gestures preempt a pending idle leak without inheriting its start cooldown or quiet window', async () => {
    const c = clock(); const played = []; const idle = deferred(); const nav = deferred();
    const effect = createFilmLeakController({ ...c, dustClips: [], random: () => 0, play: args => {
        played.push(args); return args.kind === 'idle' ? idle.promise : nav.promise;
    } });
    effect.setMode('running'); c.tick(9000); await flush();
    assert.equal(played[0].kind, 'idle'); c.tick(100);
    assert.equal(effect.gesture(.13, 0), true);
    assert.equal(played[0].signal.aborted, true); await flush();
    assert.equal(played[1].kind, 'gesture'); assert.equal(c.tasks.size, 0);
    idle.resolve(); await flush(); assert.equal(effect.snapshot().active, true); assert.equal(c.tasks.size, 0);
    effect.dispose(); assert.equal(played[1].signal.aborted, true);
    nav.resolve(); await flush(); assert.equal(c.tasks.size, 0);
});

test('dust cancellation and visibility resume discard stale deadlines instead of replaying hidden pulses', async () => {
    const c = clock(); const played = []; const pulse = deferred();
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => { played.push(args); return pulse.promise; } });
    effect.setMode('running'); c.tick(6000); await flush();
    assert.equal(played[0].variant, 'dust');
    effect.setMode('paused'); assert.equal(played[0].signal.aborted, true); assert.equal(c.tasks.size, 0);
    c.tick(30000); effect.setMode('running');
    assert.equal(c.tasks.size, 1); assert.equal([...c.tasks.values()][0].due, 42000);
    pulse.resolve(); await flush(); assert.equal(played.length, 1); assert.equal(c.tasks.size, 1);
    effect.setMode('still'); assert.equal(c.tasks.size, 0);
    effect.dispose();
});

test('both gesture axes accumulate deliberately and use a cooldown, not every input frame', async () => {
    const c = clock(); const played = [];
    const effect = createFilmLeakController({ ...c, play: args => played.push(args) });
    effect.setMode('running');
    assert.equal(effect.gesture(.07, 0), false); c.tick(50);
    assert.equal(effect.gesture(.07, 0), true); await flush();
    assert.equal(effect.gesture(0, .2), false); c.tick(1600);
    assert.equal(effect.gesture(0, -.13), true); await flush();
    c.tick(1600); effect.gesture(.08, 0); c.tick(201);
    assert.equal(effect.gesture(.08, 0), false, 'separate small gestures do not accumulate forever');
    effect.setMode('paused'); effect.gesture(.2, .2); effect.setMode('running');
    assert.equal(effect.gesture(.05, 0), false, 'resume drops paused gesture samples');
    effect.dispose(); assert.equal(played.length, 2);
});

test('hidden/preferences cancel pending native play; late resolutions cannot schedule stale flashes', async () => {
    const c = clock(); const played = []; const pending = deferred(); let stopped = 0;
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => { played.push(args); return pending.promise; }, stop: () => stopped++ });
    effect.setMode('running'); effect.trigger(); await flush();
    effect.setMode('paused'); assert.equal(played[0].signal.aborted, true); assert.equal(c.tasks.size, 0); assert.equal(stopped, 1);
    effect.setMode('running'); assert.equal(c.tasks.size, 1);
    pending.resolve(); await flush(); assert.equal(c.tasks.size, 1); assert.equal(effect.snapshot().active, false);
    effect.setMode('still'); assert.equal(c.tasks.size, 0); assert.equal(effect.trigger(), false);
    effect.dispose(); effect.setMode('running'); assert.equal(c.tasks.size, 0);
});

test('sync/async media failures never escape or remove the next idle attempt', async () => {
    const c = clock();
    const effect = createFilmLeakController({ ...c, random: () => 0, warm: () => { throw Error('offline'); }, play: () => { throw Error('decode'); } });
    effect.setMode('running'); effect.trigger(); await flush();
    assert.equal(effect.snapshot().active, false); assert.equal(c.tasks.size, 1);
    c.tick(9000); await flush(); assert.equal(c.tasks.size, 1);
    effect.dispose();
});

test('StrictMode-like disposal before the play microtask cannot start an orphan decoder', async () => {
    const c = clock(); let plays = 0; let stops = 0;
    const options = { ...c, play: () => plays++, stop: () => stops++ };
    const first = createFilmLeakController(options);
    first.setMode('running'); first.trigger(); first.dispose();
    const second = createFilmLeakController(options);
    second.setMode('running'); await flush();
    assert.equal(plays, 0); assert.equal(stops, 1); assert.equal(c.tasks.size, 1);
    second.trigger(); await flush(); assert.equal(plays, 1);
    second.dispose(); assert.equal(stops, 2); assert.equal(c.tasks.size, 0);
});

test('deadline bounds stalled play and removes timeout on abort or successful completion', async () => {
    const c = clock(); const pending = deferred(); const abort = new AbortController();
    const cancelled = filmDeadline(pending.promise, { ...c, signal: abort.signal, timeout: 1000 });
    assert.equal(c.tasks.size, 1); abort.abort();
    await assert.rejects(cancelled, { name: 'AbortError' }); assert.equal(c.tasks.size, 0);
    pending.resolve(); await flush(); assert.equal(c.tasks.size, 0);
    const timed = filmDeadline(new Promise(() => {}), { ...c, timeout: 500 }); c.tick(500);
    await assert.rejects(timed, /timed out/); assert.equal(c.tasks.size, 0);
    assert.equal(await filmDeadline(Promise.resolve(42), { ...c }), 42); assert.equal(c.tasks.size, 0);
});

test('readiness listener cleanup survives abort, media error and seek completion', async () => {
    const video = new EventTarget(); const listeners = new Map(); let ready = false; const abort = new AbortController();
    const add = video.addEventListener.bind(video); const remove = video.removeEventListener.bind(video);
    video.addEventListener = (type, fn, options) => { listeners.set(fn, type); add(type, fn, options); };
    video.removeEventListener = (type, fn) => { listeners.delete(fn); remove(type, fn); };
    const pending = waitForFilmMedia(video, () => ready, ['seeked', 'loadeddata'], { signal: abort.signal });
    abort.abort(); await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(listeners.size, 0);
    ready = true; video.dispatchEvent(new Event('seeked')); await flush();
    ready = false;
    const errored = waitForFilmMedia(video, () => ready, ['loadeddata']);
    video.dispatchEvent(new Event('error')); await assert.rejects(errored, /unavailable/);
    assert.equal(listeners.size, 0);
    const loaded = waitForFilmMedia(video, () => ready, ['seeked']);
    ready = true; video.dispatchEvent(new Event('seeked')); await loaded;
    assert.equal(listeners.size, 0);
});

test('transition emitter is optional outside the browser and never claims navigation', () => {
    dispatchFilmTransition({ phase: 'menu' }, undefined);
    const emitted = [];
    const target = { CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, dispatchEvent: value => emitted.push(value) };
    dispatchFilmTransition({ phase: 'floor' }, target);
    assert.equal(emitted[0].type, FILM_TRANSITION_EVENT); assert.deepEqual(emitted[0].detail, { phase: 'floor' });
});

test('fresh transition handoff bridges a late overlay mount exactly once for its own target', () => {
    const target = { CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, dispatchEvent() {} };
    const other = { ...target };
    dispatchFilmTransition({ phase: 'menu' }, target, { now: () => 100 });
    assert.equal(consumeFilmTransition({ target: other, now: () => 200 }), false);
    assert.equal(consumeFilmTransition({ target, now: () => 200 }), true);
    assert.equal(consumeFilmTransition({ target, now: () => 201 }), false);
    dispatchFilmTransition({ phase: 'floor' }, target, { now: () => 300 });
    dispatchFilmTransition({ phase: 'menu' }, target, { now: () => 400 });
    assert.equal(consumeFilmTransition({ target, now: () => 450 }), true, 'latest event replaces older pending events, never queues');
    assert.equal(consumeFilmTransition({ target, now: () => 450 }), false);
});

test('handoff expires after its bounded age and a blocked listener can consume and discard it', () => {
    const target = { CustomEvent: class {}, dispatchEvent() {} };
    dispatchFilmTransition({}, target, { now: () => 100 });
    assert.equal(consumeFilmTransition({ target, now: () => 2101 }), false);
    assert.equal(consumeFilmTransition({ target, now: () => 200 }), false, 'expired handoff was removed');
    dispatchFilmTransition({}, target, { now: () => 3000 });
    assert.equal(consumeFilmTransition({ target, now: () => 3100, maxAge: 100 }), true, 'inclusive deadline is fresh');
    assert.equal(consumeFilmTransition({ target, now: () => 3101 }), false, 'blocked caller already consumed the event');
    dispatchFilmTransition({}, target, { now: () => 4000 });
    assert.equal(consumeFilmTransition({ target, now: () => 3999 }), false, 'clock rollback cannot retain a pending event indefinitely');
});

test('normal synchronous listeners consume the handoff before a late mount can repeat it', () => {
    let consumed = false;
    const target = {
        CustomEvent: class {},
        dispatchEvent() { consumed = consumeFilmTransition({ target, now: () => 500 }); },
    };
    dispatchFilmTransition({}, target, { now: () => 500 });
    assert.equal(consumed, true);
    assert.equal(consumeFilmTransition({ target, now: () => 501 }), false);
});

test('managed handoff carries the current detail and matching end clears it before any late mount', () => {
    const emitted = [];
    const target = { CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, dispatchEvent: event => emitted.push(event) };
    const detail = { managed: true, id: 'menu-1', startedAt: 100 };
    dispatchFilmTransition(detail, target, { now: () => 100 });
    const record = takeFilmTransition({ target, now: () => 110 });
    assert.deepEqual(record.detail, detail); assert.equal(record.at, 100);
    assert.ok(Number.isInteger(record.serial));
    assert.equal(takeFilmTransition({ target, now: () => 110 }), undefined);
    dispatchFilmTransition({ managed: true, id: 'menu-2', startedAt: 200 }, target, { now: () => 200 });
    dispatchFilmTransitionEnd('menu-1', target);
    const newer = takeFilmTransition({ target, now: () => 210 });
    assert.equal(newer.detail.id, 'menu-2'); assert.ok(newer.serial > record.serial);
    dispatchFilmTransition({ managed: true, id: 'menu-3', startedAt: 300 }, target, { now: () => 300 });
    dispatchFilmTransitionEnd('menu-3', target);
    assert.equal(takeFilmTransition({ target, now: () => 301 }), undefined, 'ended motion cannot appear after a late scene mount');
    assert.equal(emitted.at(-1).type, FILM_TRANSITION_END_EVENT);
    assert.deepEqual(emitted.at(-1).detail, { id: 'menu-3' });
});

test('managed navigation invokes play in the accepted call, preempts dust and holds until actual motion ends', async () => {
    const c = clock(); const played = []; const pulses = []; const open = new Set();
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => {
        assert.equal(open.size, 0);
        open.add(args); args.signal.addEventListener('abort', () => open.delete(args), { once: true });
        const pulse = deferred(); pulses.push(pulse); played.push(args);
        return pulse.promise.finally(() => open.delete(args));
    } });
    assert.equal(effect.beginTransition({ managed: true, id: 'blocked', startedAt: 0 }), false);
    effect.setMode('running'); c.tick(6000); await flush();
    assert.equal(played[0].variant, 'dust');
    c.tick(100);
    assert.equal(effect.beginTransition({ managed: true, id: 'menu', startedAt: 6100 }), true);
    assert.equal(played.length, 2, 'managed play starts synchronously, not after a decode/microtask');
    const payload = played[1];
    assert.equal(played[0].signal.aborted, true); assert.equal(open.size, 1);
    assert.equal(payload.managed, true); assert.equal(payload.opacity, .7);
    assert.equal(payload.startedAt, 6100); assert.equal(payload.variant, 'leak');
    assert.ok(payload.ended instanceof Promise); assert.equal(payload.motionSignal.aborted, false);
    assert.equal(c.tasks.size, 1, 'only the bounded managed watchdog is active');
    assert.equal(effect.trigger('transition'), false, 'legacy route callbacks cannot replace managed camera motion');
    c.tick(1000); assert.equal(effect.endTransition('old-id'), false);
    assert.equal(effect.endTransition('menu'), true); assert.equal(payload.motionSignal.aborted, true);
    assert.equal(payload.signal.aborted, false, 'actual end permits component fade before the main operation is aborted');
    await payload.ended; assert.equal(c.tasks.size, 0);
    pulses[0].resolve(); await flush(); assert.equal(effect.snapshot().active, true);
    c.tick(100); pulses[1].resolve(); await flush();
    assert.equal(effect.snapshot().active, false); assert.equal([...c.tasks.values()][0].due, 12000, 'dust cadence survives managed navigation');
    effect.dispose();
});

test('managed retargets extend one hold without restarting media and ignore stale end ids', async () => {
    const c = clock(); const played = []; const pulse = deferred();
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => { played.push(args); return pulse.promise; } });
    effect.setMode('running');
    assert.equal(effect.beginTransition({ managed: true, id: 1, startedAt: 0 }), true);
    assert.equal([...c.tasks.values()][0].due, 8000);
    c.tick(300); assert.equal(effect.beginTransition({ managed: true, id: 2, startedAt: 300 }), true);
    assert.equal(played.length, 1); assert.equal(c.tasks.size, 1);
    assert.equal([...c.tasks.values()][0].due, 8300);
    assert.equal(effect.endTransition(1), false); assert.equal(played[0].motionSignal.aborted, false);
    assert.equal(effect.endTransition(2), true); await played[0].ended;
    assert.equal(played[0].signal.aborted, false); assert.equal(c.tasks.size, 0);
    c.tick(20); assert.equal(effect.beginTransition({ managed: true, id: 3, startedAt: 320 }), true, 'a newly accepted motion replaces an already ending fade');
    assert.equal(played.length, 2); assert.equal(played[0].signal.aborted, true);
    assert.equal(effect.endTransition(2), false); assert.equal(played[1].motionSignal.aborted, false);
    effect.dispose(); assert.equal(played[1].motionSignal.aborted, true);
    assert.equal(played[1].signal.aborted, true); assert.equal(c.tasks.size, 0);
    pulse.resolve(); await flush(); assert.equal(c.tasks.size, 0);
});

test('motion end before video readiness cancels late presentation without scheduling a delayed leak', async () => {
    const c = clock(); const decode = deferred(); const fade = deferred(); const played = []; let lateFrames = 0;
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => {
        played.push(args);
        decode.promise.then(() => { if (!args.motionSignal.aborted && !args.signal.aborted) lateFrames++; });
        return args.ended.then(() => fade.promise);
    } });
    effect.setMode('running'); effect.beginTransition({ managed: true, id: 'quick', startedAt: 0 });
    assert.equal(played.length, 1); assert.equal(effect.endTransition('quick'), true);
    assert.equal(played[0].motionSignal.aborted, true); assert.equal(played[0].signal.aborted, false);
    c.tick(100); fade.resolve(); await flush();
    assert.equal(effect.snapshot().active, false); assert.equal(c.tasks.size, 1);
    decode.resolve(); await flush(); assert.equal(lateFrames, 0); assert.equal(played.length, 1);
    effect.dispose();
});

test('managed watchdog ends a lost camera transition at eight seconds without shortening its final fade', async () => {
    const c = clock(); const fade = deferred(); let payload;
    const effect = createFilmLeakController({ ...c, random: () => 0, play: args => {
        payload = args; return args.ended.then(() => fade.promise);
    } });
    effect.setMode('running'); effect.beginTransition({ managed: true, id: 'lost', startedAt: 0 });
    c.tick(7999); assert.equal(payload.motionSignal.aborted, false);
    c.tick(1); assert.equal(payload.motionSignal.aborted, true);
    assert.equal(payload.signal.aborted, false); await payload.ended;
    assert.equal(c.tasks.size, 0);
    c.tick(100); fade.resolve(); await flush();
    assert.equal(effect.snapshot().active, false); assert.equal(c.tasks.size, 1);
    effect.dispose();
});

test('hidden/preferences and StrictMode disposal resolve managed holds and abort every owned signal/timer', async () => {
    const c = clock(); const played = []; const pending = deferred();
    const options = { ...c, random: () => 0, play: args => { played.push(args); return pending.promise; } };
    const first = createFilmLeakController(options);
    first.setMode('running'); first.beginTransition({ managed: true, id: 'strict', startedAt: 0 });
    first.dispose(); assert.equal(played[0].signal.aborted, true); assert.equal(played[0].motionSignal.aborted, true);
    await played[0].ended; assert.equal(c.tasks.size, 0);
    const second = createFilmLeakController(options);
    second.setMode('running'); assert.equal(played.length, 1, 'remount never replays the old hold');
    second.beginTransition({ managed: true, id: 'current', startedAt: 0 });
    second.setMode('paused'); await played[1].ended;
    assert.equal(played[1].signal.aborted, true); assert.equal(played[1].motionSignal.aborted, true);
    assert.equal(c.tasks.size, 0); assert.equal(second.endTransition('current'), false);
    second.setMode('still'); assert.equal(second.beginTransition({ managed: true, id: 'reduced' }), false);
    pending.resolve(); await flush(); assert.equal(c.tasks.size, 0);
    second.dispose();
});

test('configured light idle uses its own duration, opacity and completion-relative interval', async () => {
    const c = clock(); const played = []; const pending = deferred(); const warmed = [];
    const effect = createFilmLeakController({ ...c, random: () => 0,
        settings: {
            transition: { enabled: false }, filmDust: { enabled: false },
            lightLeaks: { durationSeconds: 2.6, opacity: .18, intervalMinSeconds: 4, intervalMaxSeconds: 4 },
        },
        warm: clip => warmed.push(clip), play: args => { played.push(args); return pending.promise; },
    });
    effect.setMode('running'); assert.equal(warmed[0], FILM_LEAK_CLIPS[0]);
    assert.equal(effect.trigger(), false); assert.equal(c.tasks.size, 1);
    assert.equal([...c.tasks.values()][0].due, 4000);
    c.tick(4000); await flush();
    assert.equal(played[0].kind, 'idle'); assert.equal(played[0].duration, 2600); assert.equal(played[0].opacity, .18);
    c.tick(2600); pending.resolve(); await flush();
    assert.equal([...c.tasks.values()][0].due, 10600);
    effect.dispose();
});

test('configured dust keeps its own start cadence and does not warm disabled light media', async () => {
    const c = clock(); const played = []; const pending = deferred(); const warmed = [];
    const effect = createFilmLeakController({ ...c, random: () => 0,
        settings: {
            transition: { enabled: false }, lightLeaks: { enabled: false },
            filmDust: { durationSeconds: 3.7, opacity: .21, intervalMinSeconds: 5, intervalMaxSeconds: 5 },
        },
        warm: clip => warmed.push(clip), play: args => { played.push(args); return pending.promise; },
    });
    effect.setMode('running'); assert.deepEqual(warmed, [FILM_DUST_CLIPS[0]]);
    assert.equal([...c.tasks.values()][0].due, 5000);
    c.tick(5000); await flush();
    assert.equal(played[0].duration, 3700); assert.equal(played[0].opacity, .21); assert.equal(played[0].variant, 'dust');
    c.tick(3700); pending.resolve(); await flush();
    assert.equal([...c.tasks.values()][0].due, 10000);
    effect.dispose();
});

test('disabled and zero-opacity families never warm, start decoders or schedule idle retries', async () => {
    for (const settings of [
        { transition: { enabled: false }, lightLeaks: { enabled: false }, filmDust: { enabled: false } },
        { transition: { opacity: 0 }, lightLeaks: { opacity: 0 }, filmDust: { opacity: 0 } },
    ]) {
        const c = clock(); let warmed = 0; let plays = 0;
        const effect = createFilmLeakController({ ...c, settings, warm: () => warmed++, play: () => plays++ });
        effect.setMode('running');
        assert.equal(effect.trigger('transition'), false); assert.equal(effect.trigger('gesture'), false);
        assert.equal(effect.trigger('idle'), false); assert.equal(effect.trigger('dust'), false);
        assert.equal(effect.beginTransition({ managed: true, id: 'invisible', startedAt: 0 }), false);
        c.tick(200000); await flush();
        assert.equal(warmed, 0); assert.equal(plays, 0); assert.equal(c.tasks.size, 0);
        effect.dispose();
    }
});

test('transition settings control exact opacity and fade while managed hold still follows the camera end', async () => {
    const c = clock(); const played = []; const pulses = [];
    const effect = createFilmLeakController({ ...c, random: () => 0,
        settings: {
            transition: { durationSeconds: 1.2, opacity: .12, fadeOutMs: 420 },
            lightLeaks: { enabled: false }, filmDust: { enabled: false },
        },
        play: args => { played.push(args); const pulse = deferred(); pulses.push(pulse); return pulse.promise; },
    });
    effect.setMode('running'); assert.equal(c.tasks.size, 0);
    effect.beginTransition({ managed: true, id: 'custom', startedAt: 0 });
    assert.equal(played[0].opacity, .12); assert.equal(played[0].fadeOutMs, 420);
    c.tick(2500); assert.equal(played[0].motionSignal.aborted, false, 'a fixed duration never cuts managed camera motion');
    effect.endTransition('custom'); await played[0].ended;
    c.tick(420); pulses[0].resolve(); await flush(); assert.equal(c.tasks.size, 0);
    assert.equal(effect.trigger('gesture'), true); await flush();
    assert.equal(played[1].duration, 2000, 'legacy navigation retains the 1s baseline, scaled by configured duration / .6s');
    assert.equal(played[1].opacity, .12); assert.equal(played[1].fadeOutMs, 420);
    effect.dispose();
});

test('reconfiguration disposal aborts an active effect and leaves no stale timer when every film family is disabled', async () => {
    const c = clock(); let payload; const pending = deferred();
    const old = createFilmLeakController({ ...c, play: args => { payload = args; return pending.promise; } });
    old.setMode('running'); old.beginTransition({ managed: true, id: 'old', startedAt: 0 });
    old.dispose(); await payload.ended;
    assert.equal(payload.signal.aborted, true); assert.equal(payload.motionSignal.aborted, true);
    const next = createFilmLeakController({ ...c, settings: { transition: { enabled: false }, lightLeaks: { opacity: 0 }, filmDust: { opacity: 0 } } });
    next.setMode('running'); pending.resolve(); await flush();
    assert.equal(c.tasks.size, 0); assert.equal(next.snapshot().active, false);
    next.dispose();
});

test('controller normalizes saved values and exposes zero-duration managed fade without a hard minimum', async () => {
    const c = clock(); let payload;
    const effect = createFilmLeakController({ ...c, random: () => .5,
        settings: { transition: { opacity: '0.05', fadeOutMs: 0 }, lightLeaks: { enabled: false }, filmDust: { intervalMinSeconds: '8', intervalMaxSeconds: '4' } },
        play: args => { payload = args; return args.ended ?? Promise.resolve(); },
    });
    effect.setMode('running'); assert.equal([...c.tasks.values()][0].due, 6000);
    effect.beginTransition({ managed: true, id: 1, startedAt: 0 });
    assert.equal(payload.opacity, .05); assert.equal(payload.fadeOutMs, 0);
    effect.endTransition(1); await flush(); effect.dispose();
});

test('playback loops safely when a configurable effect outlasts its source clip', () => {
    assert.deepEqual(filmLeakPlaybackPlan(1.25, { duration: 3000, random: () => 1 }), { loop: true, time: 0 });
    assert.deepEqual(filmLeakPlaybackPlan(2.5, { duration: 4000, random: () => 1 }), { loop: true, time: 0 });
    const short = filmLeakPlaybackPlan(1.25, { duration: 1000, random: () => 1 });
    assert.equal(short.loop, false); assert.ok(short.time <= .15 && short.time > .14);
    assert.deepEqual(filmLeakPlaybackPlan(1.25, { duration: 300, navigation: true }), { loop: true, time: 0 });
});
