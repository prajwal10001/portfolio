'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, X, Loader2, Sparkles, AlertCircle, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/component/ui/button'
import { PipecatClient, TranscriptData, BotOutputData, BotLLMTextData, APIRequest } from '@pipecat-ai/client-js'
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport'

interface VoiceAgentProps {
    isOpen: boolean
    onClose: () => void
}

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const CONNECTION_URL = ((import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8000') + '/api/offer'

export function VoiceAgent({ isOpen, onClose }: VoiceAgentProps) {
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isMicEnabled, setIsMicEnabled] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [botTranscript, setBotTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [visualizerData, setVisualizerData] = useState<number[]>(Array(16).fill(5))
    const [messages, setMessages] = useState<Message[]>([])

    const clientRef = useRef<PipecatClient | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
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
            const transport = new SmallWebRTCTransport()

            const client = new PipecatClient({
                transport,
                enableMic: false,
                enableCam: false,
                callbacks: {
                    onConnected: async () => {
                        setIsConnected(true)
                        setIsConnecting(false)
                        setError(null)
                        try {
                            client.enableMic(true)
                            setIsMicEnabled(true)
                        } catch (e: any) {
                            setError(e?.message || 'Mic permission denied.')
                        }
                    },
                    onDisconnected: () => {
                        setIsConnected(false)
                        setIsConnecting(false)
                        setIsListening(false)
                        setIsSpeaking(false)
                        setIsProcessing(false)
                        setIsMicEnabled(false)
                    },
                    onUserStartedSpeaking: () => {
                        console.log('[VoiceAgent] onUserStartedSpeaking')
                        setIsListening(true)
                        setIsProcessing(false)
                    },
                    onUserStoppedSpeaking: () => {
                        console.log('[VoiceAgent] onUserStoppedSpeaking')
                        setIsListening(false)
                        setIsProcessing(true)
                        finalizeUserTranscript()
                    },
                    onUserTranscript: (data: TranscriptData) => {
                        console.log('[VoiceAgent] onUserTranscript:', data)
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
                        console.log('[VoiceAgent] onBotOutput:', data)
                        setIsProcessing(false)
                        botOutputSeenRef.current = true
                        appendMessage('assistant', data.text, true)
                    },
                    onBotTranscript: (data: BotLLMTextData) => {
                        console.log('[VoiceAgent] onBotTranscript:', data)
                        updateLiveBotTranscript(data.text)
                    },
                    onBotLlmText: (data: BotLLMTextData) => {
                        console.log('[VoiceAgent] onBotLlmText:', data)
                        updateLiveBotTranscript(data.text)
                    },
                    onBotTtsText: (data) => {
                        console.log('[VoiceAgent] onBotTtsText:', data)
                        updateLiveBotTranscript(data.text)
                    },
                    onBotStartedSpeaking: () => {
                        console.log('[VoiceAgent] onBotStartedSpeaking')
                        setIsSpeaking(true)
                        setIsProcessing(false)
                        botOutputSeenRef.current = false
                        resetBotTranscript()
                    },
                    onBotStoppedSpeaking: () => {
                        console.log('[VoiceAgent] onBotStoppedSpeaking')
                        setIsSpeaking(false)
                        if (!botOutputSeenRef.current) {
                            finalizeBotTranscript()
                        } else {
                            resetBotTranscript()
                        }
                    },
                    onMessageError: (error: any) => {
                        console.log('[VoiceAgent] onMessageError:', error)
                    },
                    onTrackStarted: (track: MediaStreamTrack, participant) => {
                        console.log('[VoiceAgent] Track started:', {
                            kind: track.kind,
                            id: track.id,
                            label: track.label,
                            enabled: track.enabled,
                            muted: (track as any).muted,
                            participant: participant ? { id: participant.id, local: participant.local, name: participant.name } : null,
                        })
                        if (participant?.local) {
                            console.log('[VoiceAgent] Ignoring local track')
                            return
                        }
                        if (track.kind !== 'audio') return
                        if (!audioRef.current) {
                            audioRef.current = new Audio()
                            audioRef.current.autoplay = true
                        }
                        const stream = new MediaStream([track])
                        audioRef.current.srcObject = stream
                        void audioRef.current.play().catch((err) => {
                            console.warn('[VoiceAgent] Audio play blocked:', err)
                            setError('Audio autoplay blocked. Click the page once and try again.')
                        })
                    },
                },
            })

            clientRef.current = client
            const webrtcRequestParams: APIRequest = {
                endpoint: CONNECTION_URL,
                headers: new Headers({
                    'Content-Type': 'application/json',
                }),
            }
            await client.connect({ webrtcRequestParams })
        } catch (err: any) {
            const message = err?.message || 'Failed to connect. Make sure the server is running on port 8000.'
            setError(message)
            setIsConnecting(false)
            setIsConnected(false)
        }
    }, [isConnected, isConnecting])

    const disconnectFromAgent = useCallback(async () => {
        if (clientRef.current) {
            await clientRef.current.disconnect()
            clientRef.current = null
        }
        setIsConnected(false)
        setIsConnecting(false)
        setIsListening(false)
        setIsSpeaking(false)
        setIsProcessing(false)
        setIsMicEnabled(false)
        setTranscript('')
        setBotTranscript('')
        userTranscriptRef.current = ''
        lastUserFinalRef.current = ''
        botTranscriptRef.current = ''
        botOutputSeenRef.current = false
    }, [])

    const toggleMic = useCallback(() => {
        if (!clientRef.current || !isConnected) return
        const newState = !isMicEnabled
        clientRef.current.enableMic(newState)
        setIsMicEnabled(newState)
        if (!newState) {
            setIsListening(false)
        }
    }, [isConnected, isMicEnabled])

    const handleClose = useCallback(() => {
        disconnectFromAgent()
        setTranscript('')
        setBotTranscript('')
        setError(null)
        setMessages([])
        userTranscriptRef.current = ''
        lastUserFinalRef.current = ''
        botTranscriptRef.current = ''
        botOutputSeenRef.current = false
        onClose()
    }, [disconnectFromAgent, onClose])

    useEffect(() => {
        return () => {
            disconnectFromAgent()
            cancelAnimationFrame(animationFrameRef.current)
        }
    }, [disconnectFromAgent])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div
                className="relative w-full max-w-md mx-4 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 
                                ${isSpeaking ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-gradient-to-br from-primary to-primary/60'}`}>
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            {isConnected && (
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background 
                                    ${isConnecting ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Voice Agent</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                {isConnecting ? 'Connecting...' :
                                    !isConnected ? 'Not Connected' :
                                        isProcessing ? <span className="text-blue-400 animate-pulse">Thinking...</span> :
                                            isSpeaking ? <span className="text-indigo-400 font-medium">Speaking...</span> :
                                                isListening ? 'Listening...' :
                                                    'Paused'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6 flex flex-col min-h-[350px]">
                    {/* Visualizer - always visible at top */}
                    <div className="flex items-center justify-center mb-4 w-full">
                        <div className="flex items-end justify-center gap-1 h-12">
                            {visualizerData.map((height, index) => (
                                <div
                                    key={index}
                                    className="w-1.5 rounded-full transition-all duration-75"
                                    style={{
                                        height: `${Math.min(height, 48)}px`,
                                        background: isSpeaking
                                            ? 'linear-gradient(to top, #6366f1, #818cf8)'
                                            : isProcessing
                                                ? 'linear-gradient(to top, #3b82f6, #60a5fa)'
                                                : isListening
                                                    ? 'linear-gradient(to top, rgba(178, 52, 62, 0.8), rgba(220, 80, 100, 0.6))'
                                                    : 'rgba(255, 255, 255, 0.2)',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Messages/Transcript area - always visible */}
                    <div className="w-full flex-1 max-h-[250px] overflow-y-auto space-y-3 px-2 custom-scrollbar">
                        {messages.length === 0 && !transcript && !isProcessing && !botTranscript ? (
                            <div className="flex items-center justify-center h-full text-white/30 text-sm">
                                {isConnected ? 'Start speaking...' : 'Click to connect'}
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                                ? 'bg-white/10 text-white rounded-tr-sm'
                                                : 'bg-primary/10 text-primary-foreground border border-primary/20 rounded-tl-sm'
                                                }`}
                                        >
                                            <p>{msg.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* User's interim transcript */}
                                {transcript && (
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] p-3 rounded-2xl bg-white/5 text-white/50 rounded-tr-sm text-sm italic border border-white/10">
                                            <p>{transcript}...</p>
                                        </div>
                                    </div>
                                )}

                                {/* Processing indicator */}
                                {isProcessing && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] p-3 rounded-2xl bg-primary/5 text-primary/50 rounded-tl-sm text-sm flex items-center gap-2 border border-primary/10">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Thinking...
                                        </div>
                                    </div>
                                )}

                                {/* Bot's real-time transcript while speaking */}
                                {botTranscript && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] p-3 rounded-2xl bg-indigo-500/10 text-indigo-300 rounded-tl-sm text-sm italic border border-indigo-500/20">
                                            <p>{botTranscript}...</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {error && (
                        <div className="w-full mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300 whitespace-pre-line">{error}</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex items-center justify-center gap-4">
                    {!isConnected ? (
                        <Button
                            onClick={connectToAgent}
                            disabled={isConnecting}
                            className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 border-0 shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105"
                        >
                            {isConnecting ? (
                                <Loader2 className="w-7 h-7 text-white animate-spin" />
                            ) : (
                                <Phone className="w-7 h-7 text-white" />
                            )}
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={toggleMic}
                                className={`h-16 w-16 rounded-full ${isMicEnabled
                                    ? 'bg-gradient-to-br from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60 shadow-primary/30'
                                    : isSpeaking
                                        ? 'bg-indigo-500/50 hover:bg-indigo-500/70 border-indigo-500/50'
                                        : 'bg-white/10 hover:bg-white/20'
                                    } disabled:opacity-50 border-0 shadow-lg transition-all duration-300 hover:scale-105`}
                            >
                                {isMicEnabled ? (
                                    <Mic className="w-7 h-7 text-white" />
                                ) : (
                                    <MicOff className="w-7 h-7 text-white" />
                                )}
                            </Button>

                            <Button
                                onClick={disconnectFromAgent}
                                className="h-12 w-12 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 transition-all duration-300"
                            >
                                <PhoneOff className="w-5 h-5 text-red-400" />
                            </Button>
                        </>
                    )}
                </div>

                <div className="px-6 pb-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        Powered by <span className="text-primary/80">Azure</span> + <span className="text-indigo-400">Cartesia</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
