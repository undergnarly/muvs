import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const NewsManager = () => {
    const { news, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ title: '', date: '', excerpt: '' });

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ title: item.title, date: item.date, excerpt: item.excerpt });
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this news item?')) {
            const updatedNews = news.filter(item => item.id !== id);
            updateData('news', updatedNews);
        }
    };

    const handleAddNew = () => {
        setEditingItem(null);
        setFormData({ title: '', date: '', excerpt: '' });
        setIsFormOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingItem) {
            // Update existing
            const updatedNews = news.map(item =>
                item.id === editingItem.id ? { ...item, ...formData } : item
            );
            updateData('news', updatedNews);
        } else {
            // Create new
            const newItem = {
                id: Date.now(), // Simple ID generation
                ...formData
            };
            updateData('news', [newItem, ...news]);
        }

        setIsFormOpen(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Manage News</h1>
                <Button variant="accent" onClick={handleAddNew}>
                    <FaPlus style={{ marginRight: '8px' }} /> Add News
                </Button>
            </div>

            {isFormOpen && (
                <div style={{
                    marginBottom: '32px',
                    padding: '24px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>
                        {editingItem ? 'Edit News Item' : 'New News Item'}
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="text"
                            placeholder="Title"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            placeholder="Date (DD.MM.YYYY)"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            required
                            style={inputStyle}
                        />
                        <textarea
                            placeholder="Excerpt"
                            value={formData.excerpt}
                            onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                            required
                            rows={4}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            <Button variant="accent" type="submit">Save</Button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
                {news.map(item => (
                    <div key={item.id} style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '20px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div>
                            <h3 style={{ color: 'var(--color-text-light)', marginBottom: '8px' }}>{item.title}</h3>
                            <div style={{ fontSize: '14px', color: 'var(--color-accent)', marginBottom: '8px' }}>{item.date}</div>
                            <p style={{ color: 'var(--color-text-dim)', fontSize: '14px' }}>{item.excerpt}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEdit(item)} style={actionButtonStyle}>
                                <FaEdit />
                            </button>
                            <button onClick={() => handleDelete(item.id)} style={{ ...actionButtonStyle, color: '#ff5555' }}>
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const inputStyle = {
    padding: '12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    outline: 'none',
    width: '100%'
};

const actionButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-dim)',
    cursor: 'pointer',
    padding: '8px',
    fontSize: '16px',
    transition: 'color 0.2s'
};

export default NewsManager;
