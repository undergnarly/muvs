import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAdminSave() {
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const pending = useRef(false);
    const mounted = useRef(false);
    const saveErrorRef = useRef(null);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => { if (saveError) saveErrorRef.current?.focus(); }, [saveError]);
    const save = useCallback(async operation => {
        if (pending.current) return false;
        pending.current = true;
        setSaving(true); setSaveError(''); setSaveStatus('');
        try {
            await operation();
            if (mounted.current) setSaveStatus('Last change saved.');
            return true;
        } catch (error) {
            if (mounted.current) setSaveError(error?.message || 'The change was not saved. Please retry.');
            return false;
        } finally {
            pending.current = false;
            if (mounted.current) setSaving(false);
        }
    }, []);
    return { saving, saveError, saveStatus, saveErrorRef, save };
}
