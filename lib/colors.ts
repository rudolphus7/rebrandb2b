export interface ColorGroup {
    key: string;
    label: string;
    hex: string;
    keywords: string[];
}

export const COLOR_MAP: ColorGroup[] = [
    {
        key: 'Black',
        label: 'Чорний',
        hex: '#000000',
        keywords: ['black', 'чорн', 'anthra', 'dark grey', 'charcoal', 'graphite', 'ebony', 'onyx', 'midnight']
    },
    {
        key: 'White',
        label: 'Білий',
        hex: '#FFFFFF',
        keywords: ['white', 'біл', 'milk', 'snow', 'ivory', 'cream', 'antique white', 'alabaster']
    },
    {
        key: 'Grey',
        label: 'Сірий',
        hex: '#808080',
        keywords: ['grey', 'gray', 'сір', 'ash', 'silver', 'steel', 'zinc', 'melange', 'heather', 'platinum', 'carbon', 'titanium']
    },
    {
        key: 'Blue',
        label: 'Синій',
        hex: '#0000FF',
        keywords: ['blue', 'синій', 'блакит', 'navy', 'azure', 'royal', 'sky', 'indigo', 'denim', 'aqua', 'cyan', 'turquoise', 'teal', 'mint', 'petrol', 'ocean', 'cobalt']
    },
    {
        key: 'Red',
        label: 'Червоний',
        hex: '#FF0000',
        keywords: ['red', 'червон', 'burgundy', 'maroon', 'cherry', 'brick', 'wine', 'bordeaux', 'cardinal', 'crimson', 'scarlet', 'ruby', 'fire']
    },
    {
        key: 'Green',
        label: 'Зелений',
        hex: '#008000',
        keywords: ['green', 'зелен', 'olive', 'lime', 'khaki', 'military', 'forest', 'bottle', 'emerald', 'army', 'camou', 'fern', 'kelly', 'moss', 'sage', 'pistachio', 'seafoam', 'mint']
    },
    {
        key: 'Yellow',
        label: 'Жовтий',
        hex: '#FFFF00',
        keywords: ['yellow', 'жовт', 'gold', 'lemon', 'mustard', 'amber', 'maiz', 'sun', 'canary', 'золот']
    },
    {
        key: 'Orange',
        label: 'Помаранчевий',
        hex: '#FFA500',
        keywords: ['orange', 'помаранч', 'оранж', 'coral', 'peach', 'terracotta', 'rust', 'burnt', 'apricot', 'tangerine', 'корал', 'персик']
    },
    {
        key: 'Purple',
        label: 'Фіолетовий',
        hex: '#800080',
        keywords: ['purple', 'фіолет', 'violet', 'lavender', 'lilac', 'plum', 'magenta', 'berry', 'eggplant', 'grape', 'бузков']
    },
    {
        key: 'Pink',
        label: 'Рожевий',
        hex: '#FFC0CB',
        keywords: ['pink', 'рожев', 'rose', 'fuchsia', 'coral', 'salmon', 'blush', 'raspberry', 'strawberry', 'пудр']
    },
    {
        key: 'Brown',
        label: 'Коричневий',
        hex: '#A52A2A',
        keywords: ['brown', 'коричн', 'beige', 'sand', 'chocolate', 'coffee', 'camel', 'mocha', 'tan', 'taupe', 'khaki', 'wood', 'nut', 'caramel', 'cinnamon', 'пісочн', 'беж']
    },
    {
        key: 'Metal',
        label: 'Метал',
        hex: '#C0C0C0',
        keywords: ['metal', 'silver', 'gold', 'chrome', 'copper', 'bronze', 'inox', 'alu', 'metallic', 'срібл', 'золот']
    },
    {
        key: 'Transparent',
        label: 'Прозорий',
        hex: 'transparent',
        keywords: ['transparent', 'прозор', 'clear', 'glass']
    },
    {
        key: 'Other',
        label: 'Інші',
        hex: '#CCCCCC',
        keywords: ['other', 'mixed', 'різн', 'комбін']
    }
];

export function detectGeneralColor(specificColor: string): string {
    if (!specificColor || specificColor === 'N/A' || specificColor === 'Standard') return 'Other';
    const lower = specificColor.toLowerCase();

    for (const group of COLOR_MAP) {
        if (group.keywords.some(k => lower.includes(k))) {
            return group.key;
        }
    }
    return 'Other';
}

export function getColorLabel(key: string): string {
    const group = COLOR_MAP.find(g => g.key === key);
    return group ? group.label : key;
}

export function getColorHex(key: string): string {
    const group = COLOR_MAP.find(g => g.key === key);
    return group ? group.hex : '#CCCCCC';
}
