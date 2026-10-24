const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const CAPTION_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P']);
const RICH_TAGS = new Set([...CAPTION_TAGS, 'A', 'SPAN', 'S', 'DEL', 'SUB', 'SUP',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR']);
const DROP_CONTENT = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME',
    'OBJECT', 'EMBED', 'APPLET', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA',
    'SELECT', 'OPTION', 'LINK', 'META', 'BASE', 'TITLE', 'HEAD', 'AUDIO', 'VIDEO', 'SOURCE']);

export function escapeHtml(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
}

// Attribute values have already been entity-decoded by the inert HTML parser.
// Reject browser-normalized controls/backslashes rather than repairing a URL.
export function sanitizeHtmlHref(value) {
    if (typeof value !== 'string') return null;
    const href = value.trim();
    if (!href || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(href)) return null;
    for (const character of href) {
        if (character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127 || character === '\\') return null;
    }
    const scheme = /^([a-z][a-z\d+.-]*):/i.exec(href)?.[1]?.toLowerCase();
    if (scheme && !['http', 'https', 'mailto'].includes(scheme)) return null;
    try {
        const url = new URL(href, 'https://sanitizer.invalid/');
        if (!['http:', 'https:', 'mailto:'].includes(url.protocol) || url.username || url.password) return null;
        if (url.protocol === 'mailto:' && !url.pathname) return null;
        return href;
    } catch { return null; }
}

function sanitizeHtml(value, { caption = false } = {}) {
    const source = String(value ?? '');
    if (typeof document === 'undefined' || !document.createElement) {
        const plain = escapeHtml(source);
        return caption ? plain.replace(/\r?\n/g, '<br>') : plain;
    }

    // A detached div still loads some resource-bearing elements. Template
    // contents stay inert; build a new allowlisted tree instead of mutating it.
    const input = document.createElement('template');
    input.innerHTML = caption ? source.replace(/\r?\n/g, '<br>') : source;
    const output = document.createElement('template');
    const allowed = caption ? CAPTION_TAGS : RICH_TAGS;
    const append = (node, parent) => {
        if (node.nodeType === 3) {
            parent.appendChild(document.createTextNode(node.data));
            return;
        }
        if (node.nodeType !== 1 || node.namespaceURI !== HTML_NAMESPACE || DROP_CONTENT.has(node.tagName)) return;
        const children = destination => {
            for (const child of node.childNodes) append(child, destination);
        };
        if (!allowed.has(node.tagName)) { children(parent); return; }
        const href = node.tagName === 'A' ? sanitizeHtmlHref(node.getAttribute('href')) : null;
        if (node.tagName === 'A' && !href) { children(parent); return; }
        const clean = document.createElement(node.tagName.toLowerCase());
        if (href) {
            clean.setAttribute('href', href);
            if (node.hasAttribute('title')) clean.setAttribute('title', node.getAttribute('title'));
            if (node.getAttribute('target')?.toLowerCase() === '_blank') {
                clean.setAttribute('target', '_blank');
                clean.setAttribute('rel', 'noopener noreferrer');
            }
        }
        children(clean);
        parent.appendChild(clean);
    };
    for (const node of input.content.childNodes) append(node, output.content);
    return output.innerHTML;
}

export const sanitizeRichHtml = value => sanitizeHtml(value);
export const sanitizeCaptionMarkup = value => sanitizeHtml(value, { caption: true });
