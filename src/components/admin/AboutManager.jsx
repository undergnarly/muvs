import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaUpload, FaTrash, FaSave } from 'react-icons/fa';
import { compressImage, validateImageFile } from '../../utils/imageCompression';

const AboutManager = () => {
    const { about, updateData } = useData();
    const [formData, setFormData] = useState(about);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState(about.backgroundImage || null);

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
        updateData('about', formData);
        alert('About page updated successfully!');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Manage About Page</h1>
            </div>

            <div style={formContainerStyle}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ color: 'var(--color-text-light)', marginBottom: '8px', display: 'block' }}>Title</label>
                        <input
                            type="text"
                            placeholder="Title"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ color: 'var(--color-text-light)', marginBottom: '8px', display: 'block' }}>Content</label>
                        <textarea
                            placeholder="About content"
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            rows={6}
                            required
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    {/* Background Image Upload */}
                    <div>
                        <h4 style={{ color: 'var(--color-text-light)', marginBottom: '12px' }}>Background Image</h4>
                        <p style={{ color: 'var(--color-text-dim)', fontSize: '14px', marginBottom: '12px' }}>
                            This image will be displayed full-width on the About page
                        </p>
                        {imagePreview && (
                            <div style={{ marginBottom: '16px' }}>
                                <img src={imagePreview} alt="Preview" style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px' }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="file"
                                id="about-image-upload"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="about-image-upload" style={uploadButtonStyle}>
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

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <Button variant="accent" type="submit">
                            <FaSave style={{ marginRight: '8px' }} /> Save Changes
                        </Button>
                    </div>
                </form>
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

export default AboutManager;
