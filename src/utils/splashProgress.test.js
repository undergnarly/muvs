import test from 'node:test';
import assert from 'node:assert/strict';
import {
    cancelSplashDrawing, completeSplashDrawing, createSplashDrawing,
    SPLASH_DRAWING_BUFFER, SPLASH_PAINT_DURATION, SPLASH_TAG_DURATION, splashProgressStages, updateSplashProgress,
} from './splashProgress.js';

function splash({ css = '12%', aria = '12', stampCss = '12%', hasStamp = true } = {}) {
    const properties = new Map([['--splash-progress', css]]);
    const stampProperties = new Map([['--splash-progress', stampCss]]);
    const attributes = new Map([['aria-valuenow', aria]]);
    const classes = new Set();
    const element = {
        style: {
            getPropertyValue: (name) => properties.get(name) ?? '',
            setProperty: (name, value) => properties.set(name, value),
        },
        getAttribute: (name) => attributes.get(name) ?? null,
        setAttribute: (name, value) => attributes.set(name, value),
    };
    const stamp = {
        style: {
            getPropertyValue: (name) => stampProperties.get(name) ?? '',
            setProperty: (name, value) => stampProperties.set(name, value),
        },
    };
    return {
        doc: { getElementById: (id) => id === 'splash-progress' ? element : (id === 'splash-stamp' && hasStamp ? stamp : (id === 'splash-screen' ? { classList: { contains: (name) => classes.has(name) } } : null)) },
        css: () => properties.get('--splash-progress'),
        stampCss: () => stampProperties.get('--splash-progress'),
        stage: (name) => stampProperties.get(`--splash-${name}-progress`),
        classes,
        aria: () => attributes.get('aria-valuenow'),
    };
}

test('initial actual progress is retained and CSS/ARIA progress stay synchronized', () => {
    const state = splash();
    assert.equal(updateSplashProgress(0, state.doc), 12);
    assert.equal(state.css(), '12%');
    assert.equal(state.stampCss(), '12%');
    assert.equal(state.aria(), '12');
    assert.equal(updateSplashProgress(25, state.doc), 25);
    assert.equal(state.css(), '25%');
    assert.equal(state.stampCss(), '25%');
    assert.equal(state.aria(), '25');
});

test('out-of-order media preparation and late updates cannot regress completed progress', () => {
    const state = splash();
    const results = [65, 25, 90, 100, 65, 90].map((value) => updateSplashProgress(value, state.doc));
    assert.deepEqual(results, [65, 65, 90, 100, 100, 100]);
    assert.equal(state.css(), '100%');
    assert.equal(state.stampCss(), '100%');
    assert.equal(state.aria(), '100');
});

test('both existing inline CSS and ARIA values protect against regression', () => {
    for (const existing of [{ css: '80%', aria: '12' }, { css: '12%', aria: '80' }]) {
        const state = splash(existing);
        assert.equal(updateSplashProgress(65, state.doc), 80);
        assert.equal(state.css(), '80%');
        assert.equal(state.aria(), '80');
    }
});

test('invalid and negative values cannot corrupt progress; large values are capped', () => {
    const state = splash();
    for (const value of [undefined, null, NaN, Infinity, -Infinity, -30, '', 'broken', {}, true, Symbol('invalid')]) {
        assert.equal(updateSplashProgress(value, state.doc), 12);
        assert.equal(state.css(), '12%');
        assert.equal(state.aria(), '12');
    }
    assert.equal(updateSplashProgress(200, state.doc), 100);
    assert.equal(state.css(), '100%');
    assert.equal(state.aria(), '100');
});

test('invalid or out-of-range existing values are normalized', () => {
    const invalid = splash({ css: 'bad%', aria: '-20', stampCss: 'bad%' });
    assert.equal(updateSplashProgress(25, invalid.doc), 25);
    const oversized = splash({ css: '130%', aria: '200' });
    assert.equal(updateSplashProgress(25, oversized.doc), 100);
    assert.equal(oversized.css(), '100%');
    assert.equal(oversized.aria(), '100');
});

test('actual drawing progress and ARIA remain monotonic even if the parent is ahead', () => {
    const state = splash({ stampCss: '85%' });
    assert.equal(updateSplashProgress(65, state.doc), 85);
    assert.equal(state.stampCss(), '85%');
    assert.equal(state.css(), '85%');
    assert.equal(state.aria(), '85');
    assert.equal(updateSplashProgress(100, state.doc), 100);
    assert.equal(state.stampCss(), '100%');
    assert.equal(state.css(), '100%');
    assert.equal(state.aria(), '100');
});

test('legacy or partially removed stamp still updates the progress element safely', () => {
    const state = splash({ hasStamp: false });
    assert.equal(updateSplashProgress(65, state.doc), 65);
    assert.equal(state.css(), '65%');
    assert.equal(state.aria(), '65');
});

test('an empty fresh shared stamp supports a fully hidden zero-percent drawing', () => {
    const state = splash({ css: '0%', aria: '0', stampCss: '0%' });
    assert.equal(updateSplashProgress(0, state.doc), 0);
    assert.equal(state.stampCss(), '0%');
    assert.equal(state.css(), '0%');
    assert.equal(state.aria(), '0');
});

