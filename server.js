// Local dev server that proxies API calls for testing
// This allows testing the Voice Agent locally before Vercel deployment

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Chat API - Azure OpenAI
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, systemPrompt } = req.body;

        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo';
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

        if (!apiKey || !endpoint) {
            return res.status(500).json({ error: 'Azure OpenAI not configured' });
        }

        const fullMessages = [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            ...messages
        ];

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                messages: fullMessages,
                max_tokens: 150,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Azure OpenAI error:', errorText);
            return res.status(500).json({ error: 'Failed to get AI response' });
        }

        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

        res.json({ message: assistantMessage });

    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// TTS API - Cartesia with speed fix
app.post('/api/tts', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const apiKey = process.env.CARTESIA_API_KEY;
        const voiceId = process.env.CARTESIA_VOICE_ID || 'f786b574-daa5-4673-aa0c-cbe3e8534c02';

        if (!apiKey) {
            return res.status(500).json({ error: 'Cartesia API not configured' });
        }

        console.log('🔊 Generating TTS with Cartesia (sonic-3, 24kHz)...');

        const response = await fetch('https://api.cartesia.ai/tts/bytes', {
            method: 'POST',
            headers: {
                'Cartesia-Version': '2024-06-10',
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                model_id: 'sonic-3',  // Matching Pipecat config
                transcript: text,
                voice: {
                    mode: 'id',
                    id: voiceId,
                },
                output_format: {
                    container: 'mp3',
                    encoding: 'mp3',
                    sample_rate: 24000,  // Matching Pipecat config
                    bit_rate: 128000,
                },
                language: 'en',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cartesia TTS error:', errorText);
            return res.status(500).json({ error: 'TTS failed' });
        }

        const audioBuffer = await response.arrayBuffer();
        console.log('✅ TTS generated:', audioBuffer.byteLength, 'bytes');

        res.set({
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache',
        });
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error('TTS API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n🎤 Voice Agent API Server running on http://localhost:${PORT}`);
    console.log(`\n📋 Available endpoints:`);
    console.log(`   POST /api/chat - Azure OpenAI LLM`);
    console.log(`   POST /api/tts  - Cartesia TTS (with speed fix)`);
    console.log(`\n✅ Environment check:`);
    console.log(`   Azure OpenAI: ${process.env.AZURE_OPENAI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   Cartesia TTS: ${process.env.CARTESIA_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`\n💡 Run 'npm run dev' in another terminal for the frontend`);
});
