"use client";

import { useEffect, useRef } from 'react';

interface IsolatedContentProps {
    content: string;
    className?: string; // Wrapper class on the light DOM host
    referralCode?: string;
}

export default function IsolatedContent({ content, className, referralCode }: IsolatedContentProps) {
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
            let processedContent = content;
            const referralUrl = referralCode ? `${window.location.origin}/?ref=${referralCode}` : "";

            if (referralCode) {
                processedContent = processedContent.replace(/{{REFERRAL_LINK}}/g, referralUrl);
            }

            shadowRef.current.innerHTML = `
                <style>
                    :host { display: block; }
                    img { max-width: 100%; height: auto; }
                </style>
                ${processedContent}
            `;

            // Handle referral actions
            if (referralCode) {
                const actionZone = shadowRef.current.querySelector('#referral-action-zone');
                if (actionZone) {
                    actionZone.classList.add('is-visible');

                    const copyBtn = shadowRef.current.querySelector('[data-action="copy"]');
                    const shareBtn = shadowRef.current.querySelector('[data-action="share"]');

                    if (copyBtn) {
                        copyBtn.addEventListener('click', () => {
                            navigator.clipboard.writeText(referralUrl);
                            alert('Йоу! Посилання скопійовано! 💎');
                        });
                    }

                    if (shareBtn) {
                        // Hide share button if not supported
                        if (!navigator.share) {
                            shareBtn.classList.add('hidden');
                        } else {
                            shareBtn.addEventListener('click', () => {
                                navigator.share({
                                    title: 'Приєднуйся до REBRAND STUDIO',
                                    text: 'Ставай партнером та отримуй бонуси!',
                                    url: referralUrl,
                                }).catch(() => console.log('Share cancelled'));
                            });
                        }
                    }
                }
            }
        }
    }, [content, referralCode]);

    return <div ref={hostRef} className={className} />;
}
