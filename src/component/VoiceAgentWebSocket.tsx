'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Loader2, Sparkles, AlertCircle, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/component/ui/button'
import { PipecatClient, TranscriptData, BotOutputData, BotLLMTextData } from '@pipecat-ai/client-js'
import { WebSocketTransport } from '@pipecat-ai/websocket-transport'

interface VoiceAgentProps {
    isOpen: boolean
    onClose: () => void
}

interface Message {
    role: 'user' | 'assistant'
    content: string
}

// Automatically detect WebSocket URL from backend URL
const getWebSocketURL = () => {
    const backendUrl = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8000'
    
    // Convert HTTP(S) to WS(S)
    if (backendUrl.startsWith('https://')) {
        return backendUrl.replace('https://', 'wss://') + '/ws'
    } else if (backendUrl.startsWith('http://')) {
        return backendUrl.replace('http://', 'ws://') + '/ws'
    } else if (backendUrl.startsWith('ws://') || backendUrl.startsWith('wss://')) {
        return backendUrl + '/ws'
    }
    
    // Default to localhost
    return 'ws://localhost:8000/ws'
}

const WS_URL = getWebSocketURL()

export function VoiceAgentWebSocket({ isOpen, onClose }: VoiceAgentProps) {
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [botTranscript, setBotTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [visualizerData, setVisualizerData] = useState<number[]>(Array(16).fill(5))
    const [messages, setMessages] = useState<Message[]>([])

    const clientRef = useRef<PipecatClient | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const animationFrameRef = useRef<number>(0)
    const userTranscriptRef = useRef('')
    const lastUserFinalRef = useRef('')
    const botTranscriptRef = useRef('')
    const botOutputSeenRef = useRef(false)

    const appendMessage = useCallback((role: Message['role'], content: string, mergeWithLast = false) => {
        const trimmed = content.trim()
        if (!trimmed) return
        setMessages(prev => {
            const last = prev[prev.length - 1]
            if (mergeWithLast && last && last.role === role) {
                return [...prev.slice(0, -1), { role, content: last.content + content }]
            }
            return [...prev, { role, content: trimmed }]
        })
    }, [])

    const updateLiveBotTranscript = useCallback((chunk: string) => {
        if (!chunk) return
        botTranscriptRef.current = `${botTranscriptRef.current}${chunk}`
        setBotTranscript(botTranscriptRef.current)
    }, [])

    const resetBotTranscript = useCallback(() => {
        botTranscriptRef.current = ''
        setBotTranscript('')
    }, [])

    const finalizeUserTranscript = useCallback(() => {
        const finalText = userTranscriptRef.current.trim()
        if (finalText && finalText !== lastUserFinalRef.current) {
            lastUserFinalRef.current = finalText
            appendMessage('user', finalText)
        }
        userTranscriptRef.current = ''
        setTranscript('')
    }, [appendMessage])

    const finalizeBotTranscript = useCallback(() => {
        const finalText = botTranscriptRef.current.trim()
        if (finalText) {
            appendMessage('assistant', finalText)
        }
        resetBotTranscript()
    }, [appendMessage, resetBotTranscript])

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, transcript, botTranscript, isProcessing])

    useEffect(() => {
        if (isListening || isSpeaking || isProcessing) {
            const animateVisualizer = () => {
                if (isListening || isSpeaking) {
                    setVisualizerData(prev =>
                        prev.map((_, i) => 10 + Math.sin(Date.now() / 150 + i * 0.3) * 20 + Math.random() * 15)
                    )
                } else if (isProcessing) {
                    setVisualizerData(prev =>
                        prev.map((_, i) => 10 + Math.sin(Date.now() / 500 + i * 0.5) * 10)
                    )
                }
                animationFrameRef.current = requestAnimationFrame(animateVisualizer)
            }
            animateVisualizer()
        } else {
            cancelAnimationFrame(animationFrameRef.current)
            setVisualizerData(Array(16).fill(5))
        }

        return () => cancelAnimationFrame(animationFrameRef.current)
    }, [isListening, isSpeaking, isProcessing])

    const connectToAgent = useCallback(async () => {
        if (isConnected || isConnecting || clientRef.current) return

        setIsConnecting(true)
        setError(null)
        setMessages([])
        setTranscript('')
        setBotTranscript('')
        userTranscriptRef.current = ''
        lastUserFinalRef.current = ''
        botTranscriptRef.current = ''
        botOutputSeenRef.current = false

        try {
            const transport = new WebSocketTransport()

            const client = new PipecatClient({
                transport,
                enableMic: false,
                enableCam: false,
                callbacks: {
                    onConnected: async () => {
                        console.log('[WebSocket] Connected')
                        setIsConnected(true)
                        setIsConnecting(false)
                        setError(null)
                        try {
                            client.enableMic(true)
                        } catch (e: any) {
                            setError(e?.message || 'Mic permission denied.')
                        }
                    },
                    onDisconnected: () => {
                        console.log('[WebSocket] Disconnected')
                        setIsConnected(false)
                        setIsConnecting(false)
                        setIsListening(false)
                        setIsSpeaking(false)
                        setIsProcessing(false)
                    },
                    onUserStartedSpeaking: () => {
                        console.log('[WebSocket] User started speaking')
                        setIsListening(true)
                        setIsProcessing(false)
                    },
                    onUserStoppedSpeaking: () => {
                        console.log('[WebSocket] User stopped speaking')
                        setIsListening(false)
                        setIsProcessing(true)
                        finalizeUserTranscript()
                    },
                    onUserTranscript: (data: TranscriptData) => {
                        console.log('[WebSocket] User transcript:', data)
                        const text = (data.text || '').trim()
                        if (data.final) {
                            if (text) {
                                userTranscriptRef.current = text
                            }
                            finalizeUserTranscript()
                        } else {
                            if (text) {
                                userTranscriptRef.current = text
                                setTranscript(text)
                            }
                        }
                    },
                    onBotOutput: (data: BotOutputData) => {
                        console.log('[WebSocket] Bot output:', data)
                        setIsProcessing(false)
                        botOutputSeenRef.current = true
                        appendMessage('assistant', data.text, true)
                    },
                    onBotTranscript: (data: BotLLMTextData) => {
                        console.log('[WebSocket] Bot transcript:', data)
                        updateLiveBotTranscript(data.text)
                    },
                    onBotLlmText: (data: BotLLMTextData) => {
                        console.log('[WebSocket] Bot LLM text:', data)
                        updateLiveBotTranscript(data.text)
                    },
                    onBotTtsText: (data) => {
                        console.log('[WebSocket] Bot TTS text:', data)
                        updateLiveBotTranscript(data.text)
                    },
                    onBotStartedSpeaking: () => {
                        console.log('[WebSocket] Bot started speaking')
                        setIsSpeaking(true)
                        setIsProcessing(false)
                        botOutputSeenRef.current = false
                        resetBotTranscript()
                    },
                    onBotStoppedSpeaking: () => {
                        console.log('[WebSocket] Bot stopped speaking')
                        setIsSpeaking(false)
                        if (!botOutputSeenRef.current) {
                            finalizeBotTranscript()
                        } else {
                            resetBotTranscript()
                        }
                    },
                    onMessageError: (error: any) => {
                        console.error('[WebSocket] Message error:', error)
                        setError(error?.message || 'Connection error')
                    },
                },
            })

            clientRef.current = client
            
            // Connect to WebSocket
            await client.connect({ ws_url: WS_URL })
            
        } catch (e: any) {
            console.error('[WebSocket] Connection error:', e)
            setError(e?.message || 'Failed to connect')
            setIsConnecting(false)
            clientRef.current = null
        }
    }, [isConnected, isConnecting, appendMessage, finalizeUserTranscript, finalizeBotTranscript, updateLiveBotTranscript, resetBotTranscript])

    const disconnectFromAgent = useCallback(async () => {
        if (clientRef.current) {
            await clientRef.current.disconnect()
            clientRef.current = null
        }
    }, [])

    useEffect(() => {
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect()
            }
        }
    }, [])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl mx-4 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-3xl shadow-2xl border border-purple-500/20 overflow-hidden">
                {/* Header */}
                <div className="relative px-6 py-5 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className={`absolute inset-0 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-600'} animate-ping opacity-20`} />
                                <Phone className={`relative w-6 h-6 ${isConnected ? 'text-emerald-400' : 'text-gray-400'}`} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Voice Agent (WebSocket)</h2>
                                <p className="text-xs text-purple-300">
                                    {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Not Connected'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Visualizer */}
                <div className="px-6 py-4 bg-black/20">
                    <div className="flex items-end justify-center gap-1.5 h-20">
                        {visualizerData.map((height, i) => (
                            <div
                                key={i}
                                className="w-2 rounded-full bg-gradient-to-t from-purple-500 to-pink-400 transition-all duration-100"
                                style={{ height: `${height}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Messages */}
                <div className="px-6 py-4 h-80 overflow-y-auto space-y-3 bg-gradient-to-b from-transparent to-black/10">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                    msg.role === 'user'
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                        : 'bg-white/10 text-gray-100 border border-white/10'
                                }`}
                            >
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {transcript && (
                        <div className="flex justify-end">
                            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-purple-600/50 text-white border border-purple-400/30">
                                <p className="text-sm leading-relaxed italic">{transcript}...</p>
                            </div>
                        </div>
                    )}

                    {botTranscript && (
                        <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-white/5 text-gray-100 border border-white/10">
                                <p className="text-sm leading-relaxed italic">{botTranscript}...</p>
                            </div>
                        </div>
                    )}

                    {isProcessing && !botTranscript && (
                        <div className="flex justify-start">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                <span className="text-sm text-gray-300">Thinking...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                {/* Controls */}
                <div className="px-6 pb-6 pt-4 border-t border-purple-500/20 bg-gradient-to-r from-transparent to-purple-900/20">
                    <div className="flex items-center justify-center gap-4">
                        {!isConnected ? (
                            <Button
                                onClick={connectToAgent}
                                disabled={isConnecting}
                                className="px-8 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isConnecting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Phone className="w-5 h-5 mr-2" />
                                        Connect
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={disconnectFromAgent}
                                className="px-8 py-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-red-500/50 transition-all"
                            >
                                <PhoneOff className="w-5 h-5 mr-2" />
                                Disconnect
                            </Button>
                        )}
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-purple-300">
                        <Sparkles className="w-4 h-4" />
                        <span>Powered by Azure + Cartesia + WebSocket</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
