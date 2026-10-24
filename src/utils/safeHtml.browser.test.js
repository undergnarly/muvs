// Opt-in real-parser check, independent of production and the main QA browser:
// $env:MUVS_NATIVE_HTML_QA='1'; node --test src/utils/safeHtml.browser.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const fixtures = [
    '<img src="/unexpected/image" onerror="window.__htmlExecuted++"><script>window.__htmlExecuted++</script>',
    '<iframe src="/unexpected/frame" srcdoc="<script>parent.__htmlExecuted++</script>"></iframe><object data="/unexpected/object"></object>',
    '<svg onload="window.__htmlExecuted++"><foreignObject><p onclick="window.__htmlExecuted++">foreign</p></foreignObject></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=/unexpected/math onerror=window.__htmlExecuted++>">',
    '<a href="jav&#x61;script:window.__htmlExecuted++" onclick="window.__htmlExecuted++">bad</a><a href="java&#9;script:window.__htmlExecuted++">tab</a>',
    '<a href="data:text/html,bad">data</a><a href="vbscript:bad">vb</a><a href="file:///bad">file</a>',
    '<form action="/unexpected/form"><input autofocus onfocus="window.__htmlExecuted++"></form><meta http-equiv="refresh" content="0;url=/unexpected/refresh">',
    '<template><img src="/unexpected/template" onerror="window.__htmlExecuted++"></template><noscript><img src=/unexpected/noscript></noscript>',
    '<p style="background:url(/unexpected/style)" id="clobber" class="hidden" onmouseover="window.__htmlExecuted++">Safe <b>text</b></p>',
    '<x-html-probe>Custom text</x-html-probe><textarea><img src=/unexpected/textarea></textarea>',
];

const fixtureScript = `
import { sanitizeRichHtml } from '/safeHtml.js';
import { sanitizeCaptionHtml } from '/captionRichText.js';
import { fixLinks } from '/linkUtils.js';
window.__htmlExecuted = 0;
customElements.define('x-html-probe', class extends HTMLElement { constructor() { super(); window.__htmlExecuted++; } });
const checks = [];
const check = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
try {
    const rich = '<h2>Heading</h2><p>Text <strong>bold</strong> <em>italic</em><br>line</p><ul><li>first</li></ul><ol><li>second</li></ol><pre><code>safe &lt;code&gt;</code></pre><a href="/music">Music</a><a href="mailto:artist@example.test">Mail</a><a href="https://example.test/" title="Link" target="_blank" rel="opener">Web</a>';
    const expected = rich.replace('rel="opener"', 'rel="noopener noreferrer"');
    check(sanitizeRichHtml(rich) === expected, 'basic RTE headings/lists/emphasis/code and safe links preserved');
    check(sanitizeCaptionHtml('<strong class="x">Listen</strong>\\n<em>stay</em><u style="color:red">tuned</u><a href="/music">link</a>') === '<strong>Listen</strong><br><em>stay</em><u>tuned</u>link', 'caption formatting and newline semantics preserved');
    const host = document.createElement('div');
    document.body.appendChild(host);
    for (const input of ${JSON.stringify(fixtures).replace(/</g, '\\u003c')}) {
        const clean = sanitizeRichHtml(input);
        check(sanitizeRichHtml(clean) === clean, 'sanitized serialization is stable');
        host.innerHTML = clean;
        check(!host.querySelector('script,style,img,iframe,object,embed,svg,math,form,input,template,meta,link,textarea'), 'active elements and non-HTML namespaces removed');
        for (const node of host.querySelectorAll('*')) {
            check([...node.attributes].every(a => ['href', 'title', 'target', 'rel'].includes(a.name)), 'event/style/clobbering attributes removed');
            if (node.tagName === 'A') check(['https:', 'http:', 'mailto:'].includes(node.protocol), 'only safe anchor protocols survive');
            node.dispatchEvent(new Event('error'));
        }
    }
    check(fixLinks('<a>example.test</a>') === '<a href="https://example.test" target="_blank" rel="noopener noreferrer">example.test</a>', 'legacy bare link repair remains available');
    check(!fixLinks('<a href="javascript:bad()">bad</a><img src=/unexpected/repair onerror=window.__htmlExecuted++>').includes('<a'), 'legacy link repair also sanitizes existing unsafe markup');
    await new Promise(resolve => setTimeout(resolve, 100));
    check(window.__htmlExecuted === 0, 'neither parsing nor insertion executes malicious code');
    document.getElementById('result').textContent = JSON.stringify({ ok: true, checks: checks.length });
} catch (error) { document.getElementById('result').textContent = JSON.stringify({ ok: false, error: error.message }); }
`;

test('native Chromium inert parser and public rich-text sinks reject malicious CMS fixtures', {
    skip: process.env.MUVS_NATIVE_HTML_QA !== '1', timeout: 25000,
}, async t => {
    const browser = [process.env.MUVS_HTML_QA_BROWSER,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(value => value && existsSync(value));
    assert.ok(browser, 'A local Chromium browser is required for this opt-in check.');
    const profile = await mkdtemp(path.join(tmpdir(), 'muvs-html-qa-'));
    const unexpected = [];
    const modules = Object.fromEntries(await Promise.all(['safeHtml.js', 'captionRichText.js', 'linkUtils.js']
        .map(async name => [`/${name}`, await readFile(new URL(`./${name}`, import.meta.url), 'utf8')])));
    const server = createServer((request, response) => {
        if (request.url === '/') {
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(`<html><head><link rel="icon" href="data:,"></head><body><pre id="result">pending</pre><script type="module">${fixtureScript}</script></body></html>`);
        } else if (Object.hasOwn(modules, request.url)) {
            response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            response.end(modules[request.url]);
        } else {
            unexpected.push(request.url);
            response.writeHead(404).end();
        }
    });
    try {
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const { stdout } = await promisify(execFile)(browser, ['--headless=new', '--disable-gpu',
            '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
            '--disable-component-update', `--user-data-dir=${profile}`, '--virtual-time-budget=2000',
            '--dump-dom', `http://127.0.0.1:${server.address().port}/`], { timeout: 18000, maxBuffer: 1024 * 1024, windowsHide: true });
        const report = /<pre id="result">([^<]+)<\/pre>/.exec(stdout)?.[1];
        assert.ok(report && report !== 'pending', 'Fixture completed in a native browser.');
        const result = JSON.parse(report.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
        assert.equal(result.ok, true, result.error);
        assert.ok(result.checks >= fixtures.length * 2 + 5);
        assert.deepEqual(unexpected, [], 'Inert parsing and sanitized insertion must not request attacker resources.');
        t.diagnostic(`${result.checks} native DOM assertions; no attacker resources requested.`);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        // Only remove the exact disposable browser profile created by this test.
        if (path.dirname(profile) === path.resolve(tmpdir()) && path.basename(profile).startsWith('muvs-html-qa-')) {
            await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        }
    }
});
