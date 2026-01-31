'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, Type, Palette, Layout, Settings, Layers as LayersIcon, ChevronLeft, ChevronRight, Save, FileDown, ShoppingCart, Menu, X, ChevronUp, Trash2, Eraser } from 'lucide-react';
import { MOCK_IMPRINT_ZONES, ConstructorProduct } from '../lib/types';
import * as fabric from 'fabric';

import PriceCalculator from './PriceCalculator';
import { PrintMethod, PrintPlacement, PrintSize } from '../../../lib/brandingTypes';
import { supabase } from '../../../lib/supabaseClient';
import { getProducts } from '../../../lib/catalog';

interface Category {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
}

interface Props {
    initialProducts: ConstructorProduct[];
    categories: Category[];
}

// Helper to match colors across languages (Ukr/Eng)
const isColorMatch = (dbColor: string | null | undefined, target: string | null | undefined) => {
    if (!dbColor || !target) return false;

    const s1 = dbColor.toLowerCase();
    const s2 = target.toLowerCase();

    // If both specify details in parentheses and they differ, they are distinct colors
    const getDetail = (s: string) => s.match(/\((.*)\)/)?.[1]?.toLowerCase().trim() || '';
    const d1 = getDetail(s1);
    const d2 = getDetail(s2);
    if (d1 && d2 && d1 !== d2) return false;

    // Check strict equality
    if (s1 === s2) return true;

    // First word check (base color)
    const b1 = s1.split(/[ \/\(]/)[0].trim();
    const b2 = s2.split(/[ \/\(]/)[0].trim();

    // Standard mappings
    const mappings: Record<string, string[]> = {
        'black': ['чорний', 'чорн', 'black'],
        'white': ['білий', 'біл', 'white'],
        'red': ['червоний', 'червон', 'red'],
        'blue': ['синій', 'блакитний', 'blue', 'navy', 'royal'],
        'green': ['зелений', 'зелен', 'green'],
        'grey': ['сірий', 'сір', 'grey', 'gray', 'silver'],
        'yellow': ['жовтий', 'жовт', 'yellow', 'gold'],
        'orange': ['помаранчевий', 'оранж', 'orange'],
        'purple': ['фіолетовий', 'purple', 'violet'],
        'pink': ['рожевий', 'pink', 'rose'],
        'brown': ['коричневий', 'brown', 'beige', 'натуральний'],
    };

    for (const [eng, aliases] of Object.entries(mappings)) {
        if ((eng === b1 || aliases.includes(b1)) && (eng === b2 || aliases.includes(b2))) return true;
    }

    return b1 === b2 || b1.includes(b2) || b2.includes(b1);
};
