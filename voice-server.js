// Real-time Voice Agent WebSocket Server — Maya AI Assistant
// Uses ChromaDB RAG + Azure OpenAI for LLM + Cartesia for TTS
// Azure Speech SDK for STT

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

// RAG Server URL (ChromaDB + Sentence Transformers)
const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://localhost:8001';

// Maya's system prompt — enhanced with RAG context
const MAYA_SYSTEM_PROMPT = `You are Maya, a friendly and knowledgeable AI voice assistant on Prajwal Mandale's portfolio website.

Your role is to:
- Help visitors learn about Prajwal's experience, skills, and projects
- Answer questions about his work in AI, Machine Learning, Voice AI, RAG systems, and more
- Explain his projects like Semantic Chunker (LangChain), Real-time Voice AI Agent, Document Intelligence, Memory Based RAG Chatbot, and Text-to-SQL Query Mind from GenXcellence
- Be warm, professional, and conversational
- Keep responses concise (2-3 sentences max for voice) but informative

Key facts about Prajwal:
- AI Engineer & Architect at GenXcellence specializing in Generative AI, LLMs, and Scalable Infrastructure
- Built Text-to-SQL Query Mind at GenXcellence — converts natural language to optimized SQL queries
- Expertise in Voice AI (Pipecat, Cartesia TTS, Azure STT, real-time streaming)
- Experience with RAG systems (ChromaDB, FAISS, LangChain, vector databases)
- Projects: Semantic Chunker, Voice AI Agent, Document Intelligence, RAG Chatbot, Text-to-SQL
- Tech stack: Python, TypeScript, PyTorch, Azure, Pipecat, Cartesia, LangChain, FAISS, ChromaDB

You use ChromaDB with sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 for fetching relevant knowledge.
When provided with CONTEXT from the knowledge base, use it to give accurate, detailed answers.
If no context is provided or the question is off-topic, answer based on your general knowledge about Prajwal.

Respond naturally as if in a spoken conversation. Be brief and engaging!`;

// ==================== RAG: Query ChromaDB ====================
async function queryKnowledgeBase(query) {
    try {
        const response = await fetch(`${RAG_SERVER_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, n_results: 3 }),
        });

        if (!response.ok) {
            console.warn('⚠️ RAG server not available, proceeding without context');
            return null;
        }

        const data = await response.json();
        return data.context || null;
    } catch (error) {
        console.warn('⚠️ RAG query failed:', error.message);
        return null;
    }
}

// ==================== Azure OpenAI Chat ====================
async function getChatResponse(messages, ragContext = null) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    // Build system prompt with RAG context if available
    let systemContent = MAYA_SYSTEM_PROMPT;
    if (ragContext) {
        systemContent += `\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n${ragContext}\n--- END CONTEXT ---\n\nUse the above context to give an accurate and detailed answer. If the context doesn't cover the question, use your general knowledge about Prajwal.`;
    }

    const fullMessages = [
        { role: 'system', content: systemContent },
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
            temperature: 0.6,
        }),
    });

    if (!response.ok) {
        throw new Error('Azure OpenAI error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not respond.';
}

// ==================== Cartesia TTS ====================
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
                __experimental_controls: {
                    speed: 'fast',
                    emotion: ['positivity:high']
                }
            },
            output_format: {
                container: 'mp3',
                encoding: 'mp3',
                sample_rate: 24000,
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

// ==================== Process User Message with RAG ====================
async function processUserMessage(userText, conversationHistory, ws) {
    try {
        // Step 1: Query ChromaDB for relevant knowledge
        ws.send(JSON.stringify({ type: 'status', status: 'searching' }));
        console.log(`🔍 Querying RAG knowledge base for: "${userText}"`);
        const ragContext = await queryKnowledgeBase(userText);

        if (ragContext) {
            console.log(`📚 Found relevant context (${ragContext.length} chars)`);
        } else {
            console.log(`📭 No RAG context available, using base knowledge`);
        }

        // Step 2: Get LLM response with RAG context
        ws.send(JSON.stringify({ type: 'status', status: 'thinking' }));
        const response = await getChatResponse(conversationHistory, ragContext);
        console.log(`🤖 Maya: ${response}`);

        conversationHistory.push({ role: 'assistant', content: response });

        ws.send(JSON.stringify({
            type: 'assistant_text',
            text: response
        }));

        // Step 3: Generate TTS audio
        ws.send(JSON.stringify({ type: 'status', status: 'speaking' }));
        const audioBuffer = await synthesizeSpeech(response);

        // Send audio as binary
        ws.send(audioBuffer);

        ws.send(JSON.stringify({ type: 'status', status: 'idle' }));

        return response;
    } catch (error) {
        console.error('Processing error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process. Please try again.'
        }));
        return null;
    }
}

// ==================== WebSocket Connection Handling ====================
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

                // Process with RAG pipeline
                await processUserMessage(userText, conversationHistory, ws);
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
                            await processUserMessage(message.text, conversationHistory, ws);
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
        message: 'Maya is ready to chat! Ask me about Prajwal\'s projects, skills, or experience.'
    }));
});

// ==================== HTTP Endpoints ====================

// Health check
app.get('/health', async (req, res) => {
    // Also check RAG server health
    let ragStatus = 'unknown';
    try {
        const ragHealth = await fetch(`${RAG_SERVER_URL}/health`);
        if (ragHealth.ok) {
            const data = await ragHealth.json();
            ragStatus = `ok (${data.collection_count} docs)`;
        }
    } catch {
        ragStatus = 'offline';
    }

    res.json({
        status: 'ok',
        service: 'maya-voice-agent',
        rag: ragStatus,
    });
});

// HTTP chat endpoint (with RAG)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const lastMessage = messages?.[messages.length - 1]?.content || '';

        // Query RAG
        const ragContext = await queryKnowledgeBase(lastMessage);
        const response = await getChatResponse(messages || [], ragContext);
        res.json({ message: response });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Chat failed' });
    }
});

// HTTP TTS endpoint
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

// ==================== Start Server ====================
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`\n🎤 Maya Voice Agent Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`\n🧠 RAG Server: ${RAG_SERVER_URL}`);
    console.log(`\n✅ Services:`);
    console.log(`   Azure Speech (STT): ${process.env.AZURE_SPEECH_KEY ? '✓' : '✗'}`);
    console.log(`   Azure OpenAI (LLM): ${process.env.AZURE_OPENAI_API_KEY ? '✓' : '✗'}`);
    console.log(`   Cartesia (TTS): ${process.env.CARTESIA_API_KEY ? '✓' : '✗'}`);
    console.log(`   ChromaDB RAG: checking...`);

    // Check RAG server on startup
    fetch(`${RAG_SERVER_URL}/health`).then(r => r.json()).then(d => {
        console.log(`   ChromaDB RAG: ✓ (${d.collection_count} documents)`);
    }).catch(() => {
        console.log(`   ChromaDB RAG: ✗ (start with: python rag-server.py)`);
    });
});
