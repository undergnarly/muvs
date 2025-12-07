import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { FaLock } from 'react-icons/fa';

const AdminSettings = () => {
    const { adminSettings, updatePin } = useData();
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

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

    return (
        <div>
            <h1 style={{ fontSize: '32px', marginBottom: '32px', color: 'var(--color-text-light)' }}>Settings</h1>

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

export default AdminSettings;
