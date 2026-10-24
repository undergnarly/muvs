import React, { useEffect, useId, useRef, useState } from 'react';
import Button from '../ui/Button';
import './LoginPage.css';

const LoginPage = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [invalidPin, setInvalidPin] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);
    const passwordId = useId();
    const helpId = `${passwordId}-help`;
    const errorId = `${passwordId}-error`;

    useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);
    useEffect(() => {
        if (error && !submitting) inputRef.current?.focus({ preventScroll: true });
    }, [error, submitting]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setError('');
        setInvalidPin(false);

        if (!password.trim()) {
            setError('Enter PIN');
            setInvalidPin(true);
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
                    setInvalidPin(true);
                    return;
                }
                throw new Error(`PIN validation failed with ${response.status}`);
            }

            window.location.assign('/admin');
        } catch (err) {
            console.error('Admin login failed:', err);
            setError('Login service unavailable');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="admin-login">
            <form className="admin-login-form" onSubmit={handleLogin} noValidate aria-busy={submitting} aria-describedby={error ? errorId : helpId}>
                <h1>Admin Access</h1>
                <p id={helpId} className="admin-login-help">Enter your admin PIN to continue.</p>
                <label htmlFor={passwordId}>PIN</label>
                <input
                    ref={inputRef}
                    id={passwordId}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); setInvalidPin(false); }}
                    placeholder="Enter PIN"
                    disabled={submitting}
                    aria-invalid={invalidPin}
                    aria-describedby={error ? `${helpId} ${errorId}` : helpId}
                />
                {error && <p id={errorId} className="admin-login-error" role="alert">{error}</p>}
                <Button
                    variant="accent"
                    type="submit"
                    disabled={submitting}
                >
                    {submitting ? 'Checking…' : 'Login'}
                </Button>
            </form>
        </main>
    );
};

export default LoginPage;
