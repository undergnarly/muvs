import React, { useEffect, useRef } from 'react';
import { FaBold, FaItalic, FaUnderline } from 'react-icons/fa';
import { sanitizeCaptionHtml } from '../../utils/captionRichText';
import './RichTextEditor.css';

const RichTextEditor = ({ value = '', onChange, placeholder = '' }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        const editor = editorRef.current;
        if (editor && document.activeElement !== editor && editor.innerHTML !== value) {
            editor.innerHTML = sanitizeCaptionHtml(value);
        }
    }, [value]);

    const syncValue = () => {
        const clean = sanitizeCaptionHtml(editorRef.current?.innerHTML || '');
        if (editorRef.current && editorRef.current.innerHTML !== clean) editorRef.current.innerHTML = clean;
        onChange(clean);
    };

    const format = (command) => {
        editorRef.current?.focus();
        document.execCommand(command, false);
        syncValue();
    };

    return (
        <div className="caption-rich-editor">
            <div className="caption-rich-toolbar" role="toolbar" aria-label="Text formatting">
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('bold')} aria-label="Bold" title="Bold"><FaBold /></button>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('italic')} aria-label="Italic" title="Italic"><FaItalic /></button>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('underline')} aria-label="Underline" title="Underline"><FaUnderline /></button>
            </div>
            <div
                ref={editorRef}
                className="caption-rich-input"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                data-placeholder={placeholder}
                onInput={syncValue}
                onBlur={syncValue}
            />
        </div>
    );
};

export default RichTextEditor;
