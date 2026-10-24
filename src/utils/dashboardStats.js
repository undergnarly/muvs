const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const count = value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};
const counts = value => Object.fromEntries(Object.entries(record(value)).map(([key, value]) => [key, count(value)]));

// Older databases and public-first session snapshots may not contain analytics.
// Keep the dashboard readable without fabricating new visits or changing data.
export function normalizeDashboardStats(value) {
    const source = record(value);
    return {
        totalVisits: count(source.totalVisits),
        detailViews: count(source.detailViews),
        daily: counts(source.daily),
        sources: counts(source.sources),
        pages: counts(source.pages),
        countries: counts(source.countries),
    };
}
