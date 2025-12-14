import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { validateImageFile } from '../../utils/imageCompression';

const MixesManager = () => {
    const { mixes, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    const initialForm = {
        title: '',
        titleFontSize: 'min(24vw, 120px)',
        textTopPosition: '20%',
        titleGap: '0px',
        parallaxStrength: 100,
        zoomOutMax: 0.5,
        imageParallaxY: 100,
        textParallaxY: 300,
        recordDate: '',
        duration: '',
        soundcloudUrl: '',
        description: '',
        backgroundImage: '',
        tracks: [] // Tracklist for the mix
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
        setKeepOriginal(false);
        setIsFormOpen(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            setUploadStatus('Validating image...');
            validateImageFile(file);

            setUploadStatus('Uploading to server (Server will optimize)...');

            // Upload directly without client-side compression to avoid double-loss
            const uploadForm = new FormData();
            uploadForm.append('image', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Upload failed');

            const { url, size } = await uploadRes.json();

            setUploadStatus(`Upload complete! Size: ${size}`);
            setFormData({ ...formData, backgroundImage: url });
            setImagePreview(url);

            setTimeout(() => setUploadStatus(''), 4000);
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="Title Font Size"
                                value={formData.titleFontSize || ''}
                                onChange={e => setFormData({ ...formData, titleFontSize: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Text Top Position"
                                value={formData.textTopPosition || ''}
                                onChange={e => setFormData({ ...formData, textTopPosition: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Title Gap"
                                value={formData.titleGap || ''}
                                onChange={e => setFormData({ ...formData, titleGap: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="number"
                                placeholder="Parallax Strength (0-200, default 100)"
                                value={formData.parallaxStrength || ''}
                                onChange={e => setFormData({ ...formData, parallaxStrength: parseInt(e.target.value) || 100 })}
                                style={inputStyle}
                            />
                        </div>

                        {/* Animation Controls */}
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--color-text-light)', fontSize: '14px', fontWeight: 'bold' }}>
                                Scroll Animation Settings
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--color-text-dim)', fontSize: '12px' }}>
                                        Max Zoom Out (0.1 - 1.0)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        min="0.1"
                                        max="1.0"
                                        placeholder="0.5"
                                        value={formData.zoomOutMax || ''}
                                        onChange={e => setFormData({ ...formData, zoomOutMax: parseFloat(e.target.value) || 0.5 })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--color-text-dim)', fontSize: '12px' }}>
                                        Image Scroll Distance
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="100"
                                        value={formData.imageParallaxY || ''}
                                        onChange={e => setFormData({ ...formData, imageParallaxY: parseInt(e.target.value) || 0 })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--color-text-dim)', fontSize: '12px' }}>
                                        Text Scroll Distance
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="300"
                                        value={formData.textParallaxY || ''}
                                        onChange={e => setFormData({ ...formData, textParallaxY: parseInt(e.target.value) || 0 })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
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
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-light)', fontSize: '14px', cursor: 'pointer' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>
                                        Max 10MB • Will be compressed server-side
                                    </div>
                                </label>
                            </div>
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

                        {/* Tracklist Section */}
                        <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ color: 'var(--color-text-light)', fontSize: '16px', margin: 0 }}>Tracklist</h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newTrack = { id: Date.now(), artist: '', title: '', order: (formData.tracks?.length || 0) + 1 };
                                        setFormData({ ...formData, tracks: [...(formData.tracks || []), newTrack] });
                                    }}
                                    style={{
                                        background: 'rgba(204, 255, 0, 0.1)',
                                        border: '1px solid var(--color-accent)',
                                        borderRadius: '6px',
                                        color: 'var(--color-accent)',
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <FaPlus /> Add Track
                                </button>
                            </div>
                            {formData.tracks && formData.tracks.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {formData.tracks.map((track, index) => (
                                        <div key={track.id || index} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div style={{
                                                    minWidth: '30px',
                                                    height: '30px',
                                                    background: 'var(--color-accent)',
                                                    color: '#000',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 'bold',
                                                    fontSize: '14px'
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Artist"
                                                    value={track.artist || ''}
                                                    onChange={e => {
                                                        const updatedTracks = [...formData.tracks];
                                                        updatedTracks[index] = { ...track, artist: e.target.value };
                                                        setFormData({ ...formData, tracks: updatedTracks });
                                                    }}
                                                    style={{ ...inputStyle, flex: 1, fontSize: '14px', padding: '8px' }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Track Title"
                                                    value={track.title || ''}
                                                    onChange={e => {
                                                        const updatedTracks = [...formData.tracks];
                                                        updatedTracks[index] = { ...track, title: e.target.value };
                                                        setFormData({ ...formData, tracks: updatedTracks });
                                                    }}
                                                    style={{ ...inputStyle, flex: 2, fontSize: '14px', padding: '8px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = formData.tracks.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, tracks: updated });
                                                    }}
                                                    style={{ color: '#ff5555', fontSize: '16px', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                                    No tracks added yet
                                </div>
                            )}
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
