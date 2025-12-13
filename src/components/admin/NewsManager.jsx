import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { compressImage, validateImageFile, uploadImageWithoutCompression } from '../../utils/imageCompression';

const NewsManager = () => {
    const { news, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [keepOriginal, setKeepOriginal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        excerpt: '',
        image: '',
        titleFontSize: '60px',
        titleTopPosition: '20%'
    });

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            title: item.title,
            date: item.date,
            excerpt: item.excerpt,
            image: item.image || '',
            titleFontSize: item.titleFontSize || '60px',
            titleTopPosition: item.titleTopPosition || '20%'
        });
        setImagePreview(item.image || null);
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
        setFormData({
            title: '',
            date: '',
            excerpt: '',
            image: '',
            titleFontSize: '60px',
            titleTopPosition: '20%'
        });
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

            let url;

            if (keepOriginal) {
                setUploadStatus('Uploading original file...');
                url = await uploadImageWithoutCompression(file);
            } else {
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

                const data = await uploadRes.json();
                url = data.url;
            }

            setUploadStatus('Upload complete!');
            setFormData({ ...formData, image: url });
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ color: 'var(--color-text-light)', marginBottom: '8px', display: 'block', fontSize: '14px' }}>Title Font Size</label>
                                <input
                                    type="text"
                                    placeholder="e.g. min(24vw, 120px)"
                                    value={formData.titleFontSize}
                                    onChange={e => setFormData({ ...formData, titleFontSize: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ color: 'var(--color-text-light)', marginBottom: '8px', display: 'block', fontSize: '14px' }}>Title Top Position</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 20%"
                                    value={formData.titleTopPosition}
                                    onChange={e => setFormData({ ...formData, titleTopPosition: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Date (DD.MM.YYYY)"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            required
                            style={inputStyle}
                        />

                        {/* Image Upload */}
                        <div>
                            <h4 style={{ color: 'var(--color-text-light)', marginBottom: '12px', fontSize: '14px' }}>News Image (Optional)</h4>
                            {imagePreview && (
                                <div style={{ marginBottom: '12px' }}>
                                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px' }} />
                                </div>
                            )}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-light)', fontSize: '14px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={keepOriginal}
                                        onChange={(e) => setKeepOriginal(e.target.checked)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    Оставить исходный файл (без сжатия)
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    id="news-image-upload"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="news-image-upload" style={{
                                    padding: '10px 16px',
                                    background: 'rgba(204, 255, 0, 0.1)',
                                    border: '1px solid rgba(204, 255, 0, 0.3)',
                                    borderRadius: '8px',
                                    color: '#ccff00',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                }}>
                                    <FaUpload style={{ marginRight: '8px' }} />
                                    {uploading ? 'Uploading...' : 'Upload Image'}
                                </label>
                                {formData.image && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, image: '' });
                                            setImagePreview(null);
                                        }}
                                        style={{
                                            padding: '10px 16px',
                                            background: 'rgba(255, 85, 85, 0.1)',
                                            border: '1px solid #ff5555',
                                            borderRadius: '8px',
                                            color: '#ff5555',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            display: 'inline-flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <FaTrash style={{ marginRight: '8px' }} />
                                        Remove
                                    </button>
                                )}
                            </div>
                            {uploadStatus && <div style={{ marginTop: '8px', color: 'var(--color-text-dim)', fontSize: '14px' }}>{uploadStatus}</div>}
                        </div>

                        <textarea
                            placeholder="Excerpt (supports HTML for links)"
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
