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
        artists: '',
        title: '',
        titleFontSize: 'min(24vw, 120px)',
        artistFontSize: 'min(12vw, 60px)',
        textTopPosition: '20%',
        releaseDate: '',
        coverImage: '',
        audioPreview: '',
        soundcloudUrl: '',
        bandcampUrl: '',
        description: '',
        tracks: [],
        gallery: []
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

    const handleAudioUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            setUploadStatus('Uploading audio...');

            // Upload audio file
            const uploadForm = new FormData();
            uploadForm.append('audio', file);

            const uploadRes = await fetch('/api/upload-audio', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Audio upload failed');

            const { url } = await uploadRes.json();

            setUploadStatus('Audio uploaded!');
            setFormData({ ...formData, audioPreview: url });

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
                                placeholder="Artists"
                                value={formData.artists || ''}
                                onChange={e => setFormData({ ...formData, artists: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Title"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="Release Date"
                                value={formData.releaseDate}
                                onChange={e => setFormData({ ...formData, releaseDate: e.target.value })}
                                required
                                style={inputStyle}
                            />
                            <input
                                type="number"
                                placeholder="BPM (e.g. 160)"
                                value={formData.bpm || ''}
                                onChange={e => setFormData({ ...formData, bpm: e.target.value })}
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="Title Font Size (e.g. min(24vw, 120px))"
                                value={formData.titleFontSize || ''}
                                onChange={e => setFormData({ ...formData, titleFontSize: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Artist Font Size (e.g. min(12vw, 60px))"
                                value={formData.artistFontSize || ''}
                                onChange={e => setFormData({ ...formData, artistFontSize: e.target.value })}
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="Text Top Position (e.g. 20%, 15%, 25%)"
                                value={formData.textTopPosition || ''}
                                onChange={e => setFormData({ ...formData, textTopPosition: e.target.value })}
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

                        {/* Audio Preview Upload */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                                Audio Preview (30-60 sec highlight)
                            </label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    accept="audio/mp3,audio/mpeg,audio/wav"
                                    onChange={handleAudioUpload}
                                    style={{ display: 'none' }}
                                    id="audio-upload"
                                />
                                <label htmlFor="audio-upload" style={uploadButtonStyle}>
                                    <FaUpload style={{ marginRight: '8px' }} />
                                    {uploading ? 'Uploading...' : 'Upload Audio'}
                                </label>
                                {formData.audioPreview && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, audioPreview: '' })}
                                            style={{ ...uploadButtonStyle, background: 'rgba(255, 85, 85, 0.1)', color: '#ff5555', borderColor: '#ff5555' }}
                                        >
                                            <FaTrash style={{ marginRight: '8px' }} />
                                            Remove Audio
                                        </button>
                                        <audio controls src={formData.audioPreview} style={{ maxWidth: '300px' }} />
                                    </>
                                )}
                            </div>
                            {!formData.audioPreview && (
                                <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '8px' }}>
                                    MP3 or WAV • Recommended: 30-60 seconds
                                </div>
                            )}
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

                        {/* Gallery Section */}
                        <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ color: 'var(--color-text-light)', fontSize: '16px', margin: 0 }}>Gallery (Circular Gallery)</h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newGalleryItem = { id: Date.now(), image: '', text: '' };
                                        setFormData({ ...formData, gallery: [...(formData.gallery || []), newGalleryItem] });
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
                                    <FaPlus /> Add Image
                                </button>
                            </div>
                            {formData.gallery && formData.gallery.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {formData.gallery.map((item, index) => (
                                        <div key={item.id || index} style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/webp"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            try {
                                                                setUploading(true);
                                                                setUploadStatus(`Uploading image ${index + 1}...`);
                                                                validateImageFile(file);
                                                                const compressedBase64 = await compressImage(file, 250);
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
                                                                const updatedGallery = [...formData.gallery];
                                                                updatedGallery[index] = { ...item, image: url };
                                                                setFormData({ ...formData, gallery: updatedGallery });
                                                                setUploadStatus('Upload complete!');
                                                                setTimeout(() => setUploadStatus(''), 2000);
                                                            } catch (error) {
                                                                setUploadStatus('Error: ' + error.message);
                                                                setTimeout(() => setUploadStatus(''), 3000);
                                                            } finally {
                                                                setUploading(false);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        style={{ display: 'none' }}
                                                        id={`gallery-upload-${index}`}
                                                    />
                                                    <label htmlFor={`gallery-upload-${index}`} style={{
                                                        ...uploadButtonStyle,
                                                        display: 'inline-flex',
                                                        fontSize: '12px',
                                                        padding: '8px 16px'
                                                    }}>
                                                        <FaUpload style={{ marginRight: '6px' }} />
                                                        {item.image ? 'Change Image' : 'Upload Image'}
                                                    </label>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updatedGallery = formData.gallery.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, gallery: updatedGallery });
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#ff5555',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                        padding: '8px'
                                                    }}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                            {item.image && (
                                                <div style={{ marginBottom: '12px' }}>
                                                    <img src={item.image} alt={`Gallery ${index + 1}`} style={{ width: '100%', maxWidth: '200px', height: 'auto', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.1)' }} />
                                                </div>
                                            )}
                                            <input
                                                type="text"
                                                placeholder="Image caption/text"
                                                value={item.text || ''}
                                                onChange={e => {
                                                    const updatedGallery = [...formData.gallery];
                                                    updatedGallery[index] = { ...item, text: e.target.value };
                                                    setFormData({ ...formData, gallery: updatedGallery });
                                                }}
                                                style={inputStyle}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-dim)', fontSize: '14px' }}>
                                    No gallery images added yet. Click "Add Image" to start.
                                </div>
                            )}
                        </div>

                        {/* Tracklist Section */}
                        <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ color: 'var(--color-text-light)', fontSize: '16px', margin: 0 }}>Tracklist</h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newTrack = { id: Date.now(), title: '', duration: '' };
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
                                        <div key={track.id || index} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 40px', gap: '12px', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder={`Track ${index + 1} title`}
                                                value={track.title || ''}
                                                onChange={e => {
                                                    const updatedTracks = [...formData.tracks];
                                                    updatedTracks[index] = { ...track, title: e.target.value };
                                                    setFormData({ ...formData, tracks: updatedTracks });
                                                }}
                                                style={inputStyle}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Duration (e.g. 3:45)"
                                                value={track.duration || ''}
                                                onChange={e => {
                                                    const updatedTracks = [...formData.tracks];
                                                    updatedTracks[index] = { ...track, duration: e.target.value };
                                                    setFormData({ ...formData, tracks: updatedTracks });
                                                }}
                                                style={inputStyle}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updatedTracks = formData.tracks.filter((_, i) => i !== index);
                                                    setFormData({ ...formData, tracks: updatedTracks });
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#ff5555',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    padding: '8px'
                                                }}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-dim)', fontSize: '14px' }}>
                                    No tracks added yet. Click "Add Track" to start.
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
