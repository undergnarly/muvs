import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDashboardStats } from './dashboardStats.js';

test('missing and older analytics snapshots render honest zero values without throwing', () => {
    for (const source of [undefined, null, {}, [], { daily: null, sources: [], countries: null }]) {
        assert.deepEqual(normalizeDashboardStats(source), { totalVisits: 0, detailViews: 0, daily: {}, sources: {}, pages: {}, countries: {} });
    }
});

test('historic counts remain intact; malformed or nonfinite counts never enter charts', () => {
    const source = { totalVisits: '12', detailViews: 3, daily: { '2026-10-25': 8, bad: -1 }, sources: { direct: 4, bad: 'NaN' }, pages: { '/': Infinity }, countries: { ID: 2 } };
    const snapshot = structuredClone(source);
    assert.deepEqual(normalizeDashboardStats(source), { totalVisits: 12, detailViews: 3, daily: { '2026-10-25': 8, bad: 0 }, sources: { direct: 4, bad: 0 }, pages: { '/': 0 }, countries: { ID: 2 } });
    assert.deepEqual(source, snapshot);
});
