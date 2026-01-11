import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaLock, FaUpload, FaTrash, FaSave, FaCog } from 'react-icons/fa';
import { compressImage, validateImageFile } from '../../utils/imageCompression';

const AdminSettings = () => {
    const { adminSettings, updatePin, siteSettings, updateSiteSettings } = useData();
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [faviconPreview, setFaviconPreview] = useState(siteSettings?.favicon || null);
    const [siteFormData, setSiteFormData] = useState({
        favicon: siteSettings?.favicon || '',
        siteName: siteSettings?.siteName || 'MUVS',
        siteDescription: siteSettings?.siteDescription || 'Audio • Visual • Code',
        socialLinks: siteSettings?.socialLinks || { instagram: '', soundcloud: '', bandcamp: '', telegram: '' },
        scrollAnimation: siteSettings?.scrollAnimation || {
            scrollSectionHeight: 180, // vh
            detailOverlay: -10 // vh
        },
        gradientSettings: siteSettings?.gradientSettings || {
            enabled: false,
            colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
            speed: 10, // seconds
            opacity: 0.8, // 0-1, default 80% brightness
            type: 'morphing' // 'morphing' | 'shimmer' | 'pulse'
        },
        noiseSettings: siteSettings?.noiseSettings || {
            enabled: true,
            intensity: 0.4 // 0-1, default 40% opacity
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validate current PIN
        if (currentPin !== adminSettings.pin) {
            setError('Current PIN is incorrect');
            return;
        }

        // Validate new PIN
        if (newPin.length < 4) {
            setError('New PIN must be at least 4 characters');
            return;
        }

        if (newPin !== confirmPin) {
            setError('New PIN and confirmation do not match');
            return;
        }

        // Update PIN
        updatePin(newPin);
        setSuccess(true);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
    };

    const handleFaviconUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            setUploadStatus('Validating image...');
            validateImageFile(file);

            setUploadStatus('Compressing favicon...');
            const compressedBase64 = await compressImage(file, 50);

            setUploadStatus('Uploading to server...');
            const response = await fetch(compressedBase64);
            const blob = await response.blob();

            const uploadForm = new FormData();
            const ext = file.type === 'image/png' ? 'png' : 'jpg';
            uploadForm.append('image', blob, `favicon.${ext}`);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Upload failed');

            const { url } = await uploadRes.json();

            setUploadStatus('Upload complete!');
            setSiteFormData({ ...siteFormData, favicon: url });
            setFaviconPreview(url);

            setTimeout(() => setUploadStatus(''), 2000);
        } catch (error) {
            setUploadStatus('Error: ' + error.message);
            setTimeout(() => setUploadStatus(''), 3000);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSaveSiteSettings = () => {
        updateSiteSettings(siteFormData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
    };

    return (
        <div>
            <h1 style={{ fontSize: '32px', marginBottom: '32px', color: 'var(--color-text-light)' }}>Settings</h1>

            {/* Site Settings Section */}
            <div style={{
                marginBottom: '32px',
                background: 'rgba(255,255,255,0.05)',
                padding: '32px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <FaCog style={{ color: 'var(--color-accent)', fontSize: '24px' }} />
                    <h2 style={{ fontSize: '20px', color: 'var(--color-text-light)', margin: 0 }}>Site Settings</h2>
                </div>

                {/* Site Name */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={labelStyle}>Site Name</label>
                    <input
                        type="text"
                        value={siteFormData.siteName}
                        onChange={e => setSiteFormData({ ...siteFormData, siteName: e.target.value })}
                        style={inputStyle}
                        placeholder="MUVS"
                    />
                </div>

                {/* Site Description */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={labelStyle}>Site Description</label>
                    <input
                        type="text"
                        value={siteFormData.siteDescription}
                        onChange={e => setSiteFormData({ ...siteFormData, siteDescription: e.target.value })}
                        style={inputStyle}
                        placeholder="Audio • Visual • Code"
                    />
                </div>

                {/* Social Links */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginBottom: '16px' }}>Social Links</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Instagram</label>
                            <input
                                type="text"
                                value={siteFormData.socialLinks.instagram}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    socialLinks: { ...siteFormData.socialLinks, instagram: e.target.value }
                                })}
                                style={inputStyle}
                                placeholder="https://instagram.com/..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>SoundCloud</label>
                            <input
                                type="text"
                                value={siteFormData.socialLinks.soundcloud}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    socialLinks: { ...siteFormData.socialLinks, soundcloud: e.target.value }
                                })}
                                style={inputStyle}
                                placeholder="https://soundcloud.com/..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Bandcamp</label>
                            <input
                                type="text"
                                value={siteFormData.socialLinks.bandcamp}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    socialLinks: { ...siteFormData.socialLinks, bandcamp: e.target.value }
                                })}
                                style={inputStyle}
                                placeholder="https://bandcamp.com/..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Telegram</label>
                            <input
                                type="text"
                                value={siteFormData.socialLinks.telegram}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    socialLinks: { ...siteFormData.socialLinks, telegram: e.target.value }
                                })}
                                style={inputStyle}
                                placeholder="https://t.me/..."
                            />
                        </div>
                    </div>
                </div>

                {/* Scroll Animation Settings */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginBottom: '16px' }}>Scroll Animation Settings</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Scroll Section Height (vh)</label>
                            <input
                                type="number"
                                value={siteFormData.scrollAnimation.scrollSectionHeight}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    scrollAnimation: { ...siteFormData.scrollAnimation, scrollSectionHeight: parseInt(e.target.value) || 180 }
                                })}
                                style={inputStyle}
                                placeholder="180"
                                min="100"
                                max="300"
                                step="10"
                            />
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Controls scroll space (100-300vh). Current: {siteFormData.scrollAnimation.scrollSectionHeight}vh
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Detail Overlay (vh)</label>
                            <input
                                type="number"
                                value={siteFormData.scrollAnimation.detailOverlay}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    scrollAnimation: { ...siteFormData.scrollAnimation, detailOverlay: parseInt(e.target.value) || -10 }
                                })}
                                style={inputStyle}
                                placeholder="-10"
                                min="-100"
                                max="0"
                                step="5"
                            />
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                How far detail moves up (-100 to 0vh). Current: {siteFormData.scrollAnimation.detailOverlay}vh
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Max Zoom Out (0.1 - 1.0)</label>
                            <input
                                type="number"
                                value={siteFormData.scrollAnimation.zoomOutMax}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    scrollAnimation: { ...siteFormData.scrollAnimation, zoomOutMax: parseFloat(e.target.value) || 0.65 }
                                })}
                                style={inputStyle}
                                placeholder="0.65"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                            />
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Default: 0.65. Controls background image scale.
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Image Y Deviation (+/- px)</label>
                            <input
                                type="number"
                                value={siteFormData.scrollAnimation.imageParallaxY}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    scrollAnimation: { ...siteFormData.scrollAnimation, imageParallaxY: parseInt(e.target.value) || -100 }
                                })}
                                style={inputStyle}
                                placeholder="-100"
                                min="-500"
                                max="500"
                                step="10"
                            />
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Default: -100. Parallax offset for images.
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Text Y Deviation (+/- px)</label>
                            <input
                                type="number"
                                value={siteFormData.scrollAnimation.textParallaxY}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    scrollAnimation: { ...siteFormData.scrollAnimation, textParallaxY: parseInt(e.target.value) || 50 }
                                })}
                                style={inputStyle}
                                placeholder="50"
                                min="-500"
                                max="500"
                                step="10"
                            />
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Default: 50. Parallax offset for text.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Animated Gradient Settings */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginBottom: '16px' }}>Animated Gradient Background</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Enable Animated Gradient</label>
                        <select
                            value={siteFormData.gradientSettings.enabled ? 'true' : 'false'}
                            onChange={e => setSiteFormData({
                                ...siteFormData,
                                gradientSettings: { ...siteFormData.gradientSettings, enabled: e.target.value === 'true' }
                            })}
                            style={inputStyle}
                        >
                            <option value="false">Disabled</option>
                            <option value="true">Enabled</option>
                        </select>
                    </div>

                    {siteFormData.gradientSettings.enabled && (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Animation Type</label>
                                <select
                                    value={siteFormData.gradientSettings.type}
                                    onChange={e => setSiteFormData({
                                        ...siteFormData,
                                        gradientSettings: { ...siteFormData.gradientSettings, type: e.target.value }
                                    })}
                                    style={inputStyle}
                                >
                                    <option value="morphing">Morphing (blobs moving)</option>
                                    <option value="shimmer">Shimmer (rotating gradients)</option>
                                    <option value="pulse">Pulse (scaling)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Animation Speed (seconds: 5-30)</label>
                                <input
                                    type="number"
                                    value={siteFormData.gradientSettings.speed}
                                    onChange={e => setSiteFormData({
                                        ...siteFormData,
                                        gradientSettings: { ...siteFormData.gradientSettings, speed: parseInt(e.target.value) || 10 }
                                    })}
                                    style={inputStyle}
                                    min="5"
                                    max="30"
                                    step="1"
                                />
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                    Current: {siteFormData.gradientSettings.speed}s
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Opacity / Brightness (0.1 - 1.0)</label>
                                <input
                                    type="number"
                                    value={siteFormData.gradientSettings.opacity}
                                    onChange={e => setSiteFormData({
                                        ...siteFormData,
                                        gradientSettings: { ...siteFormData.gradientSettings, opacity: parseFloat(e.target.value) || 0.8 }
                                    })}
                                    style={inputStyle}
                                    min="0.1"
                                    max="1.0"
                                    step="0.05"
                                />
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                    Current: {Math.round(siteFormData.gradientSettings.opacity * 100)}% brightness (1.0 = full brightness)
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Gradient Colors</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {siteFormData.gradientSettings.colors.map((color, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={e => {
                                                    const newColors = [...siteFormData.gradientSettings.colors];
                                                    newColors[index] = e.target.value;
                                                    setSiteFormData({
                                                        ...siteFormData,
                                                        gradientSettings: { ...siteFormData.gradientSettings, colors: newColors }
                                                    });
                                                }}
                                                style={{
                                                    width: '50px',
                                                    height: '40px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    background: color
                                                }}
                                            />
                                            <input
                                                type="text"
                                                value={color}
                                                onChange={e => {
                                                    const newColors = [...siteFormData.gradientSettings.colors];
                                                    newColors[index] = e.target.value;
                                                    setSiteFormData({
                                                        ...siteFormData,
                                                        gradientSettings: { ...siteFormData.gradientSettings, colors: newColors }
                                                    });
                                                }}
                                                style={{
                                                    ...inputStyle,
                                                    flex: 1,
                                                    fontFamily: 'monospace',
                                                    textTransform: 'uppercase'
                                                }}
                                                placeholder="#667eea"
                                            />
                                            {siteFormData.gradientSettings.colors.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newColors = siteFormData.gradientSettings.colors.filter((_, i) => i !== index);
                                                        setSiteFormData({
                                                            ...siteFormData,
                                                            gradientSettings: { ...siteFormData.gradientSettings, colors: newColors }
                                                        });
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(255, 85, 85, 0.1)',
                                                        color: '#ff5555',
                                                        border: '1px solid #ff5555',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {siteFormData.gradientSettings.colors.length < 4 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSiteFormData({
                                                    ...siteFormData,
                                                    gradientSettings: {
                                                        ...siteFormData.gradientSettings,
                                                        colors: [...siteFormData.gradientSettings.colors, '#ffffff']
                                                    }
                                                });
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'rgba(102, 126, 234, 0.2)',
                                                color: '#667eea',
                                                border: '1px solid #667eea',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                width: '100%'
                                            }}
                                        >
                                            + Add Color
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                    Click color box to pick visually, or edit hex code directly (2-4 colors)
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, ' + siteFormData.gradientSettings.colors.join(', ') + ')',
                                marginTop: '8px',
                                minHeight: '60px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                opacity: siteFormData.gradientSettings.opacity
                            }}>
                                Gradient Preview
                            </div>
                        </>
                    )}
                </div>

                {/* Noise Grain Settings */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginBottom: '16px' }}>Noise Grain Effect (Vintage Film)</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Enable Noise Grain</label>
                        <select
                            value={siteFormData.noiseSettings.enabled ? 'true' : 'false'}
                            onChange={e => setSiteFormData({
                                ...siteFormData,
                                noiseSettings: { ...siteFormData.noiseSettings, enabled: e.target.value === 'true' }
                            })}
                            style={inputStyle}
                        >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                        </select>
                    </div>

                    {siteFormData.noiseSettings.enabled && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Noise Intensity (0.1 - 1.0)</label>
                            <input
                                type="number"
                                value={siteFormData.noiseSettings.intensity}
                                onChange={e => setSiteFormData({
                                    ...siteFormData,
                                    noiseSettings: { ...siteFormData.noiseSettings, intensity: parseFloat(e.target.value) || 0.4 }
                                })}
                                style={inputStyle}
                                min="0.1"
                                max="1.0"
                                step="0.05"
                            />
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Current: {Math.round(siteFormData.noiseSettings.intensity * 100)}% - adds film grain texture
                            </div>
                        </div>
                    )}
                </div>

                {/* Favicon Upload */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={labelStyle}>Favicon</label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/x-icon"
                                onChange={handleFaviconUpload}
                                style={{ display: 'none' }}
                                id="favicon-upload"
                            />
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <label htmlFor="favicon-upload" style={uploadButtonStyle}>
                                    <FaUpload style={{ marginRight: '8px' }} />
                                    {uploading ? 'Uploading...' : 'Upload Favicon'}
                                </label>
                                {(faviconPreview || siteFormData.favicon) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSiteFormData({ ...siteFormData, favicon: '' });
                                            setFaviconPreview(null);
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
                                    marginTop: '4px',
                                    fontWeight: '500'
                                }}>
                                    {uploadStatus}
                                </div>
                            )}
                            {!uploadStatus && (
                                <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                                    PNG or ICO recommended • Will be compressed to ~50KB
                                </div>
                            )}
                        </div>
                        {(faviconPreview || siteFormData.favicon) && (
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '2px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.05)'
                            }}>
                                <img
                                    src={faviconPreview || siteFormData.favicon}
                                    alt="Favicon Preview"
                                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <Button variant="accent" onClick={handleSaveSiteSettings} style={{ marginTop: '8px' }}>
                    <FaSave style={{ marginRight: '8px' }} /> Save Site Settings
                </Button>

                <div style={{
                    marginTop: '20px',
                    padding: '12px',
                    background: 'rgba(204, 255, 0, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(204, 255, 0, 0.2)'
                }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-dim)', lineHeight: '1.6' }}>
                        <strong style={{ color: 'var(--color-text-light)' }}>Note:</strong> After uploading a new favicon, you may need to clear your browser cache or do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to see the changes.
                    </div>
                </div>
            </div>

            {/* PIN Settings Section */}

            <div style={{
                maxWidth: '500px',
                background: 'rgba(255,255,255,0.05)',
                padding: '32px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <FaLock style={{ color: 'var(--color-accent)', fontSize: '24px' }} />
                    <h2 style={{ fontSize: '20px', color: 'var(--color-text-light)', margin: 0 }}>Change Admin PIN</h2>
                </div>

                {success && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(0,255,0,0.1)',
                        color: '#00ffcc',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        PIN updated successfully!
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(255,0,0,0.1)',
                        color: '#ff5555',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-dim)', fontSize: '14px' }}>
                            Current PIN
                        </label>
                        <input
                            type="password"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-dim)', fontSize: '14px' }}>
                            New PIN
                        </label>
                        <input
                            type="password"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-dim)', fontSize: '14px' }}>
                            Confirm New PIN
                        </label>
                        <input
                            type="password"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <Button variant="accent" type="submit" style={{ marginTop: '8px' }}>
                        Update PIN
                    </Button>
                </form>
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
    width: '100%',
    fontFamily: 'inherit'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    color: 'var(--color-text-dim)',
    fontSize: '14px',
    fontWeight: '500'
};

const uploadButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 16px',
    background: 'rgba(204, 255, 0, 0.1)',
    border: '1px solid var(--color-accent)',
    borderRadius: '8px',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
};

export default AdminSettings;
