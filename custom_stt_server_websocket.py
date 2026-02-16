# Pipecat Voice Agent with WebSocket Transport
import json
import time
import asyncio
import logging
import os
import math
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import jwt

from openai import AsyncAzureOpenAI
from cartesia import AsyncCartesia

# Pipecat imports
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.pipeline.runner import PipelineRunner
from pipecat.services.azure.stt import AzureSTTService
from pipecat.services.azure.llm import AzureLLMService
from pipecat.services.openai.base_llm import BaseOpenAILLMService
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketTransport,
    FastAPIWebsocketParams,
    FastAPIWebsocketCallbacks,
)
from pipecat.transports.base_transport import TransportParams
from pipecat.processors.frame_processor import FrameProcessor
from pipecat.frames.frames import TextFrame
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams

# Load environment variables
load_dotenv()

# ------------------------- CONFIGURATION -------------------------
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-35-turbo")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
CARTESIA_VOICE_ID = os.getenv("CARTESIA_VOICE_ID", "f786b574-daa5-4673-aa0c-cbe3e8534c02")

JWT_SECRET = os.getenv("JWT_SECRET", "570c87976e1f80948b83e8d6c6d58c41280501427ddf296e73694ebc25bd1581")
JWT_ALG = "HS256"
JWT_TTL_SECONDS = 600

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent-websocket")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "Maya Voice Agent (WebSocket)", "transport": "WebSocket"}

# ==================== KNOWLEDGE BASE (RAG) ====================
KNOWLEDGE_DOCUMENTS = [
    {
        "id": "about_prajwal",
        "text": "Prajwal Mandale is an AI Engineer & Architect specializing in Generative AI, LLMs, and Scalable Infrastructure. He has extensive experience building production-grade AI systems including voice agents, RAG pipelines, document intelligence platforms, and scalable backend services. His tech stack includes Python, TypeScript, PyTorch, Azure, Pipecat, Cartesia, LangChain, FAISS, ChromaDB, and MongoDB.",
        "keywords": ["prajwal", "about", "engineer", "architect"]
    },
    {
        "id": "about_skills",
        "text": "Prajwal's core skills include: Generative AI (GPT-4, Azure OpenAI, LLM fine-tuning), Voice AI (Pipecat, Cartesia TTS, Azure STT, WebRTC, WebSocket audio streaming, Silero VAD), RAG Systems (FAISS, ChromaDB, LangChain, vector databases), Computer Vision (PyTorch, Azure Document Intelligence, OCR), and Cloud Infrastructure (Azure, Docker).",
        "keywords": ["skills", "expertise", "technologies", "generative", "voice"]
    },
    {
        "id": "about_experience",
        "text": "Prajwal has worked on enterprise-level AI solutions including building real-time voice AI agents with sub-500ms latency, developing RAG-based knowledge retrieval systems, and contributing to open-source projects like LangChain semantic chunker. He currently works at GenXcellence where he has built the Text-to-SQL Query Mind platform.",
        "keywords": ["experience", "work", "career", "genxcellence"]
    },
    {
        "id": "project_voice_agent",
        "text": "Real-time Voice AI Agent: A production-grade voice assistant built using Pipecat, Azure STT, Azure OpenAI GPT, and Cartesia TTS. Features WebSocket audio streaming with Silero VAD achieving under 300ms latency.",
        "keywords": ["voice", "agent", "pipecat", "azure", "tts", "websocket"]
    },
    {
        "id": "project_text_to_sql",
        "text": "Text-to-SQL Query Mind from GenXcellence: An intelligent Natural Language to SQL conversion platform. Users can type plain English questions and the system generates optimized SQL queries, executes them, and shows results visually. Supports schema awareness and query validation.",
        "keywords": ["text-to-sql", "sql", "query", "genxcellence", "natural language"]
    },
    {
        "id": "about_maya",
        "text": "Maya is Prajwal's AI voice assistant. She uses RAG to answer questions about his projects. This version of Maya is built with Pipecat using WebSocket transport for reliable connectivity.",
        "keywords": ["maya", "assistant", "who are you"]
    }
]

class KnowledgeBase:
    def __init__(self, documents):
        self.documents = documents
        self.idf = {}
        self.tfidf_vectors = []
        self._build_index()

    def _tokenize(self, text):
        return [w for w in text.lower().replace('.', ' ').split() if len(w) > 2]

    def _build_index(self):
        all_docs_tokens = [self._tokenize(d["text"] + " " + " ".join(d.get("keywords", []))) for d in self.documents]
        doc_count = len(all_docs_tokens)
        
        df = {}
        for tokens in all_docs_tokens:
            for token in set(tokens):
                df[token] = df.get(token, 0) + 1
        
        self.idf = {t: math.log(doc_count / (c + 1)) + 1 for t, c in df.items()}
        
        for tokens in all_docs_tokens:
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            max_tf = max(tf.values()) if tf else 1
            
            vec = {t: (c / max_tf) * self.idf.get(t, 0) for t, c in tf.items()}
            self.tfidf_vectors.append(vec)

    def _cosine_similarity(self, vec_a, vec_b):
        intersection = set(vec_a.keys()) & set(vec_b.keys())
        numerator = sum(vec_a[t] * vec_b[t] for t in intersection)
        sum1 = sum(v**2 for v in vec_a.values())
        sum2 = sum(v**2 for v in vec_b.values())
        denominator = math.sqrt(sum1) * math.sqrt(sum2)
        return numerator / denominator if denominator else 0.0

    def query(self, text, n_results=2):
        tokens = self._tokenize(text)
        if not tokens:
            return None
            
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        max_tf = max(tf.values()) if tf else 1
        query_vec = {t: (c / max_tf) * self.idf.get(t, 0) for t, c in tf.items()}
        
        scores = []
        for idx, doc_vec in enumerate(self.tfidf_vectors):
            score = self._cosine_similarity(query_vec, doc_vec)
            for kw in self.documents[idx].get("keywords", []):
                if kw in text.lower():
                    score += 0.2
            scores.append((score, self.documents[idx]))
            
        scores.sort(key=lambda x: x[0], reverse=True)
        top_docs = [s[1]["text"] for s in scores[:n_results] if s[0] > 0.05]
        
        return "\n\n".join(top_docs) if top_docs else None

