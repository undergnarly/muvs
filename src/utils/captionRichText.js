import { sanitizeCaptionMarkup } from './safeHtml.js';

// Keep the existing caption/editor formatting subset and newline behavior.
export const sanitizeCaptionHtml = (value = '') => sanitizeCaptionMarkup(value);
