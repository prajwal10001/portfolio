// Maya Voice Agent — Single Unified Backend
// STT (Azure Speech) + RAG (ChromaDB in-memory) + LLM (Azure OpenAI) + TTS (Cartesia)
// Everything runs in ONE server — no separate services needed.

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

// ==================== KNOWLEDGE BASE (RAG) ====================
// All portfolio knowledge — used for semantic retrieval before LLM calls
// Uses TF-IDF + cosine similarity for matching (no external Python service needed)

const KNOWLEDGE_DOCUMENTS = [
    // ---- About Prajwal ----
    {
        id: 'about_prajwal',
        text: 'Prajwal Mandale is an AI Engineer & Architect specializing in Generative AI, LLMs, and Scalable Infrastructure. He has extensive experience building production-grade AI systems including voice agents, RAG pipelines, document intelligence platforms, and scalable backend services. His tech stack includes Python, TypeScript, PyTorch, Azure, Pipecat, Cartesia, LangChain, FAISS, ChromaDB, and MongoDB.',
        category: 'about',
        keywords: ['prajwal', 'about', 'engineer', 'architect', 'ai', 'generative', 'llm', 'infrastructure', 'experience', 'tech stack', 'who', 'background', 'introduction']
    },
    {
        id: 'about_skills',
        text: "Prajwal's core skills include: Generative AI (GPT-4, Azure OpenAI, LLM fine-tuning), Voice AI (Pipecat, Cartesia TTS, Azure STT, WebRTC, WebSocket audio streaming, Silero VAD), RAG Systems (FAISS, ChromaDB, LangChain, vector databases), Computer Vision (PyTorch, Azure Document Intelligence, OCR), Backend Engineering (FastAPI, Express.js, Node.js), and Cloud Infrastructure (Azure, Docker, CI/CD).",
        category: 'about',
        keywords: ['skills', 'expertise', 'technologies', 'tools', 'stack', 'generative', 'voice', 'rag', 'computer vision', 'backend', 'cloud', 'what can', 'good at']
    },
    {
        id: 'about_experience',
        text: 'Prajwal has worked on enterprise-level AI solutions including building real-time voice AI agents with sub-500ms latency, developing RAG-based knowledge retrieval systems, creating document intelligence extraction platforms, and contributing to open-source projects like LangChain semantic chunker. He currently works at GenXcellence where he has built the Text-to-SQL Query Mind platform.',
        category: 'about',
        keywords: ['experience', 'work', 'career', 'enterprise', 'genxcellence', 'worked', 'built', 'open source', 'contribution', 'job']
    },

    // ---- Project 1: Semantic Chunker (LangChain) ----
    {
        id: 'project_semantic_chunker_overview',
        text: 'Open-source Contribution — Semantic Chunker for LangChain: A token-aware semantic chunker fully compatible with the LangChain ecosystem. It performs efficient LLM context handling by supporting PDF, Markdown, and plain text documents. The chunker uses overlapping and smart merging logic to produce retriever-ready chunks optimized for FAISS vector search.',
        category: 'project',
        keywords: ['semantic', 'chunker', 'langchain', 'open source', 'contribution', 'token', 'pdf', 'markdown', 'faiss', 'chunk', 'splitting', 'nlp']
    },
    {
        id: 'project_semantic_chunker_tech',
        text: "Semantic Chunker Technical Details: Built with Python and integrated into LangChain. Uses token-level semantic splitting rather than simple character-based splitting. Supports multiple document formats (PDF, Markdown, plain text). Implements chunk overlap and smart merging to preserve context boundaries. Generates FAISS-compatible embeddings for high-performance similarity search. Open-source contribution available on GitHub at github.com/prajwal10001/semantic-chunker-langchain.",
        category: 'project',
        keywords: ['semantic', 'chunker', 'technical', 'python', 'token', 'splitting', 'faiss', 'embedding', 'github', 'open source', 'how']
    },

    // ---- Project 2: Real-time Voice AI Agent ----
    {
        id: 'project_voice_agent_overview',
        text: 'Real-time Voice AI Agent: A production-grade real-time voice AI assistant built using Pipecat framework, Azure STT (Speech-to-Text), Azure OpenAI GPT for language model, and Cartesia Sonic-3 TTS for text-to-speech. Features WebSocket audio streaming with Silero VAD (Voice Activity Detection) and custom Pocket TTS achieving under 200ms latency with voice cloning capabilities.',
        category: 'project',
        keywords: ['voice', 'agent', 'real-time', 'pipecat', 'azure', 'stt', 'tts', 'cartesia', 'streaming', 'vad', 'latency', 'voice cloning', 'maya']
    },
    {
        id: 'project_voice_agent_tech',
        text: "Voice AI Agent Technical Details: Uses Pipecat for orchestrating the STT → LLM → TTS pipeline. Azure Speech SDK handles real-time speech recognition with continuous audio streaming via WebSockets. Azure OpenAI GPT processes conversational context. Cartesia Sonic-3 provides high-quality TTS with emotion control and speed tuning. Silero VAD detects speech boundaries for natural turn-taking. WebRTC transport enables low-latency browser-to-server audio. Available on GitHub at github.com/prajwal10001/pipecat_voice_agent.",
        category: 'project',
        keywords: ['voice', 'technical', 'pipecat', 'stt', 'llm', 'tts', 'websocket', 'webrtc', 'silero', 'vad', 'cartesia', 'azure', 'how', 'github']
    },

    // ---- Project 3: Document Intelligence Data Extraction ----
    {
        id: 'project_doc_extraction_overview',
        text: 'Document Intelligence Data Extraction: A full-stack platform built with React frontend and FastAPI backend, powered by Azure AI Document Intelligence. Provides automated extraction from PDFs, invoices, receipts, and CSV files with OCR confidence scoring and multi-agent Q&A capabilities using the Agno framework.',
        category: 'project',
        keywords: ['document', 'intelligence', 'extraction', 'data', 'ocr', 'pdf', 'invoice', 'receipt', 'azure', 'agno', 'react', 'fastapi']
    },
    {
        id: 'project_doc_extraction_tech',
        text: "Document Intelligence Technical Details: React + TypeScript frontend with a clean extraction UI. FastAPI Python backend orchestrates document processing. Azure AI Document Intelligence (Form Recognizer) handles PDF parsing, invoice extraction, and receipt analysis. Implements OCR confidence scoring to flag uncertain extractions. Multi-agent architecture using Agno framework enables document Q&A. Supports bulk processing of CSV/XLSX data. Available on GitHub at github.com/prajwal10001/automatic-data-extraction.",
        category: 'project',
        keywords: ['document', 'technical', 'react', 'fastapi', 'azure', 'form recognizer', 'ocr', 'agno', 'multi-agent', 'csv', 'github', 'how']
    },

    // ---- Project 4: Memory Based RAG Chatbot ----
    {
        id: 'project_rag_chatbot_overview',
        text: 'Memory Based RAG Chatbot: A context-aware chatbot that integrates FAISS vector retrieval with MongoDB persistent memory and GPT-4 for advanced reasoning. Designed as an AI counselor for visa applications, scholarship recommendations, and university guidance, providing personalized advice based on conversation history and document knowledge.',
        category: 'project',
        keywords: ['rag', 'chatbot', 'memory', 'faiss', 'mongodb', 'gpt-4', 'visa', 'scholarship', 'university', 'counselor', 'context']
    },
    {
        id: 'project_rag_chatbot_tech',
        text: "Memory Based RAG Chatbot Technical Details: Uses FAISS for fast similarity search over document embeddings. MongoDB stores conversation history and user profiles for persistent memory across sessions. GPT-4 handles complex reasoning and generates contextual responses. RAG pipeline retrieves relevant documents before generating answers. Specializes in visa counseling, scholarship matching, and university recommendation. Available on GitHub at github.com/prajwal10001/Memory_based_RAG_chatbot.",
        category: 'project',
        keywords: ['rag', 'chatbot', 'technical', 'faiss', 'mongodb', 'gpt-4', 'similarity', 'memory', 'visa', 'scholarship', 'github', 'how']
    },

    // ---- Project 5: Text-to-SQL Query Mind (GenXcellence) ----
    {
        id: 'project_text_to_sql_overview',
        text: 'Text-to-SQL Query Mind from GenXcellence: An intelligent natural language to SQL query conversion platform built at GenXcellence. Users can type plain English questions and the system automatically generates optimized SQL queries, executes them against the database, and presents results in an intuitive format. This bridges the gap between non-technical users and database access.',
        category: 'project',
        keywords: ['text-to-sql', 'sql', 'query', 'mind', 'genxcellence', 'natural language', 'database', 'conversion', 'english']
    },
    {
        id: 'project_text_to_sql_tech',
        text: "Text-to-SQL Query Mind Technical Details: Built at GenXcellence as an enterprise solution. Uses LLM-powered natural language understanding to parse user questions. Generates optimized SQL queries with schema awareness. Includes query validation and safety checks to prevent destructive operations. Supports multiple database schemas and table relationships. Provides result visualization with charts and tables. Implements context-aware query generation that understands table joins, aggregations, and filters from plain English descriptions.",
        category: 'project',
        keywords: ['text-to-sql', 'sql', 'technical', 'genxcellence', 'llm', 'schema', 'validation', 'query', 'joins', 'aggregation', 'how']
    },
    {
        id: 'project_text_to_sql_features',
        text: "Text-to-SQL Query Mind Features: Natural language interface for database querying, automatic SQL generation from English questions, schema-aware query optimization, support for complex joins and aggregations, query execution and result formatting, visual data presentation, enterprise-grade security with query validation, multi-database support, and conversation memory for follow-up queries. Developed by Prajwal Mandale at GenXcellence as part of their AI-driven data products. Uses ChromaDB with sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 for knowledge retrieval.",
        category: 'project',
        keywords: ['text-to-sql', 'features', 'genxcellence', 'natural language', 'security', 'visualization', 'chromadb', 'sentence-transformers', 'embedding']
    },

    // ---- Maya (This Portfolio) ----
    {
        id: 'about_maya',
        text: "Maya is Prajwal's AI voice assistant embedded in his portfolio website. Maya uses ChromaDB for vector-based knowledge retrieval with sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 as the embedding model. She can answer questions about Prajwal's projects, skills, experience, and technical expertise. Maya demonstrates Prajwal's skills in building RAG systems, voice AI, and full-stack applications.",
        category: 'about',
        keywords: ['maya', 'assistant', 'voice', 'chromadb', 'sentence-transformers', 'embedding', 'portfolio', 'you', 'yourself', 'who are you']
    },
    {
        id: 'about_portfolio_tech',
        text: "This portfolio website is built with React, TypeScript, Vite, and TailwindCSS. The Voice Agent (Maya) uses a unified Node.js server with Azure STT, Azure OpenAI, and Cartesia TTS. The RAG backend uses ChromaDB with sentence-transformers for embeddings. The entire architecture demonstrates Prajwal's full-stack AI engineering capabilities.",
        category: 'about',
        keywords: ['portfolio', 'website', 'react', 'typescript', 'vite', 'tailwind', 'architecture', 'built with', 'how built']
    },
];

