import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaUpload, FaTrash, FaSave, FaImages } from 'react-icons/fa';
import { compressImage, validateImageFile, uploadImageWithoutCompression } from '../../utils/imageCompression';
import MediaGallery from './MediaGallery';

const AboutManager = () => {
    const { about, updateData } = useData();
    const [formData, setFormData] = useState(about);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState(about.backgroundImage || null);
    const [imagePreviewDesktop, setImagePreviewDesktop] = useState(about.backgroundImageDesktop || null);
    const [imagePreviewMobile, setImagePreviewMobile] = useState(about.backgroundImageMobile || null);
    const [keepOriginal, setKeepOriginal] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryTarget, setGalleryTarget] = useState(null);

    // Initialize formData from about when component mounts or about changes
    useEffect(() => {
        setFormData(about);
        setImagePreview(about.backgroundImage || null);
        setImagePreviewDesktop(about.backgroundImageDesktop || null);
        setImagePreviewMobile(about.backgroundImageMobile || null);
    }, [about]);

    const handleImageUpload = async (e, imageType = 'background') => {
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

            if (imageType === 'desktop') {
                setFormData({ ...formData, backgroundImageDesktop: url });
                setImagePreviewDesktop(url);
            } else if (imageType === 'mobile') {
                setFormData({ ...formData, backgroundImageMobile: url });
                setImagePreviewMobile(url);
            } else {
                setFormData({ ...formData, backgroundImage: url });
                setImagePreview(url);
            }

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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ color: 'var(--color-text-light)', marginBottom: '8px', display: 'block' }}>Title Font Size</label>
                            <input
                                type="text"
                                placeholder="e.g. 60px"
                                value={formData.titleFontSize || '60px'}
                                onChange={e => setFormData({ ...formData, titleFontSize: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ color: 'var(--color-text-light)', marginBottom: '8px', display: 'block' }}>Title Top Position</label>
                            <input
                                type="text"
                                placeholder="e.g. 20%"
                                value={formData.titleTopPosition || '20%'}
                                onChange={e => setFormData({ ...formData, titleTopPosition: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
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
                        <h4 style={{ color: 'var(--color-text-light)', marginBottom: '12px' }}>Background Images</h4>
                        <p style={{ color: 'var(--color-text-dim)', fontSize: '14px', marginBottom: '12px' }}>
                            Upload separate images for desktop and mobile versions. Images will be displayed full-width.
                        </p>

                        <div style={{ marginBottom: '16px' }}>
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

                        {/* Desktop Image */}
                        <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <h5 style={{ color: 'var(--color-text-light)', marginBottom: '12px', fontSize: '14px' }}>Desktop Version</h5>
                            {imagePreviewDesktop && (
                                <div style={{ marginBottom: '12px' }}>
                                    <img src={imagePreviewDesktop} alt="Desktop Preview" style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px' }} />
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    id="desktop-image-upload"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'desktop')}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="desktop-image-upload" style={uploadButtonStyle}>
                                    <FaUpload style={{ marginRight: '8px' }} />
                                    {uploading ? 'Uploading...' : 'Upload Desktop'}
                                </label>
                                <button type="button" onClick={() => { setGalleryTarget('desktop'); setGalleryOpen(true); }} style={uploadButtonStyle}>
                                    <FaImages style={{ marginRight: '8px' }} /> Browse Gallery
                                </button>
                                {formData.backgroundImageDesktop && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, backgroundImageDesktop: '' });
                                            setImagePreviewDesktop(null);
                                        }}
                                        style={{ ...uploadButtonStyle, background: 'rgba(255, 85, 85, 0.1)', color: '#ff5555', borderColor: '#ff5555' }}
                                    >
                                        <FaTrash style={{ marginRight: '8px' }} />
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile Image */}
                        <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <h5 style={{ color: 'var(--color-text-light)', marginBottom: '12px', fontSize: '14px' }}>Mobile Version</h5>
                            {imagePreviewMobile && (
                                <div style={{ marginBottom: '12px' }}>
                                    <img src={imagePreviewMobile} alt="Mobile Preview" style={{ maxWidth: '200px', maxHeight: '300px', borderRadius: '8px' }} />
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    id="mobile-image-upload"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'mobile')}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="mobile-image-upload" style={uploadButtonStyle}>
                                    <FaUpload style={{ marginRight: '8px' }} />
                                    {uploading ? 'Uploading...' : 'Upload Mobile'}
                                </label>
                                <button type="button" onClick={() => { setGalleryTarget('mobile'); setGalleryOpen(true); }} style={uploadButtonStyle}>
                                    <FaImages style={{ marginRight: '8px' }} /> Browse Gallery
                                </button>
                                {formData.backgroundImageMobile && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, backgroundImageMobile: '' });
                                            setImagePreviewMobile(null);
                                        }}
                                        style={{ ...uploadButtonStyle, background: 'rgba(255, 85, 85, 0.1)', color: '#ff5555', borderColor: '#ff5555' }}
                                    >
                                        <FaTrash style={{ marginRight: '8px' }} />
                                        Remove
                                    </button>
                                )}
                            </div>
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
            <MediaGallery
                isOpen={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                onSelect={(url) => {
                    if (galleryTarget === 'desktop') {
                        setFormData(prev => ({ ...prev, backgroundImageDesktop: url }));
                        setImagePreviewDesktop(url);
                    } else if (galleryTarget === 'mobile') {
                        setFormData(prev => ({ ...prev, backgroundImageMobile: url }));
                        setImagePreviewMobile(url);
                    }
                }}
            />
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
