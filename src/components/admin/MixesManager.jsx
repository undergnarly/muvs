import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { compressImage, validateImageFile } from '../../utils/imageCompression';

const MixesManager = () => {
    const { mixes, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    const initialForm = {
        title: '',
        recordDate: '',
        duration: '',
        soundcloudUrl: '',
        description: '',
        backgroundImage: '',
    };
    const [formData, setFormData] = useState(initialForm);

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ ...item });
        setImagePreview(item.backgroundImage || null);
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
        setImagePreview(null);
        setUploadStatus('');
        setIsFormOpen(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            setUploadStatus('Validating image...');
            validateImageFile(file);

            setUploadStatus('Compressing...');
            const compressedBase64 = await compressImage(file, 250);

            setUploadStatus('Uploading to server...');
            const response = await fetch(compressedBase64);
            const blob = await response.blob();

            const uploadForm = new FormData();
            const ext = file.type === 'image/png' ? 'png' : 'jpg';
            uploadForm.append('image', blob, `upload.${ext}`);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Upload failed');

            const { url } = await uploadRes.json();

            setUploadStatus('Upload complete!');
            setFormData({ ...formData, backgroundImage: url });
            setImagePreview(url);

            setTimeout(() => setUploadStatus(''), 2000);
        } catch (error) {
            setUploadStatus('Error: ' + error.message);
            setTimeout(() => setUploadStatus(''), 3000);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
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
                            placeholder="Description (supports HTML for links)"
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

                        {/* Background Image Upload */}
                        <div style={{ marginTop: '16px' }}>
                            <h4 style={{ color: 'var(--color-text-light)', marginBottom: '12px' }}>Background Image</h4>
                            {imagePreview && (
                                <div style={{ marginBottom: '12px' }}>
                                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }} />
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    id="image-upload"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="image-upload" style={uploadButtonStyle}>
                                    <FaUpload style={{ marginRight: '8px' }} />
                                    {uploading ? 'Uploading...' : 'Upload Image'}
                                </label>
                                {formData.backgroundImage && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, backgroundImage: '' });
                                            setImagePreview(null);
                                        }}
                                        style={{ ...uploadButtonStyle, background: 'rgba(255, 85, 85, 0.1)', color: '#ff5555', borderColor: '#ff5555' }}
                                    >
                                        <FaTrash style={{ marginRight: '8px' }} />
                                        Remove
                                    </button>
                                )}
                            </div>
                            {uploadStatus && <div style={{ marginTop: '8px', color: 'var(--color-text-dim)', fontSize: '14px' }}>{uploadStatus}</div>}
                        </div>

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
                                {item.backgroundImage && ' • Has background image'}
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

const uploadButtonStyle = {
    padding: '10px 16px',
    background: 'rgba(204, 255, 0, 0.1)',
    border: '1px solid rgba(204, 255, 0, 0.3)',
    borderRadius: '8px',
    color: '#ccff00',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.3s'
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
