import { PrintPlacement, PrintSize, PrintMethod } from './brandingTypes';

// Pricing configuration for branding services (in UAH)
export const BRANDING_PRICES = {
    placement: {
        'chest-left': 0,
        'chest-center': 0,
        'chest-right': 0,
        'back-center': 20,     // +20 грн за спину
        'sleeve-left': 10,     // +10 грн за рукав
        'sleeve-right': 10,    // +10 грн за рукав
        'none': 0,
    } as Record<PrintPlacement, number>,

    size: {
        'small': 50,      // базова ціна для малого розміру
        'medium': 80,     // середній розмір
        'large': 120,     // великий розмір
        'xlarge': 180,    // дуже великий розмір
    } as Record<PrintSize, number>,

    method: {
        'screen-print': 0,    // базовий метод (шовкографія)
        'embroidery': 100,    // +100 грн за вишивку
        'dtf': 50,            // +50 грн за DTF
        'vinyl': 30,          // +30 грн за термотрансфер
    } as Record<PrintMethod, number>,
};

/**
 * Calculate total branding price based on selected options
 * Formula: base_size_price + placement_modifier + method_modifier
 */
export function calculateBrandingPrice(
    placement: PrintPlacement,
    size: PrintSize,
    method: PrintMethod
): number {
    if (placement === 'none') return 0;

    return (
        BRANDING_PRICES.size[size] +
        BRANDING_PRICES.placement[placement] +
        BRANDING_PRICES.method[method]
    );
}

/**
 * Get price breakdown for display purposes
 */
export function getBrandingPriceBreakdown(
    placement: PrintPlacement,
    size: PrintSize,
    method: PrintMethod
): { base: number; placement: number; method: number; total: number } {
    if (placement === 'none') {
        return { base: 0, placement: 0, method: 0, total: 0 };
    }

    return {
        base: BRANDING_PRICES.size[size],
        placement: BRANDING_PRICES.placement[placement],
        method: BRANDING_PRICES.method[method],
        total: calculateBrandingPrice(placement, size, method),
    };
}
