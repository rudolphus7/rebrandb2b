export interface ImprintZone {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
}

export interface ConstructorProduct {
    id: string;
    title: string;
    base_price: number;
    image_url: string;
    category: string;
    category_id: string;
    vendor_article: string;
    colors: string[];
    images?: any; // Added to support raw image data from DB
    product_variants?: any[]; // For aggregating multiple angles
    product_images?: any[]; // Centralized angles table
    views?: {
        front?: string;
        back?: string;
        side?: string;
        other?: string[];
    };
    imprint_zones: Record<string, ImprintZone[]>; // Key is color or "default", value is zones
}

export const MOCK_IMPRINT_ZONES: Record<string, ImprintZone[]> = {
    'front': [
        { id: 'chest-center', name: 'Center Chest', x: 200, y: 150, width: 200, height: 200, angle: 0 },
        { id: 'chest-left', name: 'Left Chest', x: 300, y: 180, width: 80, height: 80, angle: 0 }
    ],
    'back': [
        { id: 'back-center', name: 'Back Center', x: 200, y: 120, width: 250, height: 300, angle: 0 }
    ]
};
