
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
        await page.goto('http://localhost:5173/cv', { waitUntil: 'networkidle' });

        console.log('Waiting for animations...');
        await new Promise(r => setTimeout(r, 3000));

        // Ensure directory exists
        if (!fs.existsSync('public/resume')) {
            fs.mkdirSync('public/resume', { recursive: true });
        }

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