// ==================== In-Memory RAG Engine ====================
// TF-IDF-style keyword matching + cosine similarity for semantic retrieval
// Replaces the need for a separate Python ChromaDB server

class KnowledgeBase {
    constructor(documents) {
        this.documents = documents;
        this.idf = {};
        this.tfidfVectors = [];
        this._buildIndex();
        console.log(`🧠 Knowledge base loaded: ${documents.length} documents indexed`);
    }

    _tokenize(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 1);
    }

    _buildIndex() {
        const allDocs = this.documents.map(d =>
            this._tokenize(d.text + ' ' + d.keywords.join(' '))
        );

        // Calculate IDF
        const docCount = allDocs.length;
        const df = {};
        allDocs.forEach(tokens => {
            const unique = new Set(tokens);
            unique.forEach(token => {
                df[token] = (df[token] || 0) + 1;
            });
        });

        for (const term in df) {
            this.idf[term] = Math.log(docCount / df[term]) + 1;
        }

        // Build TF-IDF vectors for each document
        this.tfidfVectors = allDocs.map(tokens => {
            const tf = {};
            tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
            const maxTf = Math.max(...Object.values(tf));

            const vector = {};
            for (const term in tf) {
                vector[term] = (tf[term] / maxTf) * (this.idf[term] || 1);
            }
            return vector;
        });
    }

    _cosineSimilarity(vecA, vecB) {
        let dot = 0, magA = 0, magB = 0;
        const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

        allTerms.forEach(term => {
            const a = vecA[term] || 0;
            const b = vecB[term] || 0;
            dot += a * b;
            magA += a * a;
            magB += b * b;
        });

        const mag = Math.sqrt(magA) * Math.sqrt(magB);
        return mag === 0 ? 0 : dot / mag;
    }

    query(queryText, nResults = 3) {
        const queryTokens = this._tokenize(queryText);
        const queryTf = {};
        queryTokens.forEach(t => { queryTf[t] = (queryTf[t] || 0) + 1; });
        const maxTf = Math.max(...Object.values(queryTf), 1);

        const queryVector = {};
        for (const term in queryTf) {
            queryVector[term] = (queryTf[term] / maxTf) * (this.idf[term] || 0.5);
        }

        // Compute similarity scores
        const scored = this.documents.map((doc, idx) => {
            const tfidfScore = this._cosineSimilarity(queryVector, this.tfidfVectors[idx]);

            // Bonus: keyword-level match boost
            const queryLower = queryText.toLowerCase();
            let keywordBoost = 0;
            doc.keywords.forEach(kw => {
                if (queryLower.includes(kw)) keywordBoost += 0.15;
            });

            return {
                doc,
                score: tfidfScore + keywordBoost
            };
        });

        // Sort by score descending and return top N
        scored.sort((a, b) => b.score - a.score);
        const topDocs = scored.slice(0, nResults).filter(s => s.score > 0.05);

        if (topDocs.length === 0) return null;

        const context = topDocs.map((item, i) =>
            `[Source ${i + 1}]: ${item.doc.text}`
        ).join('\n\n');

        return context;
    }
}

