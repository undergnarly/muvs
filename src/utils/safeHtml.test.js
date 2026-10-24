import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeHtmlHref, sanitizeRichHtml } from './safeHtml.js';
import { sanitizeCaptionHtml } from './captionRichText.js';
import { fixLinks } from './linkUtils.js';

test('rich-text links accept web relative and mailto destinations, never active URL schemes', () => {
    for (const href of ['https://muvs.dev/music', 'http://example.test/', '/music?item=veiled', '../mixes', './code', 'tracks/veiled', '#tracks', '?item=veiled', 'mailto:artist@example.test']) {
        assert.equal(sanitizeHtmlHref(href), href);
    }
    for (const href of ['', null, 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'blob:https://example.test/id', 'file:///etc/passwd', 'ftp://example.test', 'java\tscript:alert(1)', 'java\nscript:alert(1)', '\\example.test/path', 'https://user:password@example.test/', 'mailto:artist@example.test?subject=hello%0aBcc:other@example.test']) {
        assert.equal(sanitizeHtmlHref(href), null, String(href));
    }
    assert.equal(sanitizeHtmlHref('  /music  '), '/music');
});

test('without a DOM rich text and captions escape untrusted markup instead of returning executable HTML', () => {
    const input = '<b onclick="bad()">A & B</b><img src=x onerror=bad()>\n<script>bad()</script>';
    assert.equal(sanitizeRichHtml(input), '&lt;b onclick=&quot;bad()&quot;&gt;A &amp; B&lt;/b&gt;&lt;img src=x onerror=bad()&gt;\n&lt;script&gt;bad()&lt;/script&gt;');
    assert.equal(sanitizeCaptionHtml('<strong>Music</strong>\nNext'), '&lt;strong&gt;Music&lt;/strong&gt;<br>Next');
    assert.equal(sanitizeRichHtml(null), '');
    assert.equal(sanitizeCaptionHtml(null), '');
    assert.ok(!fixLinks('<a>https://example.test/" onclick="bad()</a>').includes('<a'));
});

test('every legacy raw CMS sink is routed through the shared allowlist without changing public CMS data', () => {
    for (const [file, expression] of [
        ['pages/AboutPage.jsx', 'sanitizeRichHtml(about.content)'],
        ['pages/HomePage.jsx', 'sanitizeRichHtml(siteSettings?.homepageBio'],
        ['pages/NewsPage.jsx', 'sanitizeRichHtml(item.excerpt)'],
        ['pages/ProjectSlide.jsx', 'sanitizeRichHtml(project.description)'],
    ]) {
        const source = readFileSync(new URL(`../components/${file}`, import.meta.url), 'utf8');
        assert.ok(source.includes(expression), file);
    }
    const details = readFileSync(new URL('../components/pages/ProjectDetails.jsx', import.meta.url), 'utf8');
    assert.match(details, /Array\.isArray\(project\.technologies\)/);
    assert.match(details, /Array\.isArray\(project\.features\)/);
    const links = readFileSync(new URL('./linkUtils.js', import.meta.url), 'utf8');
    assert.match(links, /sanitizeRichHtml\(/);
});
