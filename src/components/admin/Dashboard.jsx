import React from 'react';
import { useData } from '../../context/DataContext';
import { FaMusic, FaNewspaper, FaCode, FaCompactDisc, FaChartLine, FaEnvelope, FaEye } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, count, icon: Icon, color }) => (
    <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
    }}>
        <div style={{
            background: color,
            padding: '16px',
            borderRadius: '12px',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Icon size={24} />
        </div>
        <div>
            <h3 style={{ fontSize: '14px', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-text-light)' }}>{count}</span>
        </div>
    </div>
);

const Dashboard = () => {
    const { releases, mixes, projects, news, stats, messages, resetData } = useData();

    // Get last 14 days for chart
    const getLast14Days = () => {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    };

    const last14Days = getLast14Days();

    // Prepare data for Recharts
    const chartData = last14Days.map(day => ({
        date: day.slice(5), // MM-DD format
        visits: stats.daily[day] || 0
    }));

    const maxDailyVisits = Math.max(...chartData.map(d => d.visits), 1);

    // Get top sources
    const topSources = Object.entries(stats.sources || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Get top pages
    const topPages = Object.entries(stats.pages || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Get top countries
    const topCountries = Object.entries(stats.countries || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const engagementRate = stats.totalVisits > 0
        ? ((stats.detailViews / stats.totalVisits) * 100).toFixed(1)
        : 0;

    return (
        <div>
            <h1 style={{ fontSize: '32px', marginBottom: '32px', color: 'var(--color-text-light)' }}>Dashboard</h1>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <StatCard title="Total Visits" count={stats.totalVisits || 0} icon={FaChartLine} color="#ffffff" />
                <StatCard title="Detail Views" count={stats.detailViews || 0} icon={FaEye} color="#00ffcc" />
                <StatCard title="Releases" count={releases.length} icon={FaCompactDisc} color="#ccff00" />
                <StatCard title="Mixes" count={mixes.length} icon={FaMusic} color="#ff00cc" />
                <StatCard title="Projects" count={projects.length} icon={FaCode} color="#ffcc00" />
                <StatCard title="Messages" count={messages.length} icon={FaEnvelope} color="#ff9900" />
            </div>

            {/* Analytics Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '40px' }}>
                {/* Daily Visits Chart */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: 'var(--color-text-light)' }}>Last 14 Days</h3>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>Max: {maxDailyVisits} visits</div>
                    </div>

                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="var(--color-text-dim)"
                                tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                stroke="var(--color-text-dim)"
                                tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(0,0,0,0.9)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white'
                                }}
                                labelStyle={{ color: 'var(--color-accent)' }}
                            />
                            <Bar
                                dataKey="visits"
                                fill="var(--color-accent)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Engagement */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>Engagement</h3>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '8px' }}>
                            {engagementRate}%
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--color-text-dim)' }}>
                            Detail View Rate
                        </div>
                        <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--color-text-dim)', lineHeight: '1.6' }}>
                            {stats.detailViews} of {stats.totalVisits} visitors explored content in detail
                        </div>
                    </div>
                </div>
            </div>

            {/* Sources, Pages, and Countries */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                {/* Top Sources */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>Traffic Sources</h3>
                    {topSources.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topSources.map(([source, count]) => (
                                <div key={source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-light)', textTransform: 'capitalize' }}>{source}</span>
                                    <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '20px' }}>No data yet</div>
                    )}
                </div>

                {/* Top Pages */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>Popular Pages</h3>
                    {topPages.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topPages.map(([page, count]) => (
                                <div key={page} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-light)' }}>{page}</span>
                                    <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '20px' }}>No data yet</div>
                    )}
                </div>

                {/* Top Countries */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>Top Countries</h3>
                    {topCountries.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topCountries.map(([country, count]) => (
                                <div key={country} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-light)', textTransform: 'capitalize' }}>{country}</span>
                                    <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '20px' }}>No data yet</div>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div style={{ background: 'rgba(255,50,50,0.1)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,50,50,0.3)' }}>
                <h3 style={{ color: '#ff5555', marginBottom: '16px' }}>Danger Zone</h3>
                <button
                    onClick={resetData}
                    style={{
                        background: '#ff5555',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Reset All Data to Defaults
                </button>
                <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-text-dim)' }}>
                    This will wipe all local changes and restore the original site data.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
