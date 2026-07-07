import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const LoginPage = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!password.trim()) {
            setError('Enter PIN');
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/auth/validate-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: password }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Invalid PIN');
                    return;
                }
                throw new Error(`PIN validation failed with ${response.status}`);
            }

            sessionStorage.setItem('isAdmin', 'true');
            navigate('/admin');
        } catch (err) {
            console.error('Admin login failed:', err);
            setError('Login service unavailable');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-bg-dark)',
            color: 'var(--color-text-light)'
        }}>
            <form onSubmit={handleLogin} style={{
                padding: '40px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '300px'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Admin Access</h2>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter PIN"
                    disabled={submitting}
                    style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        outline: 'none'
                    }}
                />
                {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
                <Button
                    variant="accent"
                    type="submit"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={submitting}
                >
                    {submitting ? 'Checking…' : 'Login'}
                </Button>
            </form>
        </div>
    );
};

export default LoginPage;
