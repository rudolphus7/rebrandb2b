import { NextResponse } from 'next/server';

const ALLOWED_IMAGE_HOSTS = new Set<string>([
    'totobi.com.ua',
    'toptime.com.ua',
]);

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
        ALLOWED_IMAGE_HOSTS.add(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname);
    } catch {
        // Ignore invalid env URL
    }
}

function isAllowedImageUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return false;
        }
        const host = parsed.hostname.toLowerCase();
        for (const allowed of ALLOWED_IMAGE_HOSTS) {
            if (host === allowed || host.endsWith(`.${allowed}`)) {
                return true;
            }
        }
        return false;
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
        }

        if (!isAllowedImageUrl(imageUrl)) {
            return NextResponse.json({ error: 'Forbidden image host' }, { status: 403 });
        }

        // Fetch the image from the external source
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            );
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Return the image with proper CORS headers
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to proxy image' },
            { status: 500 }
        );
    }
}
