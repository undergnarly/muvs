import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaEdit, FaTrash, FaPlus, FaUpload, FaCopy } from 'react-icons/fa';
import { compressImage, validateImageFile } from '../../utils/imageCompression';

const ProjectsManager = () => {
    const { projects, updateData } = useData();
    const [editingItem, setEditingItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    const initialForm = {
        title: '',
        thumbnail: '',
        coverImage: '',
        description: '',
        fullDescription: '',
        descriptionImages: [],
        technologies: '', // Will split by comma
        liveUrl: '',
        githubUrl: '',
        features: '', // Will split by comma
        parallaxStrength: 50,
        gallery: []
    };
    const [formData, setFormData] = useState(initialForm);

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            ...item,
            technologies: item.technologies ? item.technologies.join(', ') : '',
            features: item.features ? item.features.join(', ') : ''
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this project?')) {
            const updated = projects.filter(item => item.id !== id);
            updateData('projects', updated);
        }
    };

    const handleAddNew = () => {
        setEditingItem(null);
        setFormData(initialForm);
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
            setFormData({ ...formData, thumbnail: url });

            setTimeout(() => setUploadStatus(''), 4000);
        } catch (error) {
            setUploadStatus('Error: ' + error.message);
            setTimeout(() => setUploadStatus(''), 3000);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDescriptionImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            setUploadStatus('Uploading description image...');
            validateImageFile(file);

            const compressedBase64 = await compressImage(file, 250);
            const response = await fetch(compressedBase64);
            const blob = await response.blob();

            const uploadForm = new FormData();
            const ext = file.type === 'image/png' ? 'png' : 'jpg';
            uploadForm.append('image', blob, `desc-${Date.now()}.${ext}`);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Upload failed');

            const { url } = await uploadRes.json();

            const newImage = {
                id: Date.now(),
                url: url,
                name: file.name
            };

            setFormData({
                ...formData,
                descriptionImages: [...(formData.descriptionImages || []), newImage]
            });

            setUploadStatus('Image uploaded!');
            setTimeout(() => setUploadStatus(''), 2000);
        } catch (error) {
            setUploadStatus('Error: ' + error.message);
            setTimeout(() => setUploadStatus(''), 3000);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const copyImageHtml = (imageUrl) => {
        const html = `<img src="${imageUrl}" alt="Project image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />`;
        navigator.clipboard.writeText(html).then(() => {
            setUploadStatus('HTML copied to clipboard!');
            setTimeout(() => setUploadStatus(''), 2000);
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const finalData = {
            ...formData,
            id: editingItem ? editingItem.id : Date.now(),
            technologies: formData.technologies.split(',').map(s => s.trim()).filter(Boolean),
            features: formData.features.split(',').map(s => s.trim()).filter(Boolean)
        };

        if (editingItem) {
            const updated = projects.map(item => item.id === editingItem.id ? finalData : item);
            updateData('projects', updated);
        } else {
            updateData('projects', [finalData, ...projects]);
        }
        setIsFormOpen(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--color-text-light)' }}>Manage Projects</h1>
                <Button variant="accent" onClick={handleAddNew}>
                    <FaPlus style={{ marginRight: '8px' }} /> Add Project
                </Button>
            </div>

            {isFormOpen && (
                <div style={formContainerStyle}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--color-text-light)' }}>
                        {editingItem ? 'Edit Project' : 'New Project'}
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="Title"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                                style={inputStyle}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Cover Image URL (or upload)"
                                    value={formData.coverImage || formData.thumbnail || ''}
                                    onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <label className="icon-btn" style={{ ...inputStyle, width: 'auto', display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'var(--color-surface)' }}>
                                    <FaUpload />
                                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                                </label>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                                Server-side optimization enabled
                            </label>
                        </div>
                        {uploadStatus && <div style={{ fontSize: '12px', color: 'var(--color-accent)' }}>{uploadStatus}</div>}
                        <input
                            type="text"
                            placeholder="Thumbnail URL (optional fallback)"
                            value={formData.thumbnail}
                            onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                            style={inputStyle}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <input
                                type="text"
                                placeholder="Live URL"
                                value={formData.liveUrl}
                                onChange={e => setFormData({ ...formData, liveUrl: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="GitHub URL"
                                value={formData.githubUrl}
                                onChange={e => setFormData({ ...formData, githubUrl: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <textarea
                            placeholder="Short Description (supports HTML for links)"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            required
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <textarea
                            placeholder="Full Description (supports HTML)"
                            value={formData.fullDescription}
                            onChange={e => setFormData({ ...formData, fullDescription: e.target.value })}
                            rows={5}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />

                        {/* Description Images Section */}
                        <div style={{ marginTop: '16px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h4 style={{ color: 'var(--color-text-light)', fontSize: '16px', margin: 0, marginBottom: '4px' }}>Description Images</h4>
                                    <p style={{ color: 'var(--color-text-dim)', fontSize: '12px', margin: 0 }}>Upload images to use in description. Click "Copy HTML" to insert into description field.</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleDescriptionImageUpload}
                                    style={{ display: 'none' }}
                                    id="desc-image-upload"
                                />
                                <label htmlFor="desc-image-upload" style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '8px 16px',
                                    background: 'rgba(204, 255, 0, 0.1)',
                                    border: '1px solid var(--color-accent)',
                                    borderRadius: '8px',
                                    color: 'var(--color-accent)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}>
                                    <FaUpload style={{ marginRight: '6px' }} />
                                    {uploading ? 'Uploading...' : 'Upload Image'}
                                </label>
                            </div>
                            {uploadStatus && (
                                <div style={{
                                    fontSize: '12px',
                                    color: uploadStatus.includes('Error') ? '#ff5555' : 'var(--color-accent)',
                                    marginBottom: '12px',
                                    fontWeight: '500'
                                }}>
                                    {uploadStatus}
                                </div>
                            )}
                            {formData.descriptionImages && formData.descriptionImages.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                    {formData.descriptionImages.map((img, index) => (
                                        <div key={img.id || index} style={{
                                            padding: '12px',
                                            background: 'rgba(0,0,0,0.3)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                style={{
                                                    width: '100%',
                                                    height: '120px',
                                                    objectFit: 'cover',
                                                    borderRadius: '6px',
                                                    marginBottom: '8px'
                                                }}
                                            />
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginBottom: '8px', wordBreak: 'break-all' }}>
                                                {img.name}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => copyImageHtml(img.url)}
                                                    style={{
                                                        flex: 1,
                                                        background: 'rgba(204, 255, 0, 0.1)',
                                                        border: '1px solid var(--color-accent)',
                                                        borderRadius: '6px',
                                                        color: 'var(--color-accent)',
                                                        padding: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <FaCopy /> Copy HTML
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updatedImages = formData.descriptionImages.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, descriptionImages: updatedImages });
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid #ff5555',
                                                        borderRadius: '6px',
                                                        color: '#ff5555',
                                                        padding: '6px 10px',
                                                        cursor: 'pointer',
                                                        fontSize: '11px'
                                                    }}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-dim)', fontSize: '14px' }}>
                                    No images added yet. Upload images to insert into description.
                                </div>
                            )}
                        </div>

                        <input
                            type="text"
                            placeholder="Technologies (comma separated)"
                            value={formData.technologies}
                            onChange={e => setFormData({ ...formData, technologies: e.target.value })}
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            placeholder="Key Features (comma separated)"
                            value={formData.features}
                            onChange={e => setFormData({ ...formData, features: e.target.value })}
                            style={inputStyle}
                        />
                        <input
                            type="number"
                            placeholder="Parallax Strength (0-200, default 50)"
                            value={formData.parallaxStrength || ''}
                            onChange={e => setFormData({ ...formData, parallaxStrength: parseInt(e.target.value) || 50 })}
                            style={inputStyle}
                        />

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
                                                        background: 'var(--color-surface)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '4px',
                                                        color: 'var(--color-text-light)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
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
                                                        const updated = formData.gallery.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, gallery: updated });
                                                    }}
                                                    style={{ color: '#ff5555', fontSize: '14px', padding: '4px' }}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>

                                            {item.image && (
                                                <div style={{ marginBottom: '12px', width: '100%', height: '100px', borderRadius: '4px', overflow: 'hidden', background: '#000' }}>
                                                    <img src={item.image} alt={item.text} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                </div>
                                            )}

                                            <input
                                                type="text"
                                                placeholder="Caption (optional)"
                                                value={item.text || ''}
                                                onChange={e => {
                                                    const updatedGallery = [...formData.gallery];
                                                    updatedGallery[index] = { ...item, text: e.target.value };
                                                    setFormData({ ...formData, gallery: updatedGallery });
                                                }}
                                                style={{ ...inputStyle, width: '100%', fontSize: '14px' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                                    No images in gallery
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
                {projects.map(item => (
                    <div key={item.id} style={itemStyle}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            {item.thumbnail && (
                                <img src={item.thumbnail} alt={item.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                            )}
                            <div>
                                <h3 style={{ color: 'var(--color-text-light)', marginBottom: '4px' }}>{item.title}</h3>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-dim)' }}>
                                    {item.technologies && item.technologies.slice(0, 3).join(', ')}...
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

export default ProjectsManager;
