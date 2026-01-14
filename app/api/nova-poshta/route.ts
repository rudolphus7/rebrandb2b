
import { NextResponse } from 'next/server';

const NOVAPOSHTA_KEY = process.env.NOVAPOSHTA_KEY;
const API_URL = 'https://api.novaposhta.ua/v2.0/json/';

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // Return 200 even for config error so frontend can see the message
    if (!NOVAPOSHTA_KEY) {
        console.error("Nova Poshta Error: API Key is missing in .env.local");
        return NextResponse.json({ success: false, error: "Nova Poshta API Key is MISSING in settings" }, { status: 200 });
    }

    try {
        const body = await req.json();
        const { action, cityName, cityRef, searchString } = body;

        let payload = {};

        if (action === 'searchCities') {
            payload = {
                apiKey: NOVAPOSHTA_KEY,
                modelName: "Address",
                calledMethod: "searchSettlements",
                methodProperties: {
                    CityName: cityName,
                    Limit: "20",
                    Page: "1"
                }
            };
        } else if (action === 'getWarehouses') {
            payload = {
                apiKey: NOVAPOSHTA_KEY,
                modelName: "Address",
                calledMethod: "getWarehouses",
                methodProperties: {
                    CityRef: cityRef,
                    FindByString: searchString || "",
                    Limit: "50"
                }
            };
        } else {
            return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            if (action === 'searchCities') {
                // Format cities same as user's snippet
                const formattedCities = data.data[0]?.Addresses?.map((i: any) => ({
                    Description: i.Present,
                    Ref: i.DeliveryCity
                })) || [];
                return NextResponse.json({ success: true, data: formattedCities });
            }

            if (action === 'getWarehouses') {
                return NextResponse.json({ success: true, data: data.data });
            }
        }

        console.error("NP API Error Response:", data);
        return NextResponse.json({ success: false, error: data.errors?.join(', ') || 'Unknown NP Error' });

    } catch (error: any) {
        console.error("Nova Poshta API Integration Error:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
