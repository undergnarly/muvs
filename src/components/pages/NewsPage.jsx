import React from 'react';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';

import { news } from '../../data/news';

const NewsPage = () => {
    const CoverContent = (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <h1 style={{ fontSize: '64px', color: 'var(--color-text-light)' }}>
                <SplitText delay={0.2}>NEWS</SplitText>
            </h1>
        </div>
    );

    const DetailContent = (
        <div style={{ padding: '60px 40px', maxWidth: '800px', margin: '0 auto' }}>
            <div className="news-grid" style={{ display: 'grid', gap: '32px' }}>
                {news.map(item => (
                    <div key={item.id} className="news-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-accent)', marginBottom: '8px' }}>
                            {item.date}
                        </div>
                        <h2 style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--color-text-light)' }}>{item.title}</h2>
                        <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>{item.excerpt}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={DetailContent}
        />
    );
};

export default NewsPage;
