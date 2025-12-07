import React from 'react';
import { useData } from '../../context/DataContext';
import { FaMusic, FaNewspaper, FaCode, FaCompactDisc, FaChartLine, FaEnvelope } from 'react-icons/fa';

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

    return (
        <div>
            <h1 style={{ fontSize: '32px', marginBottom: '32px', color: 'var(--color-text-light)' }}>Dashboard</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <StatCard title="Total Visits" count={stats.visits} icon={FaChartLine} color="#ffffff" />
                <StatCard title="Releases" count={releases.length} icon={FaCompactDisc} color="#ccff00" />
                <StatCard title="Mixes" count={mixes.length} icon={FaMusic} color="#00ffcc" />
                <StatCard title="Projects" count={projects.length} icon={FaCode} color="#ff00cc" />
                <StatCard title="News Items" count={news.length} icon={FaNewspaper} color="#ffcc00" />
                <StatCard title="Messages" count={messages.length} icon={FaEnvelope} color="#ff9900" />
            </div>

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
