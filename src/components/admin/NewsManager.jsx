import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { validateImageFile } from '../../utils/imageCompression';

const NewsManager = () => {
    const { news, newsSettings, updateData } = useData();
    const [activeTab, setActiveTab] = useState('items'); // 'items' or 'settings'
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    // Settings State
    const [settingsData, setSettingsData] = useState(newsSettings || {
        titleFontSize: '60px',
        titleTopPosition: '20%',
        backgroundImageDesktop: '',
        backgroundImageMobile: ''
    });

    const [settingsImagePreviewDesktop, setSettingsImagePreviewDesktop] = useState(newsSettings?.backgroundImageDesktop || null);
    const [settingsImagePreviewMobile, setSettingsImagePreviewMobile] = useState(newsSettings?.backgroundImageMobile || null);

    // Initialize settings from context
    React.useEffect(() => {
        if (newsSettings) {
            setSettingsData(newsSettings);
            setSettingsImagePreviewDesktop(newsSettings.backgroundImageDesktop);
            setSettingsImagePreviewMobile(newsSettings.backgroundImageMobile);
        }
    }, [newsSettings]);

    // Item Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        excerpt: '',
        image: ''
    });

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            title: item.title,
            date: item.date,
            excerpt: item.excerpt,
            image: item.image || ''
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
            image: ''
        });
        setImagePreview(null);
        setUploadStatus('');
        setKeepOriginal(false);
        setIsFormOpen(true);
    };

    const handleImageUpload = async (e, isSettings = false, settingType = null) => {
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

            if (isSettings) {
                if (settingType === 'desktop') {
                    setSettingsData(prev => ({ ...prev, backgroundImageDesktop: url }));
                    setSettingsImagePreviewDesktop(url);
                } else if (settingType === 'mobile') {
                    setSettingsData(prev => ({ ...prev, backgroundImageMobile: url }));
                    setSettingsImagePreviewMobile(url);
                }
            } else {
                setFormData(prev => ({ ...prev, image: url }));
                setImagePreview(url);
            }

            setTimeout(() => setUploadStatus(''), 4000);
        } catch (error) {
            setUploadStatus('Error: ' + error.message);
            setTimeout(() => setUploadStatus(''), 3000);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSubmitItem = (e) => {
        e.preventDefault();

        const newItem = {
            id: editingItem ? editingItem.id : Date.now(),
            ...formData
        };

        if (editingItem) {
            const updatedNews = news.map(item =>
                item.id === editingItem.id ? newItem : item
            );
            updateData('news', updatedNews);
        } else {
            updateData('news', [newItem, ...news]);
        }

        setIsFormOpen(false);
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        updateData('newsSettings', settingsData);
        alert('News page settings saved!');
    };

    const tabStyle = (isActive) => ({
        padding: '10px 20px',
        background: isActive ? 'var(--color-accent)' : 'transparent',
        color: isActive ? '#000' : 'var(--color-text-dim)',
        border: '1px solid var(--color-accent)',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease'
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Manage News</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={tabStyle(activeTab === 'items')} onClick={() => setActiveTab('items')}>News Items</button>
                    <button style={tabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>Page Settings</button>
                </div>
            </div>

            {activeTab === 'items' && (
                <>
                    {!isFormOpen ? (
                        <>
                            <div style={{ marginBottom: '20px' }}>
                                <Button onClick={handleAddNew} variant="accent" icon={FaPlus}>
                                    Add News Item
                                </Button>
                            </div>

                            <div style={{ display: 'grid', gap: '16px' }}>
                                {news.map(item => (
                                    <div key={item.id} style={itemStyle}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '12px', color: 'var(--color-accent)', marginBottom: '4px' }}>
                                                {item.date}
                                            </div>
                                            <h3 style={{ fontSize: '18px', color: 'var(--color-text-light)', margin: '0 0 8px 0' }}>
                                                {item.title}
                                            </h3>
                                            <div style={{ fontSize: '14px', color: 'var(--color-text-dim)' }}>
                                                {item.excerpt.substring(0, 100)}...
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEdit(item)} style={actionButtonStyle}>
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} style={actionButtonStyle}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {news.length === 0 && (
                                    <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '40px' }}>
                                        No news items yet.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={formContainerStyle}>
                            <h2 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>
                                {editingItem ? 'Edit News Item' : 'New News Item'}
                            </h2>
                            <form onSubmit={handleSubmitItem} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Date</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Content (HTML allowed)</label>
                                    <textarea
                                        value={formData.excerpt}
                                        onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                                        style={{ ...inputStyle, minHeight: '150px' }}
                                        required
                                    />
                                </div>

                                {/* Image Upload for Item */}
                                <div>
                                    <label style={labelStyle}>Image (Optional)</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <label style={uploadButtonStyle}>
                                            <FaUpload /> Choose Image
                                            <input
                                                type="file"
                                                onChange={(e) => handleImageUpload(e, false)}
                                                style={{ display: 'none' }}
                                                accept="image/*"
                                            />
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-dim)', fontSize: '12px' }}>
                                            Server-side optimization
                                        </label>
                                    </div>
                                    {uploading && <div style={{ marginTop: '10px', color: 'var(--color-accent)' }}>{uploadStatus}</div>}
                                    {imagePreview && (
                                        <div style={{ marginTop: '10px', position: 'relative', maxWidth: '300px' }}>
                                            <img src={imagePreview} alt="Preview" style={{ width: '100%', borderRadius: '4px' }} />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, image: '' });
                                                    setImagePreview(null);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '5px',
                                                    right: '5px',
                                                    background: 'rgba(0,0,0,0.7)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <Button type="submit" variant="accent">
                                        {editingItem ? 'Update Item' : 'Create Item'}
                                    </Button>
                                    <Button type="button" onClick={() => setIsFormOpen(false)} variant="secondary">
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'settings' && (
                <div style={formContainerStyle}>
                    <h2 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>
                        Page Configuration
                    </h2>
                    <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Title Font Size</label>
                            <input
                                type="text"
                                placeholder="e.g. 60px"
                                value={settingsData.titleFontSize || '60px'}
                                onChange={e => setSettingsData({ ...settingsData, titleFontSize: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Title Top Position</label>
                            <input
                                type="text"
                                placeholder="e.g. 20%"
                                value={settingsData.titleTopPosition || '20%'}
                                onChange={e => setSettingsData({ ...settingsData, titleTopPosition: e.target.value })}
                                style={inputStyle}
                            />
                        </div>

                        {/* Desktop Image */}
                        <div>
                            <label style={labelStyle}>Background Image (Desktop)</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <label style={uploadButtonStyle}>
                                    <FaUpload /> Choose Desktop Image
                                    <input
                                        type="file"
                                        onChange={(e) => handleImageUpload(e, true, 'desktop')}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                    />
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-dim)', fontSize: '12px' }}>
                                    Server-side optimization
                                </label>
                            </div>
                            {settingsImagePreviewDesktop && (
                                <div style={{ marginTop: '10px', position: 'relative', maxWidth: '300px' }}>
                                    <img src={settingsImagePreviewDesktop} alt="Desktop Preview" style={{ width: '100%', borderRadius: '4px' }} />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSettingsData({ ...settingsData, backgroundImageDesktop: '' });
                                            setSettingsImagePreviewDesktop(null);
                                        }}
                                        style={removeButtonStyle}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Image */}
                        <div>
                            <label style={labelStyle}>Background Image (Mobile)</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <label style={uploadButtonStyle}>
                                    <FaUpload /> Choose Mobile Image
                                    <input
                                        type="file"
                                        onChange={(e) => handleImageUpload(e, true, 'mobile')}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                    />
                                </label>
                            </div>
                            {settingsImagePreviewMobile && (
                                <div style={{ marginTop: '10px', position: 'relative', maxWidth: '300px' }}>
                                    <img src={settingsImagePreviewMobile} alt="Mobile Preview" style={{ width: '100%', borderRadius: '4px' }} />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSettingsData({ ...settingsData, backgroundImageMobile: '' });
                                            setSettingsImagePreviewMobile(null);
                                        }}
                                        style={removeButtonStyle}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>

                        {uploading && <div style={{ color: 'var(--color-accent)' }}>{uploadStatus}</div>}

                        <Button type="submit" variant="accent">
                            Save Configuration
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
};

const itemStyle = {
    padding: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px'
};

const formContainerStyle = {
    padding: '24px',
    background: 'rgba(20,20,20,0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
};

const labelStyle = {
    color: 'var(--color-text-light)',
    marginBottom: '8px',
    display: 'block'
};

const inputStyle = {
    width: '100%',
    padding: '12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px'
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
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--color-text-light)',
    fontSize: '14px'
};

const removeButtonStyle = {
    position: 'absolute',
    top: '5px',
    right: '5px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer'
};

export default NewsManager;
