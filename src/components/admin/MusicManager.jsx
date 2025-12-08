import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { compressImage, validateImageFile } from '../../utils/imageCompression';

const MusicManager = () => {
    const { releases, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    // Initial State
    const initialForm = {
        title: '',
        releaseDate: '',
        coverImage: '',
        soundcloudUrl: '',
        bandcampUrl: '',
        description: '',
        tracks: []
    };
    const [formData, setFormData] = useState(initialForm);

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ ...item }); // Spread to copy fields
        setImagePreview(item.coverImage || null);
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this release?')) {
            const updated = releases.filter(item => item.id !== id);
            updateData('releases', updated);
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
            // Convert base64 to Blob
            const response = await fetch(compressedBase64);
            const blob = await response.blob();

            // Upload
            const uploadForm = new FormData();
            // Use original name but with .jpg extension since compression output is JPEG/PNG
            const ext = file.type === 'image/png' ? 'png' : 'jpg';
            uploadForm.append('image', blob, `upload.${ext}`);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Upload failed');

            const { url } = await uploadRes.json();

            setUploadStatus('Upload complete!');
            setFormData({ ...formData, coverImage: url });
            setImagePreview(url); // Preview the remote URL

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

        // Basic optimization: Ensure tracks is an array if we messed with it
        const finalData = {
            ...formData,
            // Ensure ID exists
            id: editingItem ? editingItem.id : Date.now()
        };

        if (editingItem) {
            const updated = releases.map(item => item.id === editingItem.id ? finalData : item);
            updateData('releases', updated);
        } else {
            updateData('releases', [finalData, ...releases]);
        }

        setIsFormOpen(false);
    };

    // Helper to handle simple track list parsing (for now, just a text area backup or assume empty)
    // In a real advanced admin, we'd have a sub-list editor. 
    // For this MVP, we'll keep tracks as is or allow basic JSON edit if needed.

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Manage Music</h1>
                <Button variant="accent" onClick={handleAddNew}>
                    <FaPlus style={{ marginRight: '8px' }} /> Add Release
                </Button>
            </div>

            {isFormOpen && (
                <div style={formContainerStyle}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>
                        {editingItem ? 'Edit Release' : 'New Release'}
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                                placeholder="Release Date"
                                value={formData.releaseDate}
                                onChange={e => setFormData({ ...formData, releaseDate: e.target.value })}
                                required
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                                Cover Image
                            </label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                        id="image-upload"
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <label htmlFor="image-upload" style={uploadButtonStyle}>
                                            <FaUpload style={{ marginRight: '8px' }} />
                                            {uploading ? 'Uploading...' : 'Upload Image'}
                                        </label>
                                        {(imagePreview || formData.coverImage) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, coverImage: '' });
                                                    setImagePreview(null);
                                                    setUploadStatus('');
                                                }}
                                                style={{ ...uploadButtonStyle, background: 'rgba(255, 85, 85, 0.1)', color: '#ff5555', borderColor: '#ff5555' }}
                                            >
                                                <FaTrash style={{ marginRight: '8px' }} />
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {uploadStatus && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: uploadStatus.includes('Error') ? '#ff5555' : 'var(--color-accent)',
                                            marginTop: '8px',
                                            fontWeight: '500'
                                        }}>
                                            {uploadStatus}
                                        </div>
                                    )}
                                    {!uploadStatus && (
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '8px' }}>
                                            Max 10MB • Will be compressed to ~250KB
                                        </div>
                                    )}
                                </div>
                                {(imagePreview || formData.coverImage) && (
                                    <div style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }}>
                                        <img
                                            src={imagePreview || formData.coverImage}
                                            alt="Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <textarea
                            placeholder="Description"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="SoundCloud URL"
                                value={formData.soundcloudUrl}
                                onChange={e => setFormData({ ...formData, soundcloudUrl: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Bandcamp URL"
                                value={formData.bandcampUrl}
                                onChange={e => setFormData({ ...formData, bandcampUrl: e.target.value })}
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            <Button variant="accent" type="submit">Save</Button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
                {releases.map(item => (
                    <div key={item.id} style={itemStyle}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            {item.coverImage && (
                                <img src={item.coverImage} alt={item.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                            )}
                            <div>
                                <h3 style={{ color: 'var(--color-text-light)', marginBottom: '4px' }}>{item.title}</h3>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-dim)' }}>
                                    {item.releaseDate} • {item.tracks ? item.tracks.length : 0} Tracks
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

const uploadButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 20px',
    background: 'rgba(204, 255, 0, 0.1)',
    border: '1px solid var(--color-accent)',
    borderRadius: '8px',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    ':hover': {
        background: 'rgba(204, 255, 0, 0.2)'
    }
};

export default MusicManager;
