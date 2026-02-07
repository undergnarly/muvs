const nodemailer = require('nodemailer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

// SMTP configuration via environment variables
// Set these before running the server:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
        }
    });
};

/**
 * Create a ZIP archive from audio files of a release
 * @param {Object} release - Release object with tracks and audio data
 * @param {string} dataDir - Path to the data directory
 * @returns {Promise<string>} - Path to the created ZIP file
 */
const createReleaseArchive = (release, dataDir) => {
    return new Promise((resolve, reject) => {
        const archiveDir = path.join(dataDir, 'archives');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        const safeName = (release.artists ? release.artists + ' - ' : '') +
            release.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
        const archivePath = path.join(archiveDir, `${safeName}.zip`);

        const output = fs.createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 5 } });

        output.on('close', () => resolve(archivePath));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);

        // Add audio preview if exists
        if (release.audioPreview) {
            const audioPath = path.join(dataDir, release.audioPreview);
            if (fs.existsSync(audioPath)) {
                const ext = path.extname(audioPath) || '.mp3';
                archive.file(audioPath, { name: `${safeName}${ext}` });
            }
        }

        // Add any additional track files from uploads/audio directory
        // that match the release (check for files linked in tracks)
        if (release.tracks && release.tracks.length > 0) {
            release.tracks.forEach((track, index) => {
                if (track.audioFile) {
                    const trackPath = path.join(dataDir, track.audioFile);
                    if (fs.existsSync(trackPath)) {
                        const ext = path.extname(trackPath) || '.mp3';
                        const trackNum = String(index + 1).padStart(2, '0');
                        const trackName = track.title || `Track ${index + 1}`;
                        archive.file(trackPath, { name: `${trackNum} - ${trackName}${ext}` });
                    }
                }
            });
        }

        archive.finalize();
    });
};

/**
 * Send release archive to email
 * @param {string} email - Recipient email
 * @param {Object} release - Release object
 * @param {string} archivePath - Path to the ZIP archive
 * @returns {Promise<Object>} - Nodemailer send result
 */
const sendReleaseEmail = async (email, release, archivePath) => {
    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@muvs.dev';

    const releaseName = (release.artists ? release.artists + ' - ' : '') + release.title;

    const mailOptions = {
        from: fromAddress,
        to: email,
        subject: `${releaseName} - Download`,
        html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
                <h1 style="color: #ccff00; font-size: 24px; margin-bottom: 8px;">${release.title}</h1>
                ${release.artists ? `<p style="color: #888; font-size: 16px; margin-top: 0;">${release.artists}</p>` : ''}
                <hr style="border: none; border-top: 1px solid #222; margin: 24px 0;" />
                <p style="color: #ccc; font-size: 16px; line-height: 1.6;">
                    Your release is attached as a ZIP archive with MP3 files in 320kbps quality.
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 32px;">
                    MUVS &mdash; Audio &bull; Visual &bull; Code
                </p>
            </div>
        `,
        attachments: [
            {
                filename: path.basename(archivePath),
                path: archivePath
            }
        ]
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
};

module.exports = { createReleaseArchive, sendReleaseEmail };
