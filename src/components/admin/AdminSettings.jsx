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
        siteDescription: siteSettings?.siteDescription || 'Audio • Visual • Code'
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