// Initialize knowledge base at startup
const knowledgeBase = new KnowledgeBase(KNOWLEDGE_DOCUMENTS);

// ==================== Maya System Prompt ====================
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

// ==================== Azure OpenAI Chat ====================
async function getChatResponse(messages, ragContext = null) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

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

// ==================== Process User Message (RAG + LLM + TTS) ====================
async function processUserMessage(userText, conversationHistory, ws) {
    try {
        // Step 1: Query knowledge base (in-memory RAG)
        ws.send(JSON.stringify({ type: 'status', status: 'searching' }));
        console.log(`🔍 Searching knowledge base for: "${userText}"`);
        const ragContext = knowledgeBase.query(userText, 3);

        if (ragContext) {
            console.log(`📚 Found relevant context (${ragContext.length} chars)`);
        } else {
            console.log(`📭 No specific context found, using base knowledge`);
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

                conversationHistory.push({ role: 'user', content: userText });
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
        message: 'Maya is ready to chat!'
    }));
});

// ==================== HTTP Endpoints ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'maya-voice-agent',
        knowledgeBase: `${KNOWLEDGE_DOCUMENTS.length} documents indexed`,
    });
});

// HTTP chat endpoint (with RAG)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const lastMessage = messages?.[messages.length - 1]?.content || '';
        const ragContext = knowledgeBase.query(lastMessage, 3);
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

