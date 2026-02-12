
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    try {
        const browser = await chromium.launch({
            executablePath: '/usr/bin/google-chrome',
            headless: true
        });
        const page = await browser.newPage();

        console.log('Navigating to page...');
        await page.goto('https://muvs.dev/cv', { waitUntil: 'networkidle' });

        console.log('Waiting for animations...');
        await new Promise(r => setTimeout(r, 3000));

        // Modify content for PDF
        await page.evaluate(() => {
            // Add name under title
            const titleBg = document.querySelector('.cv-title-background');
            if (titleBg) {
                const nameDiv = document.createElement('div');
                nameDiv.innerText = 'Nikita Antimonov';
                nameDiv.style.color = '#000000';
                nameDiv.style.fontSize = '24px';
                nameDiv.style.fontWeight = '600';
                nameDiv.style.marginTop = '16px';
                nameDiv.style.textTransform = 'uppercase';
                titleBg.appendChild(nameDiv);
            }
        });

        // Inject print styles
        await page.addStyleTag({
            content: `
                /* Force black background globally to fix bottom whitespace */
                html, body {
                    background-color: #000000 !important;
                    -webkit-print-color-adjust: exact;
                }
                
                #root {
                    background-color: #000000 !important;
                }

                /* Header Styling: White BG, Black Text */
                .cv-cover-container {
                    background-color: #ffffff !important;
                    height: auto !important;
                    max-height: 400px !important;
                    padding-bottom: 40px;
                    margin-bottom: 0 !important;
                    position: relative !important;
                }

                .cv-title-background {
                    position: relative !important;
                    top: auto !important;
                    left: auto !important;
                    transform: none !important;
                    padding-top: 80px;
                }

                .cv-title-text {
                    color: #000000 !important;
                    font-size: 60px !important; 
                }
                
                .home-title .char {
                     color: #000000 !important;
                }

                /* Hide Images in Header if they conflict with white theme */
                .cv-image-placeholder, .about-image-desktop, .about-image-mobile {
                    display: none !important;
                }

                /* Ensure Logic Flow for Print */
                .sticky-container {
                    position: relative !important;
                    height: auto !important;
                }

                .cover-content-wrapper {
                    position: relative !important;
                    height: auto !important;
                }

                .scroll-section {
                    overflow: visible !important;
                    height: auto !important;
                }

                .cv-details-container {
                    background-color: #000000 !important;
                    padding-top: 40px !important;
                    min-height: 100vh;
                }

                /* Hide UI Elements */
                .staggered-menu-header,
                .scroll-indicator-wrapper,
                .cv-download-btn,
                .top-blur, 
                .page-gradient {
                    display: none !important;
                }
            `
        });

        console.log('Generating PDF...');
        await page.pdf({
            path: 'public/resume/resume.pdf',
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0px',
                bottom: '0px',
                left: '0px',
                right: '0px'
            }
        });

        await browser.close();
        console.log('PDF generated successfully at public/resume/resume.pdf');
    } catch (e) {
        console.error('Error generating PDF:', e);
        process.exit(1);
    }
})();
