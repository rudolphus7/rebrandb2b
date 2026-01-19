'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { setReferralCookie } from '@/lib/referral';

export default function ReferralTracker() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const refCode = searchParams.get('ref');
        if (refCode) {
            console.log('Referral tracked:', refCode);
            setReferralCookie(refCode);
        }
    }, [searchParams]);

    return null; // This component doesn't render anything
}
