/**
 * Fixes anchor tags that don't have href attributes
 * Converts <a>url</a> to <a href="url">url</a>
 * Also ensures URLs have proper protocol (http/https)
 */
export const fixLinks = (html) => {
    if (!html) return html;

    // Replace <a>text</a> with <a href="text">text</a>
    return html.replace(/<a>([^<]+)<\/a>/gi, (match, url) => {
        // Trim whitespace
        const cleanUrl = url.trim();

        // Add https:// if no protocol specified
        const finalUrl = cleanUrl.match(/^https?:\/\//) ? cleanUrl : `https://${cleanUrl}`;

        return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`;
    });
};
