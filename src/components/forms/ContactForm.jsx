import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';

const ContactForm = () => {
    const { addMessage } = useData();
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState(''); // 'success', 'submitting'

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('submitting');

        // Simulate network delay for better UX
        setTimeout(() => {
            addMessage(formData);
            setFormData({ name: '', email: '', message: '' });
            setStatus('success');

            // Clear success message after 3 seconds
            setTimeout(() => setStatus(''), 3000);
        }, 800);
    };

    return (
        <div style={{
            marginTop: '32px',
            padding: '24px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            maxWidth: '600px', // Limit width for better reading line
            marginLeft: 'auto',
            marginRight: 'auto'
        }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--color-text-light)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Send a Message</h3>

            {status === 'success' ? (
                <div style={{ padding: '16px', background: 'rgba(0,255,0,0.1)', color: '#00ffcc', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}>
                    Message sent successfully!
                </div>
            ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            style={inputStyle}
                        />
                        <input
                            type="email"
                            placeholder="Your Email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                            style={inputStyle}
                        />
                    </div>
                    <textarea
                        placeholder="Your Message... (Feel free to write more)"
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                        required
                        rows={6}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <Button variant="accent" type="submit" disabled={status === 'submitting'} size="small">
                            {status === 'submitting' ? 'Sending...' : 'Send Message'}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
};

const inputStyle = {
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: 'white',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: '14px',
    transition: 'border-color 0.2s, background 0.2s'
};

export default ContactForm;
