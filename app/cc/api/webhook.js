const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_secure_token_123';
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = async (req, res) => {
    // 1. Verification Endpoint (GET)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge);
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(400); // Bad Request if parameters missing
        }
        return;
    }

    // 2. Handle Messages (POST)
    if (req.method === 'POST') {
        const body = req.body;

        if (body.object === 'page') {
            // Iterate over each entry
            for (const entry of body.entry) {
                // Iterate over each messaging event
                if (entry.messaging) {
                    for (const event of entry.messaging) {
                        if (event.message && !event.message.is_echo) {
                            await handleMessage(event.sender.id, event.message);
                        }
                    }
                }
            }
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    }
};

async function handleMessage(senderPsid, receivedMessage) {
    let responseText;

    // Check if it's text
    if (receivedMessage.text) {
        // --- GEMINI AI LOGIC START ---
        if (GEMINI_API_KEY) {
            try {
                // Call Google Gemini API
                const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `You are a helpful and polite customer support assistant for a business page. 
                                User message: ${receivedMessage.text}
                                Respond concisely and friendly.`
                            }]
                        }]
                    })
                });

                const data = await aiResponse.json();

                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                    responseText = data.candidates[0].content.parts[0].text;
                } else {
                    console.error("Gemini Response Error:", JSON.stringify(data));
                    responseText = "I'm having trouble thinking right now.";
                }
            } catch (error) {
                console.error("Gemini Fetch Error:", error);
                responseText = "Sorry, my AI connection is unstable.";
            }
        } else {
            responseText = `Echo: ${receivedMessage.text} (Configure GEMINI_API_KEY)`;
        }
        // --- GEMINI AI LOGIC END ---
    } else {
        responseText = "I can only read text messages for now.";
    }

    // Send the response message
    await callSendAPI(senderPsid, { text: responseText });
}

async function callSendAPI(senderPsid, response) {
    // Construct the message body
    const requestBody = {
        recipient: {
            id: senderPsid
        },
        message: response
    };

    // Send the HTTP request to the Messenger Platform
    await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
}

