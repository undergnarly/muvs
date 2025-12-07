import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const MixesManager = () => {
    const { mixes, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const initialForm = {
        title: '',
        recordDate: '',
        duration: '',
        soundcloudUrl: '',
        description: '',
    };
    const [formData, setFormData] = useState(initialForm);

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ ...item });
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this mix?')) {
            const updated = mixes.filter(item => item.id !== id);
            updateData('mixes', updated);
        }
    };

    const handleAddNew = () => {
        setEditingItem(null);
        setFormData(initialForm);
        setIsFormOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalData = {
            ...formData,
            id: editingItem ? editingItem.id : Date.now()
        };

        if (editingItem) {
            const updated = mixes.map(item => item.id === editingItem.id ? finalData : item);
            updateData('mixes', updated);
        } else {
            updateData('mixes', [finalData, ...mixes]);
        }
        setIsFormOpen(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Manage Mixes</h1>
                <Button variant="accent" onClick={handleAddNew}>
                    <FaPlus style={{ marginRight: '8px' }} /> Add Mix
                </Button>
            </div>

            {isFormOpen && (
                <div style={formContainerStyle}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>
                        {editingItem ? 'Edit Mix' : 'New Mix'}
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
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
                                placeholder="Date"
                                value={formData.recordDate}
                                onChange={e => setFormData({ ...formData, recordDate: e.target.value })}
                                required
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Duration"
                                value={formData.duration}
                                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <textarea
                            placeholder="Description"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <input
                            type="text"
                            placeholder="SoundCloud URL"
                            value={formData.soundcloudUrl}
                            onChange={e => setFormData({ ...formData, soundcloudUrl: e.target.value })}
                            style={inputStyle}
                        />

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            <Button variant="accent" type="submit">Save</Button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
                {mixes.map(item => (
                    <div key={item.id} style={itemStyle}>
                        <div>
                            <h3 style={{ color: 'var(--color-text-light)', marginBottom: '4px' }}>{item.title}</h3>
                            <div style={{ fontSize: '14px', color: 'var(--color-text-dim)' }}>
                                {item.recordDate} • {item.duration}
                            </div>
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

// Styles reused (in real app, move to CSS or shared component)
const formContainerStyle = {
    marginBottom: '32px',
    padding: '24px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
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

const itemStyle = {
    background: 'rgba(0,0,0,0.3)',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.05)'
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

export default MixesManager;