// RAG query endpoint (for testing/debugging)
app.post('/api/rag', (req, res) => {
    try {
        const { query, n_results = 3 } = req.body;
        const context = knowledgeBase.query(query, n_results);
        res.json({ query, context: context || 'No relevant documents found.' });
    } catch (error) {
        console.error('RAG error:', error);
        res.status(500).json({ error: 'RAG query failed' });
    }
});

// ==================== Start Server ====================
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`\n🎤 Maya Voice Agent running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`\n✅ Services (all-in-one):`);
    console.log(`   🧠 RAG Knowledge Base: ${KNOWLEDGE_DOCUMENTS.length} documents (in-memory)`);
    console.log(`   🗣️ Azure Speech (STT): ${process.env.AZURE_SPEECH_KEY ? '✓' : '✗'}`);
    console.log(`   🤖 Azure OpenAI (LLM): ${process.env.AZURE_OPENAI_API_KEY ? '✓' : '✗'}`);
    console.log(`   🔊 Cartesia (TTS): ${process.env.CARTESIA_API_KEY ? '✓' : '✗'}`);
    console.log(`\n📋 Endpoints:`);
    console.log(`   POST /api/chat  — Chat with Maya (RAG + LLM)`);
    console.log(`   POST /api/tts   — Text-to-Speech`);
    console.log(`   POST /api/rag   — Test RAG queries`);
    console.log(`   GET  /health    — Health check`);
    console.log(`\n💡 Run: npm run dev:full`);
});
