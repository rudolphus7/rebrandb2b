export const REFERRAL_COOKIE_NAME = 'rbrnd_ref_code';

/**
 * Stores referral code in cookies with 7 days expiration
 */
export function setReferralCookie(code: string) {
    if (typeof document === 'undefined') return;

    // Set for 7 days
    const date = new Date();
    date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();

    document.cookie = `${REFERRAL_COOKIE_NAME}=${code}${expires}; path=/; SameSite=Lax`;
}

/**
 * Retrieves referral code from cookies
 */
export function getReferralCookie(): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = REFERRAL_COOKIE_NAME + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Clears referral code from cookies
 */
export function clearReferralCookie() {
    if (typeof document === 'undefined') return;
    document.cookie = `${REFERRAL_COOKIE_NAME}=; Max-Age=-99999999; path=/;`;
}
