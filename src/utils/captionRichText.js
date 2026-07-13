const ALLOWED_CAPTION_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P']);

export const sanitizeCaptionHtml = (value = '') => {
    if (typeof document === 'undefined') return String(value);

    const source = String(value).replace(/\r?\n/g, '<br>');
    const container = document.createElement('div');
    container.innerHTML = source;

    const cleanNode = (node) => {
        [...node.childNodes].forEach((child) => {
            if (child.nodeType !== Node.ELEMENT_NODE) return;
            cleanNode(child);
            if (!ALLOWED_CAPTION_TAGS.has(child.tagName)) {
                child.replaceWith(...child.childNodes);
                return;
            }
            [...child.attributes].forEach((attribute) => child.removeAttribute(attribute.name));
        });
    };

    cleanNode(container);
    return container.innerHTML;
};