test('numeric strings and fractional progress are safely retained', () => {
    const state = splash();
    assert.equal(updateSplashProgress(' 65.5% ', state.doc), 65.5);
    assert.equal(state.css(), '65.5%');
    assert.equal(state.aria(), '65.5');
    assert.equal(updateSplashProgress('65px', state.doc), 65.5);
});

test('a missing document or already-removed splash is a safe no-op', () => {
    assert.equal(updateSplashProgress(25, null), undefined);
    assert.equal(updateSplashProgress(100, { getElementById: () => null }), undefined);
    assert.equal(updateSplashProgress(90), undefined);
});

test('a new splash is independent of a previously completed element', () => {
    const completed = splash();
    const fresh = splash();
    updateSplashProgress(100, completed.doc);
    assert.equal(updateSplashProgress(25, fresh.doc), 25);
    assert.equal(completed.css(), '100%');
    assert.equal(fresh.css(), '25%');
});

function drawingClock() {
    let time = 0;
    let next = 0;
    const timers = new Map();
    return {
        now: () => time,
        schedule: (callback, delay) => { const id = ++next; timers.set(id, { callback, at: time + delay }); return id; },
        cancel: (id) => timers.delete(id),
        advance(amount) {
            const end = time + amount;
            let earliest;
            while ((earliest = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]) && earliest[1].at <= end) {
                time = earliest[1].at;
                timers.delete(earliest[0]);
                earliest[1].callback();
            }
            time = end;
        },
        pending: () => timers.size,
    };
}

test('real progress has distinct black-tag and paint-over stages', () => {
    assert.deepEqual(splashProgressStages(0), { tag: 0, paint: 0 });
    assert.deepEqual(splashProgressStages(35), { tag: 100, paint: 0 });
    assert.deepEqual(splashProgressStages(100), { tag: 100, paint: 100 });
    assert.equal(splashProgressStages(12).paint, 0);
    assert.equal(splashProgressStages(25).paint, 0);
    assert.ok(Math.abs(splashProgressStages(65).paint - 46.1538461538) < 1e-8);
    for (const value of [NaN, -100, null, Infinity]) assert.deepEqual(splashProgressStages(value), { tag: 0, paint: 0 });
    assert.deepEqual(splashProgressStages(200), { tag: 100, paint: 100 });
});

test('an immediate completion draws the tag first and only then paints over it', async () => {
    const clock = drawingClock();
    const events = [];
    const drawing = createSplashDrawing({ ...clock, reduced: () => false, onTag: (value) => events.push(['tag', value, clock.now()]), onPaint: (value) => events.push(['paint', value, clock.now()]) });
    let complete = false;
    const finished = drawing.finish().then((value) => { complete = value; });
    assert.deepEqual(events, [['tag', 100, 0]]);
    clock.advance(SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER - 1);
    assert.equal(events.length, 1);
    assert.equal(complete, false);
    clock.advance(1);
    assert.deepEqual(events[1], ['paint', 100, SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER]);
    clock.advance(SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER - 1);
    await Promise.resolve();
    assert.equal(complete, false);
    clock.advance(1);
    await finished;
    assert.equal(complete, true);
    assert.equal(clock.pending(), 0);
});

test('late progress during the tag draw cannot prematurely reveal paint', async () => {
    const clock = drawingClock();
    const paint = [];
    const drawing = createSplashDrawing({ ...clock, reduced: () => false, onPaint: (value) => paint.push([value, clock.now()]) });
    drawing.update(12);
    clock.advance(100);
    drawing.update(25);
    clock.advance(50);
    drawing.update(65);
    clock.advance(100);
    const finished = drawing.finish();
    drawing.update(90);
    drawing.update(25);
    clock.advance(SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER - 251);
    assert.deepEqual(paint, []);
    clock.advance(1);
    assert.deepEqual(paint, [[100, SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER]]);
    clock.advance(SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER);
    assert.equal(await finished, true);
    assert.equal(clock.pending(), 0);
});

test('a slowly completed tag has no repeated tag wait before paint', async () => {
    const clock = drawingClock();
    const paint = [];
    const drawing = createSplashDrawing({ ...clock, reduced: () => false, onPaint: (value) => paint.push([value, clock.now()]) });
    drawing.update(35);
    clock.advance(SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER);
    const finished = drawing.finish();
    assert.deepEqual(paint, [[100, SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER]]);
    clock.advance(SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER);
    assert.equal(await finished, true);
    assert.equal(clock.pending(), 0);
});

test('reduced motion completes both drawing stages with no timers or extra delay', async () => {
    const clock = drawingClock();
    const events = [];
    const drawing = createSplashDrawing({ ...clock, reduced: () => true, onTag: (value) => events.push(['tag', value]), onPaint: (value) => events.push(['paint', value]) });
    assert.equal(await drawing.finish(), true);
    assert.deepEqual(events, [['tag', 100], ['paint', 100]]);
    assert.equal(clock.pending(), 0);
});

