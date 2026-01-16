"use client";

import { useEffect, useRef } from 'react';

interface IsolatedContentProps {
    content: string;
    className?: string; // Wrapper class on the light DOM host
}

export default function IsolatedContent({ content, className }: IsolatedContentProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const shadowRef = useRef<ShadowRoot | null>(null);

    useEffect(() => {
        if (!hostRef.current) return;

        // Create shadow root once
        if (!shadowRef.current) {
            shadowRef.current = hostRef.current.attachShadow({ mode: 'open' });
        }

        // Update content
        if (shadowRef.current) {
            // We can inject a small reset or base styles if needed, 
            // but for "landing pages" usually we want pure isolation or inherited fonts.
            // Inherited properties (font-family, color) WILL penetrate Shadow DOM.
            // Non-inherited (margin, padding, styles) will NOT.
            // <style> tags inside 'content' will allow users to style THIS content 
            // without affecting the main page. Perfect.

            shadowRef.current.innerHTML = `
                <style>
                    :host { display: block; }
                    /* Optional: Add basic typography defaults if they are not inheriting well */
                    img { max-width: 100%; height: auto; }
                </style>
                ${content}
            `;
        }
    }, [content]);

    return <div ref={hostRef} className={className} />;
}
