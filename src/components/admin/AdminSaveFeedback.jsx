export default function AdminSaveFeedback({ saving, saveError, saveStatus, saveErrorRef }) {
    return <>
        {saveError && <p ref={saveErrorRef} tabIndex={-1} role="alert" style={{ color: '#ffb8b8', marginBottom: 16, padding: 12, border: '1px solid currentColor', borderRadius: 6 }}>
            {saveError}
            {saveError.includes('session has expired') && <> <a href="/login" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Sign in in another tab, then retry here.</a></>}
        </p>}
        {(saving || saveStatus) && <p role="status" style={{ color: 'var(--color-text-light)', marginBottom: 16 }}>{saving ? 'Saving…' : saveStatus}</p>}
    </>;
}
