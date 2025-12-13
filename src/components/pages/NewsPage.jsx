import React from 'react';
import BaseSlidePage from '../layout/BaseSlidePage';
import Header from '../layout/Header';
import SplitText from '../ui/SplitText';

import { useData } from '../../context/DataContext';

const NewsPage = () => {
    const { news } = useData();

    // Use Mix/Release styling logic
    const CoverContent = (
        <div className="mix-cover-container">
            {/* Background Title */}
            <div
                className="mix-title-background"
                style={{ top: news[0]?.titleTopPosition || '20%' }}
            >
                <h1
                    className="mix-title-text"
                    style={{ fontSize: news[0]?.titleFontSize || 'min(24vw, 120px)' }}
                >
                    <SplitText delay={0.2}>NEWS</SplitText>
                </h1>
            </div>

            {/* Constrained Content Wrapper (acting like 'cover') */}
            <div className="mix-cover-wrapper" style={{ border: 'none', background: 'transparent' }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                }}>
                    {/* Placeholder text removed */}
                </div>
            </div>
        </div>
    );

    const DetailContent = (
        <div style={{
            padding: '40px 20px',
            maxWidth: '100%',
            width: '100%',
            margin: '0 auto',
            minHeight: '100%'
        }}>
            <div className="news-grid" style={{
                display: 'grid',
                gap: '40px',
                maxWidth: '600px', // Constrain reading width for better UX
                margin: '0 auto'
            }}>
                {news.map(item => (
                    <div key={item.id} className="news-item" style={{
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '32px'
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '14px',
                            color: 'var(--color-accent)',
                            marginBottom: '12px'
                        }}>
                            {item.date}
                        </div>
                        <h2 style={{
                            fontSize: '28px',
                            marginBottom: '16px',
                            color: 'var(--color-text-light)',
                            lineHeight: '1.2'
                        }}>
                            {item.title}
                        </h2>
                        {item.image && (
                            <div className="news-image-wrapper" style={{
                                width: '100%',
                                marginBottom: '24px',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <img src={item.image} alt={item.title} style={{ width: '100%', display: 'block' }} />
                            </div>
                        )}
                        <div
                            style={{ lineHeight: '1.8', color: 'var(--color-text-dim)', fontSize: '18px' }}
                            dangerouslySetInnerHTML={{ __html: item.excerpt }}
                        ></div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <Header />
            <BaseSlidePage
                coverContent={CoverContent}
                detailContent={DetailContent}
            />
        </>
    );
};

export default NewsPage;
