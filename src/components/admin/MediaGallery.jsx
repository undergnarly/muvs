import React, { useState, useEffect, useCallback } from 'react';
import { FaUpload, FaTimes, FaSearch } from 'react-icons/fa';

const MediaGallery = ({ isOpen, onClose, onSelect }) => {
    const [images, setImages] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchImages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/uploads');
            if (res.ok) {
                const data = await res.json();
                setImages(data);
            }
        } catch (err) {
            console.error('Failed to fetch uploads:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchImages();
            setSearch('');
        }
    }, [isOpen, fetchImages]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('image', file);
            const res = await fetch('/api/upload', { method: 'POST', body: form });
            if (res.ok) {
                await fetchImages();
            }
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const filtered = search
        ? images.filter(img => img.name.toLowerCase().includes(search.toLowerCase()))
        : images;

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + 'B';
        return Math.round(bytes / 1024) + 'KB';
    };

    if (!isOpen) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h3 style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '18px' }}>Media Gallery</h3>
                    <button onClick={onClose} style={closeButtonStyle}><FaTimes /></button>
                </div>

                <div style={toolbarStyle}>
                    <div style={searchWrapStyle}>
                        <FaSearch style={{ color: 'var(--color-text-dim)', fontSize: '14px' }} />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={searchInputStyle}
                            autoFocus
                        />
                    </div>
                    <label style={uploadBtnStyle}>
                        <FaUpload style={{ marginRight: '6px' }} />
                        {uploading ? 'Uploading...' : 'Upload'}
                        <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                </div>

                <div style={gridContainerStyle}>
                    {loading && <div style={emptyStyle}>Loading...</div>}
                    {!loading && filtered.length === 0 && <div style={emptyStyle}>No images found</div>}
                    {!loading && filtered.map(img => (
                        <div
                            key={img.url}
                            style={thumbWrapStyle}
                            onClick={() => { onSelect(img.url); onClose(); }}
                            title={`${img.name}\n${formatSize(img.size)}`}
                        >
                            <img src={img.url} alt={img.name} style={thumbImgStyle} />
                            <div style={thumbLabelStyle}>{img.name.length > 16 ? img.name.slice(0, 14) + '...' : img.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
};

const modalStyle = {
    background: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
};

const closeButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-dim)',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px'
};

const toolbarStyle = {
    display: 'flex',
    gap: '12px',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
};

const searchWrapStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)'
};

const searchInputStyle = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'white',
    fontSize: '14px'
};

const uploadBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'rgba(204, 255, 0, 0.1)',
    border: '1px solid var(--color-accent)',
    borderRadius: '8px',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
};

const gridContainerStyle = {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
    alignContent: 'start'
};

const emptyStyle = {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: 'var(--color-text-dim)'
};

const thumbWrapStyle = {
    cursor: 'pointer',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '2px solid transparent',
    background: 'rgba(0,0,0,0.3)',
    transition: 'border-color 0.2s'
};

const thumbImgStyle = {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    display: 'block'
};

const thumbLabelStyle = {
    padding: '4px 6px',
    fontSize: '10px',
    color: 'var(--color-text-dim)',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
};

export default MediaGallery;
