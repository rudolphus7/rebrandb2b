export interface BrandingOptions {
    enabled: boolean;
    logo?: File;
    logoPreview?: string; // base64 or object URL for display
    placement: PrintPlacement;
    size: PrintSize;
    method: PrintMethod;
    price: number; // calculated price for branding service
}

export type PrintPlacement =
    | 'chest-left'
    | 'chest-center'
    | 'chest-right'
    | 'back-center'
    | 'sleeve-left'
    | 'sleeve-right'
    | 'none';

export type PrintSize =
    | 'small'    // 5x5 cm
    | 'medium'   // 10x10 cm
    | 'large'    // 15x15 cm
    | 'xlarge';  // 20x20 cm

export type PrintMethod =
    | 'screen-print'  // Шовкографія
    | 'embroidery'    // Вишивка
    | 'dtf'           // DTF друк
    | 'vinyl';        // Термотрансфер/Вініл

// Human-readable labels for UI
export const PLACEMENT_LABELS: Record<PrintPlacement, string> = {
    'chest-left': 'Груди зліва',
    'chest-center': 'Груди по центру',
    'chest-right': 'Груди справа',
    'back-center': 'Спина по центру',
    'sleeve-left': 'Лівий рукав',
    'sleeve-right': 'Правий рукав',
    'none': 'Без розміщення',
};

export const SIZE_LABELS: Record<PrintSize, string> = {
    'small': 'Малий (5×5 см)',
    'medium': 'Середній (10×10 см)',
    'large': 'Великий (15×15 см)',
    'xlarge': 'Дуже великий (20×20 см)',
};

export const METHOD_LABELS: Record<PrintMethod, string> = {
    'screen-print': 'Шовкографія',
    'embroidery': 'Вишивка',
    'dtf': 'DTF друк',
    'vinyl': 'Термотрансфер',
};
