// Real-time Voice Agent WebSocket Server
// Uses Azure Speech SDK for STT, Azure OpenAI for LLM, Cartesia for TTS

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Maya's system prompt
const MAYA_SYSTEM_PROMPT = `You are Maya, a friendly AI voice assistant on Prajwal Mandale's portfolio website.

Your role is to:
- Help visitors learn about Prajwal's experience, skills, and projects
- Answer questions about his work in AI, Machine Learning, and Voice AI
- Be warm, professional, and conversational
- Keep responses concise (1-2 sentences max for voice)

Key facts about Prajwal:
- AI Engineer & Architect specializing in Generative AI, LLMs, and Scalable Infrastructure
- Expertise in Voice AI (Pipecat, Cartesia TTS, real-time streaming)
- Experience with RAG systems, Vector databases, and LLM applications
- Projects: Voice AI Agent (<500ms latency), RAG Knowledge Base, Computer Vision Pipeline
- Tech stack: Python, TypeScript, PyTorch, Azure, Pipecat, Cartesia

Respond naturally as if in a spoken conversation. Be brief and engaging!`;

// Azure OpenAI Chat
async function getChatResponse(messages) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    const fullMessages = [
        { role: 'system', content: MAYA_SYSTEM_PROMPT },
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
            max_tokens: 100,
            temperature: 0.6,
        }),
    });

    if (!response.ok) {
        throw new Error('Azure OpenAI error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not respond.';
}

// Cartesia TTS - returns audio buffer
async function synthesizeSpeech(text) {
    const apiKey = process.env.CARTESIA_API_KEY;
    const voiceId = process.env.CARTESIA_VOICE_ID || 'f786b574-daa5-4673-aa0c-cbe3e8534c02';

    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
            'Cartesia-Version': '2024-06-10',
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify({
            model_id: 'sonic-3',
            transcript: text,
            voice: { 
                mode: 'id', 
                id: voiceId,
                // Optional: Control speech characteristics
                __experimental_controls: {
                    speed: 'fast',
                    emotion: ['positivity:high']
                }
            },
            output_format: {
                container: 'mp3',
                encoding: 'mp3',
                sample_rate: 24000, // Native Cartesia sample rate
                bit_rate: 128000,
            },
            language: 'en',
        }),
    });

    if (!response.ok) {
        throw new Error('Cartesia TTS error');
    }

    return await response.arrayBuffer();
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🎤 New voice client connected');

    let conversationHistory = [];
    let speechConfig = null;
    let recognizer = null;
    let isRecognizing = false;

    // Setup Azure Speech recognition
    const setupSpeechRecognition = () => {
        const speechKey = process.env.AZURE_SPEECH_KEY;
        const speechRegion = process.env.AZURE_SPEECH_REGION;

        if (!speechKey || !speechRegion) {
            ws.send(JSON.stringify({ type: 'error', message: 'Azure Speech not configured' }));
            return null;
        }

        speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechRecognitionLanguage = 'en-US';

        // Use push stream for real-time audio
        const pushStream = sdk.AudioInputStream.createPushStream();
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

        const rec = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        // Recognition events
        rec.recognizing = (s, e) => {
            if (e.result.text) {
                ws.send(JSON.stringify({
                    type: 'interim_transcript',
                    text: e.result.text
                }));
            }
        };

        rec.recognized = async (s, e) => {
            if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
                const userText = e.result.text;
                console.log(`👤 User: ${userText}`);

                ws.send(JSON.stringify({
                    type: 'final_transcript',
                    text: userText
                }));

                // Add to history
                conversationHistory.push({ role: 'user', content: userText });

                try {
                    // Get LLM response
                    ws.send(JSON.stringify({ type: 'status', status: 'thinking' }));
                    const response = await getChatResponse(conversationHistory);
                    console.log(`🤖 Maya: ${response}`);

                    conversationHistory.push({ role: 'assistant', content: response });

                    ws.send(JSON.stringify({
                        type: 'assistant_text',
                        text: response
                    }));

                    // Get TTS audio
                    ws.send(JSON.stringify({ type: 'status', status: 'speaking' }));
                    const audioBuffer = await synthesizeSpeech(response);

                    // Send audio as binary
                    ws.send(audioBuffer);

                    ws.send(JSON.stringify({ type: 'status', status: 'idle' }));

                } catch (error) {
                    console.error('Processing error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to process. Please try again.'
                    }));
                }
            }
        };

        rec.canceled = (s, e) => {
            console.log('Recognition canceled:', e.reason);
            if (e.reason === sdk.CancellationReason.Error) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Speech recognition error: ${e.errorDetails}`
                }));
            }
        };

        return { recognizer: rec, pushStream };
    };

    let speechSetup = setupSpeechRecognition();

    ws.on('message', async (data, isBinary) => {
        if (isBinary && speechSetup) {
            // Audio data from client - push to Azure Speech
            speechSetup.pushStream.write(Buffer.from(data));
        } else {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case 'start_listening':
                        if (speechSetup && !isRecognizing) {
                            speechSetup.recognizer.startContinuousRecognitionAsync(
                                () => {
                                    isRecognizing = true;
                                    ws.send(JSON.stringify({ type: 'status', status: 'listening' }));
                                    console.log('🎙️ Started listening');
                                },
                                (err) => {
                                    console.error('Start recognition error:', err);
                                    ws.send(JSON.stringify({ type: 'error', message: err }));
                                }
                            );
                        }
                        break;

                    case 'stop_listening':
                        if (speechSetup && isRecognizing) {
                            speechSetup.recognizer.stopContinuousRecognitionAsync(
                                () => {
                                    isRecognizing = false;
                                    ws.send(JSON.stringify({ type: 'status', status: 'idle' }));
                                    console.log('🛑 Stopped listening');
                                },
                                (err) => console.error('Stop recognition error:', err)
                            );
                        }
                        break;

                    case 'text_input':
                        // Direct text input (fallback)
                        if (message.text) {
                            conversationHistory.push({ role: 'user', content: message.text });

                            ws.send(JSON.stringify({ type: 'status', status: 'thinking' }));
                            const response = await getChatResponse(conversationHistory);
                            conversationHistory.push({ role: 'assistant', content: response });

                            ws.send(JSON.stringify({ type: 'assistant_text', text: response }));

                            ws.send(JSON.stringify({ type: 'status', status: 'speaking' }));
                            const audioBuffer = await synthesizeSpeech(response);
                            ws.send(audioBuffer);

                            ws.send(JSON.stringify({ type: 'status', status: 'idle' }));
                        }
                        break;

                    case 'reset':
                        conversationHistory = [];
                        ws.send(JSON.stringify({ type: 'status', status: 'reset' }));
                        break;
                }
            } catch (err) {
                console.error('Message parse error:', err);
            }
        }
    });

    ws.on('close', () => {
        console.log('👋 Voice client disconnected');
        if (speechSetup && speechSetup.recognizer) {
            speechSetup.recognizer.close();
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    // Send ready status
    ws.send(JSON.stringify({
        type: 'ready',
        message: 'Maya is ready to chat!'
    }));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'voice-agent' });
});

// HTTP fallback endpoints (same as before)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const response = await getChatResponse(messages || []);
        res.json({ message: response });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Chat failed' });
    }
});

app.post('/api/tts', async (req, res) => {
    try {
        const { text } = req.body;
        const audioBuffer = await synthesizeSpeech(text);
        res.set({ 'Content-Type': 'audio/mpeg' });
        res.send(Buffer.from(audioBuffer));
    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: 'TTS failed' });
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`\n🎤 Voice Agent WebSocket Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`\n✅ Services:`);
    console.log(`   Azure Speech (STT): ${process.env.AZURE_SPEECH_KEY ? '✓' : '✗'}`);
    console.log(`   Azure OpenAI (LLM): ${process.env.AZURE_OPENAI_API_KEY ? '✓' : '✗'}`);
    console.log(`   Cartesia (TTS): ${process.env.CARTESIA_API_KEY ? '✓' : '✗'}`);
});
