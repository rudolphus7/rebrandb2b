import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'REBRAND B2B',
        short_name: 'REBRAND B2B',
        description: 'Платформа для клієнтів REBRAND STUDIO',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
            {
                src: '/favicon.png',
                sizes: 'any',
                type: 'image/png',
                purpose: 'any maskable' as any,
            },
        ],
    };
}
