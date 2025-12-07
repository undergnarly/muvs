/**
 * Compress an image file to target size while preserving quality and transparency
 * @param {File} file - The image file to compress
 * @param {number} maxSizeKB - Maximum file size in KB (default 250)
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
export async function compressImage(file, maxSizeKB = 250) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Maintain aspect ratio
                let width = img.width;
                let height = img.height;

                // Scale down if image is too large
                const maxDimension = 2000;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Determine if image has transparency
                const hasTransparency = file.type === 'image/png';

                // Compress with quality adjustment
                compressWithQuality(canvas, hasTransparency, maxSizeKB, resolve, reject);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Iteratively compress image to reach target file size
 */
function compressWithQuality(canvas, hasTransparency, maxSizeKB, resolve, reject) {
    const format = hasTransparency ? 'image/png' : 'image/jpeg';
    let quality = 0.9;
    let attempts = 0;
    const maxAttempts = 10;

    function tryCompress() {
        const dataUrl = canvas.toDataURL(format, quality);
        const sizeKB = (dataUrl.length * 3) / 4 / 1024; // Approximate size in KB

        if (sizeKB <= maxSizeKB || attempts >= maxAttempts) {
            // Success or max attempts reached
            resolve(dataUrl);
        } else {
            // Reduce quality and try again
            quality -= 0.1;
            attempts++;

            if (quality < 0.3) {
                // If quality is too low, reduce canvas size instead
                const scale = Math.sqrt(maxSizeKB / sizeKB);
                canvas.width = Math.floor(canvas.width * scale);
                canvas.height = Math.floor(canvas.height * scale);

                const ctx = canvas.getContext('2d');
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width / scale;
                tempCanvas.height = canvas.height / scale;

                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

                quality = 0.9; // Reset quality after resize
            }

            tryCompress();
        }
    }

    tryCompress();
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {boolean} - True if valid image
 */
export function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB original max

    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPG, PNG, or WebP.');
    }

    if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 10MB.');
    }

    return true;
}