test('enabling reduced motion cancels an existing visual wait immediately', async () => {
    const clock = drawingClock();
    let reduced = false;
    const paint = [];
    const drawing = createSplashDrawing({ ...clock, reduced: () => reduced, onPaint: (value) => paint.push(value) });
    const finished = drawing.finish();
    clock.advance(100);
    reduced = true;
    drawing.update(100);
    assert.equal(await finished, true);
    assert.deepEqual(paint, [100]);
    assert.equal(clock.pending(), 0);
});

test('cancelling bounded completion clears timers and cannot repaint or reappear', async () => {
    const clock = drawingClock();
    const events = [];
    const drawing = createSplashDrawing({ ...clock, reduced: () => false, onPaint: (value) => events.push(value) });
    const finished = drawing.finish();
    clock.advance(100);
    drawing.cancel();
    assert.equal(await finished, false);
    clock.advance(1000);
    drawing.update(100);
    assert.deepEqual(events, []);
    assert.equal(clock.pending(), 0);
    assert.equal(await drawing.finish(), false);
});

test('the actual DOM helpers keep real ARIA progress while awaiting staged paint', async () => {
    const state = splash();
    const clock = drawingClock();
    const runtime = { ...clock, reduced: () => false };
    assert.equal(updateSplashProgress(65, state.doc, runtime), 65);
    assert.equal(state.aria(), '65');
    assert.equal(state.stage('tag'), '100%');
    assert.equal(state.stage('paint'), undefined);
    const complete = completeSplashDrawing(state.doc, runtime);
    assert.equal(state.aria(), '100');
    assert.equal(state.stage('paint'), undefined);
    clock.advance(SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER);
    assert.equal(state.stage('paint'), '100%');
    clock.advance(SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER);
    assert.equal(await complete, true);
    assert.equal(updateSplashProgress(25, state.doc, runtime), 100);
    assert.equal(clock.pending(), 0);
});

test('failed or hidden splash cancels pending visual completion without changing recovery', async () => {
    for (const unavailable of ['failed', 'hidden']) {
        const state = splash();
        const clock = drawingClock();
        const complete = completeSplashDrawing(state.doc, { ...clock, reduced: () => false });
        state.classes.add(unavailable);
        assert.equal(await completeSplashDrawing(state.doc), false);
        assert.equal(await complete, false);
        clock.advance(1000);
        assert.equal(state.stage('paint'), undefined);
        assert.equal(state.classes.has(unavailable), true);
        assert.equal(clock.pending(), 0);
    }
});

test('route cancellation and re-entry conservatively finish an existing paint transition', async () => {
    const state = splash();
    const clock = drawingClock();
    const runtime = { ...clock, reduced: () => false };
    const cancelled = completeSplashDrawing(state.doc, runtime);
    clock.advance(SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER + 60);
    assert.equal(state.stage('paint'), '100%');
    cancelSplashDrawing(state.doc);
    assert.equal(await cancelled, false);
    const reentered = completeSplashDrawing(state.doc, runtime);
    let completed = false;
    reentered.then((value) => { completed = value; });
    clock.advance(SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER - 1);
    await Promise.resolve();
    assert.equal(completed, false);
    clock.advance(1);
    assert.equal(await reentered, true);
    assert.equal(state.stage('tag'), '100%');
    assert.equal(state.stage('paint'), '100%');
    assert.equal(clock.pending(), 0);
});

test('missing, removed or legacy loading markup needs no additional completion wait', async () => {
    assert.equal(await completeSplashDrawing(null), false);
    assert.equal(await completeSplashDrawing({ getElementById: () => null }), false);
    const legacy = splash({ hasStamp: false });
    assert.equal(await completeSplashDrawing(legacy.doc), true);
    assert.equal(legacy.aria(), '100');
    cancelSplashDrawing(null);
    cancelSplashDrawing(legacy.doc);
});

test('late app mounting uses the original logo clock, not another one-second wait', async () => {
    const clock = drawingClock(); clock.advance(3000);
    const events = [];
    const drawing = createSplashDrawing({ ...clock, tagStartedAt: 0, initialTag: 100, initialPaint: 12,
        reduced: () => false, onPaint: (value) => events.push([value, clock.now()]) });
    const finished = drawing.finish();
    assert.deepEqual(events, [[100, 3000]]);
    clock.advance(SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER);
    assert.equal(await finished, true);
});

test('cached immediate startup respects the remaining logo fade, without restarting it', async () => {
    const clock = drawingClock(); clock.advance(200);
    const events = [];
    const drawing = createSplashDrawing({ ...clock, tagStartedAt: 0, initialTag: 100, initialPaint: 12,
        reduced: () => false, onPaint: (value) => events.push([value, clock.now()]) });
    const finished = drawing.finish();
    clock.advance(SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER - 201);
    assert.deepEqual(events, []);
    clock.advance(1);
    assert.deepEqual(events, [[100, SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER]]);
    clock.advance(SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER);
    assert.equal(await finished, true);
});
