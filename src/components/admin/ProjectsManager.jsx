import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const ProjectsManager = () => {
    const { projects, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const initialForm = {
        title: '',
        thumbnail: '',
        description: '',
        fullDescription: '',
        technologies: '', // Will split by comma
        liveUrl: '',
        githubUrl: '',
        features: '' // Will split by comma
    };
    const [formData, setFormData] = useState(initialForm);

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            ...item,
            technologies: item.technologies ? item.technologies.join(', ') : '',
            features: item.features ? item.features.join(', ') : ''
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this project?')) {
            const updated = projects.filter(item => item.id !== id);
            updateData('projects', updated);
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
            id: editingItem ? editingItem.id : Date.now(),
            technologies: formData.technologies.split(',').map(s => s.trim()).filter(Boolean),
            features: formData.features.split(',').map(s => s.trim()).filter(Boolean)
        };

        if (editingItem) {
            const updated = projects.map(item => item.id === editingItem.id ? finalData : item);
            updateData('projects', updated);
        } else {
            updateData('projects', [finalData, ...projects]);
        }
        setIsFormOpen(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Manage Projects</h1>
                <Button variant="accent" onClick={handleAddNew}>
                    <FaPlus style={{ marginRight: '8px' }} /> Add Project
                </Button>
            </div>

            {isFormOpen && (
                <div style={formContainerStyle}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>
                        {editingItem ? 'Edit Project' : 'New Project'}
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1fr', gap: '16px' }}>
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
                                placeholder="Thumbnail URL"
                                value={formData.thumbnail}
                                onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="Live URL"
                                value={formData.liveUrl}
                                onChange={e => setFormData({ ...formData, liveUrl: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="GitHub URL"
                                value={formData.githubUrl}
                                onChange={e => setFormData({ ...formData, githubUrl: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <textarea
                            placeholder="Short Description (supports HTML for links)"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            required
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <textarea
                            placeholder="Full Description (supports HTML)"
                            value={formData.fullDescription}
                            onChange={e => setFormData({ ...formData, fullDescription: e.target.value })}
                            rows={4}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <input
                            type="text"
                            placeholder="Technologies (comma separated)"
                            value={formData.technologies}
                            onChange={e => setFormData({ ...formData, technologies: e.target.value })}
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            placeholder="Key Features (comma separated)"
                            value={formData.features}
                            onChange={e => setFormData({ ...formData, features: e.target.value })}
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
                {projects.map(item => (
                    <div key={item.id} style={itemStyle}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            {item.thumbnail && (
                                <img src={item.thumbnail} alt={item.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                            )}
                            <div>
                                <h3 style={{ color: 'var(--color-text-light)', marginBottom: '4px' }}>{item.title}</h3>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-dim)' }}>
                                    {item.technologies && item.technologies.slice(0, 3).join(', ')}...
                                </div>
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

export default ProjectsManager;
