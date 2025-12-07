import React from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaTrash, FaEnvelope } from 'react-icons/fa';

const MessagesManager = () => {
    const { messages, deleteMessage } = useData();

    const handleDelete = (id) => {
        if (window.confirm('Delete this message?')) {
            deleteMessage(id);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Messages ({messages.length})</h1>
            </div>

            {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No messages received yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {messages.map(msg => (
                        <div key={msg.id} style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '24px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <h3 style={{ fontSize: '18px', color: 'var(--color-text-light)', margin: 0 }}>{msg.name}</h3>
                                        <span style={{ fontSize: '13px', color: 'var(--color-text-dim)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            {msg.email}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-accent)' }}>
                                        {msg.timestamp}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(msg.id)} style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-text-dim)',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    fontSize: '16px'
                                }}>
                                    <FaTrash style={{ color: '#ff5555' }} />
                                </button>
                            </div>
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '16px',
                                borderRadius: '8px',
                                color: 'var(--color-text-dim)',
                                lineHeight: '1.5'
                            }}>
                                {msg.message}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessagesManager;
