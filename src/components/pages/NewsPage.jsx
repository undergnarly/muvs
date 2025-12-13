import React from 'react';
import BaseSlidePage from '../layout/BaseSlidePage';
import Header from '../layout/Header';
import SplitText from '../ui/SplitText';

import { useData } from '../../context/DataContext';

const NewsPage = () => {
    const { news, newsSettings } = useData();
    const settings = newsSettings || {};

    // Default fallback values
    const titleTop = settings.titleTopPosition || '20%';
    const titleSize = settings.titleFontSize || '60px';

    const CoverContent = (
        <div className="mix-cover-container">
            {/* Background Title - with explicit centering fix */}
            <div
                className="mix-title-background"
                style={{
                    top: titleTop,
                    left: '50%', // Explicitly set left 50%
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1
                }}
            >
                <h1
                    className="mix-title-text"
                    style={{
                        fontSize: titleSize,
                        visibility: 'visible',
                        textAlign: 'center'
                    }}
                >
                    <SplitText delay={0.2}>NEWS</SplitText>
                </h1>
            </div>

            {/* Constrained Image Wrapper - Logic from AboutPage */}
            <div className="about-cover-wrapper">
                {(settings.backgroundImageDesktop || settings.backgroundImageMobile) && (
                    <div className="about-image-placeholder">
                        {/* Show adaptive images if they exist */}
                        {/* Desktop image - shown only on desktop */}
                        {settings.backgroundImageDesktop && (
                            <img
                                src={settings.backgroundImageDesktop}
                                alt="News background"
                                className="about-image-desktop"
                            />
                        )}
                        {/* Mobile image - shown only on mobile */}
                        {settings.backgroundImageMobile && (
                            <img
                                src={settings.backgroundImageMobile}
                                alt="News background"
                                className="about-image-mobile"
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const DetailContent = (
        <div style={{
            padding: '0', // Let BaseSlidePage handle padding
            maxWidth: '100%',
            width: '100%',
            margin: '0 auto',
            minHeight: '100%'
        }}>
            <div className="news-grid" style={{
                display: 'grid',
                gap: '40px',
                maxWidth: '800px', // Match Projects page
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
                pageId="news"
            />
        </>
    );
};

export default NewsPage;
