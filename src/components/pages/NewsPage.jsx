import React from 'react';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';

const NewsPage = () => {
    const CoverContent = (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <h1 style={{ fontSize: '64px', color: 'var(--color-text-light)' }}>
                <SplitText delay={0.2}>NEWS</SplitText>
            </h1>
            <p style={{ marginTop: '20px', color: 'var(--color-accent)', letterSpacing: '0.1em' }}>COMING SOON</p>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<div style={{ padding: '50px', textAlign: 'center' }}>Check back later for updates.</div>}
        />
    );
};

export default NewsPage;
