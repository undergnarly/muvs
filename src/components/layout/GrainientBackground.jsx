import { useEffect, useRef } from 'react';
import { observeAtmosphereMotion } from '../../utils/atmosphere';
import {
    GRAINIENT_SETTINGS, GRAINIENT_VERTEX_SHADER, GRAINIENT_FIELD_FRAGMENT_SHADER,
    GRAINIENT_COMPOSITE_FRAGMENT_SHADER, GRAINIENT_FALLBACK,
    createGrainientRamp, grainientFieldSize, grainientFrame,
} from '../../utils/grainient';
import './GrainientBackground.css';

const VERSION = '#version 300 es\n';

// The Dubplates route deliberately does not load Three/R3F. Its single tiny
// background context reuses the main scene's exact field/composite shaders.
function createRenderer(gl, canvas) {
    const shaders = [];
    const programs = [];
    let vao;
    let target;
    let buffer;
    let initialized = false;
    const dispose = () => {
        if (target) gl.deleteTexture(target);
        if (buffer) gl.deleteFramebuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        programs.forEach((program) => gl.deleteProgram(program));
        shaders.forEach((shader) => gl.deleteShader(shader));
    };
    const compile = (type, source) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Grainient shader unavailable');
        shaders.push(shader);
        gl.shaderSource(shader, VERSION + source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Grainient shader compilation failed');
        return shader;
    };
    const link = (vertex, source) => {
        const program = gl.createProgram();
        if (!program) throw new Error('Grainient program unavailable');
        programs.push(program);
        gl.attachShader(program, vertex);
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, source));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Grainient program linking failed');
        return program;
    };
    try {
        const vertex = compile(gl.VERTEX_SHADER, GRAINIENT_VERTEX_SHADER);
        const field = link(vertex, GRAINIENT_FIELD_FRAGMENT_SHADER);
        const composite = link(vertex, GRAINIENT_COMPOSITE_FRAGMENT_SHADER);
        const fu = { aspect: gl.getUniformLocation(field, 'uAspect'), ramp: gl.getUniformLocation(field, 'uRamp[0]') };
        const cu = {
            field: gl.getUniformLocation(composite, 'uField'), frame: gl.getUniformLocation(composite, 'uFrame'),
            grain: gl.getUniformLocation(composite, 'uGrainAmount'), opacity: gl.getUniformLocation(composite, 'uFieldOpacity'),
        };
        vao = gl.createVertexArray();
        target = gl.createTexture();
        buffer = gl.createFramebuffer();
        if (!vao || !target || !buffer) throw new Error('Grainient resources unavailable');
        gl.bindVertexArray(vao);
        gl.bindTexture(gl.TEXTURE_2D, target);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.DITHER);
        const ramp = createGrainientRamp();
        return {
            resize(width, height) {
                if (initialized && canvas.width === width && canvas.height === height) return;
                canvas.width = width;
                canvas.height = height;
                const size = grainientFieldSize(width, height);
                gl.bindVertexArray(vao);
                gl.bindTexture(gl.TEXTURE_2D, target);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size.width, size.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
                if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Grainient framebuffer unavailable');
                gl.viewport(0, 0, size.width, size.height);
                gl.useProgram(field);
                gl.uniform1f(fu.aspect, width / height);
                gl.uniform3fv(fu.ramp, ramp);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                initialized = true;
            },
            draw(frame) {
                gl.bindVertexArray(vao);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.useProgram(composite);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, target);
                gl.uniform1i(cu.field, 0);
                gl.uniform1f(cu.frame, frame);
                gl.uniform1f(cu.grain, GRAINIENT_SETTINGS.grainAmount);
                gl.uniform1f(cu.opacity, 1);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            },
            dispose,
        };
    } catch {
        dispose();
        return null;
    }
}

export default function GrainientBackground({ className = '', style }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        let gl;
        try {
            gl = canvas?.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
        } catch { return undefined; }
        if (!container || !canvas || !gl) return undefined;
        let renderer = createRenderer(gl, canvas);
        let mode = 'waiting';
        let inView = true;
        let timer = 0;
        let raf = 0;
        let last = 0;
        let elapsed = 0;
        let disposed = false;
        const stop = () => {
            window.clearTimeout(timer);
            window.cancelAnimationFrame(raf);
            timer = 0; raf = 0; last = 0;
        };
        const active = () => !disposed && renderer && inView && mode === 'running' && !document.hidden;
        const fallback = () => {
            stop();
            renderer?.dispose();
            renderer = null;
            container.dataset.renderer = 'fallback';
        };
        const draw = () => {
            if (!renderer) return;
            try {
                renderer.draw(mode === 'still' ? 0 : grainientFrame(elapsed));
                if (container.dataset.renderer !== 'webgl') container.dataset.renderer = 'webgl';
            } catch { fallback(); }
        };
        const frame = (now) => {
            raf = 0;
            if (!active()) return;
            if (last) elapsed += Math.min((now - last) / 1000, 0.25);
            last = now;
            draw();
            if (active()) timer = window.setTimeout(() => {
                timer = 0;
                if (active()) frame(window.performance.now());
            }, Math.max(0, 1000 / 24 - (window.performance.now() - now)));
        };
        const wake = () => {
            if (active() && !timer && !raf) raf = window.requestAnimationFrame(frame);
        };
        const resize = () => {
            if (!renderer) return;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.round(container.clientWidth * ratio));
            const height = Math.max(1, Math.round(container.clientHeight * ratio));
            try { renderer.resize(width, height); } catch { fallback(); }
            draw();
            wake();
        };
        const onLost = (event) => {
            event.preventDefault();
            stop();
            renderer = null; // Context loss already releases these GPU objects.
            container.dataset.renderer = 'fallback';
        };
        const onRestored = () => {
            if (disposed) return;
            // Force texture initialization even if the CSS size is unchanged.
            canvas.width = 0;
            renderer = createRenderer(gl, canvas);
            resize();
        };
        canvas.addEventListener('webglcontextlost', onLost);
        canvas.addEventListener('webglcontextrestored', onRestored);
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        const intersection = new IntersectionObserver((entries) => {
            inView = entries.some((entry) => entry.isIntersecting);
            if (inView) wake(); else stop();
        });
        intersection.observe(container);
        const unobserve = observeAtmosphereMotion((next) => {
            mode = next;
            container.dataset.motion = next;
            if (active()) wake();
            else { stop(); if (next === 'still') draw(); }
        });
        window.addEventListener('resize', resize, { passive: true });
        resize();
        return () => {
            disposed = true;
            stop();
            unobserve();
            resizeObserver.disconnect();
            intersection.disconnect();
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('webglcontextlost', onLost);
            canvas.removeEventListener('webglcontextrestored', onRestored);
            renderer?.dispose();
        };
    }, []);
    return <div ref={containerRef} className={`muvs-grainient${className ? ` ${className}` : ''}`}
        style={{ background: GRAINIENT_FALLBACK, ...style }} data-renderer="fallback" aria-hidden="true">
        <canvas ref={canvasRef} className="muvs-grainient-canvas" />
    </div>;
}