knowledge_base = KnowledgeBase(KNOWLEDGE_DOCUMENTS)

# ==================== RAG PROCESSOR ====================
class RAGProcessor(FrameProcessor):
    def __init__(self):
        super().__init__()

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)

        if isinstance(frame, TextFrame):
            logger.info(f"🔍 RAG Lookup for: {frame.text}")
            context = knowledge_base.query(frame.text)

            if context:
                logger.info(f"📚 Found context ({len(context)} chars)")
                original_text = frame.text
                frame.text = f"{original_text}\n\n[Relevant Knowledge Context]:\n{context}"
            else:
                logger.info("📭 No context found")

        await self.push_frame(frame, direction)

# ==================== WEBSOCKET VOICE AGENT ====================

@app.get("/get-ws-token")
async def get_ws_token():
    token = jwt.encode(
        {"sub": "anonymous", "exp": int(time.time()) + 600},
        JWT_SECRET,
        algorithm=JWT_ALG
    )
    return JSONResponse({"token": token, "expires_in": 600})

async def run_voice_agent(websocket: WebSocket):
    """Run the voice agent with WebSocket transport"""

    try:
        # Accept the websocket connection first
        await websocket.accept()
        logger.info("✅ WebSocket connection accepted")

        # VAD for voice activity detection
        logger.info("🔧 Initializing VAD...")
        vad = SileroVADAnalyzer(params=VADParams(confidence=0.6, start_secs=0.1, stop_secs=0.4))

        # WebSocket transport
        logger.info("🔧 Creating WebSocket transport...")
        transport = FastAPIWebsocketTransport(
            websocket=websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                audio_in_sample_rate=16000,
                audio_out_sample_rate=24000,
                vad_enabled=True,
                vad_analyzer=vad,
                vad_audio_passthrough=True,
            ),
            callbacks=FastAPIWebsocketCallbacks(
                on_client_connected=lambda ws: logger.info("🎙️ Client connected via transport"),
                on_client_disconnected=lambda ws: logger.info("👋 Client disconnected via transport"),
                on_session_timeout=lambda ws: logger.warning("⏱️ Session timeout"),
            ),
        )
        logger.info("✅ Transport created")

        # STT Service
        logger.info("🔧 Initializing STT...")
        stt = AzureSTTService(
            api_key=AZURE_SPEECH_KEY,
            region=AZURE_SPEECH_REGION,
            language="en-US",
        )
        logger.info("✅ STT initialized")

        # LLM Service
        logger.info("🔧 Initializing LLM...")
        llm = AzureLLMService(
            api_key=AZURE_OPENAI_API_KEY,
            endpoint=AZURE_OPENAI_ENDPOINT,
            model=AZURE_OPENAI_DEPLOYMENT,
            api_version=AZURE_OPENAI_API_VERSION,
            params=BaseOpenAILLMService.InputParams(temperature=0.6),
        )
        logger.info("✅ LLM initialized")

        # TTS Service
        logger.info("🔧 Initializing TTS...")
        tts = CartesiaTTSService(
            api_key=CARTESIA_API_KEY,
            voice_id=CARTESIA_VOICE_ID,
            model_id="sonic-3",
            sample_rate=24000,
        )
        logger.info("✅ TTS initialized")

        # Context and aggregator
        messages = [
            {
                "role": "system",
                "content": "You are Maya, Prajwal's AI assistant. Answer questions about his projects (Text-to-SQL, Voice Agent, RAG Chatbot) using the provided context. Be concise (2 sentences max)."
            }
        ]
        context = OpenAILLMContext(messages)
        context_aggregator = llm.create_context_aggregator(context)

        # RAG processor
        rag_processor = RAGProcessor()

        # Pipeline
        logger.info("🔧 Building pipeline...")
        pipeline = Pipeline([
            transport.input(),
            stt,
            rag_processor,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ])
        logger.info("✅ Pipeline built")

        task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

        runner = PipelineRunner()

        logger.info("🚀 Starting pipeline runner...")
        await runner.run(task)

    except Exception as e:
        logger.error(f"❌ Pipeline error: {e}", exc_info=True)
    finally:
        logger.info("🛑 Pipeline stopped")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for voice agent"""
    logger.info(f"🔌 New WebSocket connection from {websocket.client}")
    try:
        await run_voice_agent(websocket)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)

import uvicorn
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
