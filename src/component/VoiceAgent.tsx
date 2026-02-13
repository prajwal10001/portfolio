'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, X, Loader2, Sparkles, AlertCircle, Phone, PhoneOff, Search, Brain, Volume2 } from 'lucide-react'
import { Button } from '@/component/ui/button'

interface VoiceAgentProps {
    isOpen: boolean
    onClose: () => void
}

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const WS_URL = 'ws://localhost:3001'

export function VoiceAgent({ isOpen, onClose }: VoiceAgentProps) {
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [isMicEnabled, setIsMicEnabled] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [visualizerData, setVisualizerData] = useState<number[]>(Array(16).fill(5))
    const [messages, setMessages] = useState<Message[]>([])

    const wsRef = useRef<WebSocket | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const animationFrameRef = useRef<number>(0)
    const audioQueueRef = useRef<ArrayBuffer[]>([])
    const isPlayingRef = useRef(false)

    const appendMessage = useCallback((role: Message['role'], content: string) => {
        const trimmed = content.trim()
        if (!trimmed) return
        setMessages(prev => [...prev, { role, content: trimmed }])
    }, [])

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, transcript, isProcessing, isSearching])

    // Visualizer animation
    useEffect(() => {
        if (isListening || isSpeaking || isProcessing || isSearching) {
            const animateVisualizer = () => {
                if (isListening) {
                    setVisualizerData(prev =>
                        prev.map((_, i) => 10 + Math.sin(Date.now() / 150 + i * 0.3) * 20 + Math.random() * 15)
                    )
                } else if (isSpeaking) {
                    setVisualizerData(prev =>
                        prev.map((_, i) => 12 + Math.sin(Date.now() / 120 + i * 0.4) * 25 + Math.random() * 10)
                    )
                } else if (isSearching) {
                    setVisualizerData(prev =>
                        prev.map((_, i) => 8 + Math.sin(Date.now() / 300 + i * 0.6) * 12 + Math.random() * 5)
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
    }, [isListening, isSpeaking, isProcessing, isSearching])

    // Play audio from queue
    const playNextAudio = useCallback(async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return

        isPlayingRef.current = true
        const audioData = audioQueueRef.current.shift()

        if (audioData) {
            try {
                const blob = new Blob([audioData], { type: 'audio/mpeg' })
                const url = URL.createObjectURL(blob)

                if (!audioRef.current) {
                    audioRef.current = new Audio()
                }

                audioRef.current.src = url
                setIsSpeaking(true)

                audioRef.current.onended = () => {
                    URL.revokeObjectURL(url)
                    setIsSpeaking(false)
                    isPlayingRef.current = false
                    playNextAudio() // Play next in queue
                }

                audioRef.current.onerror = () => {
                    URL.revokeObjectURL(url)
                    setIsSpeaking(false)
                    isPlayingRef.current = false
                    playNextAudio()
                }

                await audioRef.current.play()
            } catch (err) {
                console.error('Audio playback error:', err)
                setIsSpeaking(false)
                isPlayingRef.current = false
            }
        }
    }, [])

    // Connect to WebSocket voice server
    const connectToAgent = useCallback(async () => {
        if (isConnected || isConnecting) return

        setIsConnecting(true)
        setError(null)
        setMessages([])
        setTranscript('')

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            })
            mediaStreamRef.current = stream

            // Connect WebSocket
            const ws = new WebSocket(WS_URL)
            wsRef.current = ws

            ws.binaryType = 'arraybuffer'

            ws.onopen = () => {
                console.log('🔗 WebSocket connected')
                setIsConnected(true)
                setIsConnecting(false)

                // Setup audio streaming
                setupAudioStreaming(stream, ws)
            }

            ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    // Binary audio data from TTS
                    audioQueueRef.current.push(event.data)
                    playNextAudio()
                } else {
                    // JSON message
                    try {
                        const msg = JSON.parse(event.data)
                        handleServerMessage(msg)
                    } catch (e) {
                        console.error('Message parse error:', e)
                    }
                }
            }

            ws.onclose = () => {
                console.log('🔌 WebSocket disconnected')
                cleanup()
            }

            ws.onerror = (err) => {
                console.error('WebSocket error:', err)
                setError('Connection failed. Make sure the voice server is running (npm run voice).')
                cleanup()
            }

        } catch (err: any) {
            console.error('Connection error:', err)
            setError(err?.message || 'Failed to connect. Check microphone permissions.')
            setIsConnecting(false)
        }
    }, [isConnected, isConnecting, playNextAudio])

    // Setup audio streaming from mic to WebSocket
    const setupAudioStreaming = useCallback((stream: MediaStream, ws: WebSocket) => {
        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext

        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN && isMicEnabled) {
                const inputData = e.inputBuffer.getChannelData(0)
                // Convert float32 to int16 PCM
                const pcmData = new Int16Array(inputData.length)
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]))
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
                }
                ws.send(pcmData.buffer)
            }
        }

        source.connect(processor)
        processor.connect(audioContext.destination)
    }, [isMicEnabled])

    // Handle messages from voice server
    const handleServerMessage = useCallback((msg: any) => {
        switch (msg.type) {
            case 'ready':
                appendMessage('assistant', 'Hi! I\'m Maya, Prajwal\'s AI assistant. Ask me anything about his projects, skills, or experience! 🎤')
                break

            case 'status':
                switch (msg.status) {
                    case 'listening':
                        setIsListening(true)
                        setIsProcessing(false)
                        setIsSearching(false)
                        break
                    case 'searching':
                        setIsSearching(true)
                        setIsProcessing(false)
                        break
                    case 'thinking':
                        setIsProcessing(true)
                        setIsSearching(false)
                        setIsListening(false)
                        break
                    case 'speaking':
                        setIsSpeaking(true)
                        setIsProcessing(false)
                        setIsSearching(false)
                        break
                    case 'idle':
                        setIsProcessing(false)
                        setIsSearching(false)
                        setIsSpeaking(false)
                        break
                    case 'reset':
                        setMessages([])
                        break
                }
                break

            case 'interim_transcript':
                setTranscript(msg.text)
                setIsListening(true)
                break

            case 'final_transcript':
                setTranscript('')
                appendMessage('user', msg.text)
                break

            case 'assistant_text':
                appendMessage('assistant', msg.text)
                break

            case 'error':
                setError(msg.message)
                setIsProcessing(false)
                setIsSearching(false)
                break
        }
    }, [appendMessage])

    // Start/stop listening
    const toggleMic = useCallback(() => {
        if (!wsRef.current || !isConnected) return

        const newState = !isMicEnabled
        setIsMicEnabled(newState)

        if (newState) {
            wsRef.current.send(JSON.stringify({ type: 'start_listening' }))
        } else {
            wsRef.current.send(JSON.stringify({ type: 'stop_listening' }))
            setIsListening(false)
        }
    }, [isConnected, isMicEnabled])

    // Cleanup resources
    const cleanup = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect()
            processorRef.current = null
        }
        if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop())
            mediaStreamRef.current = null
        }
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }
        audioQueueRef.current = []
        isPlayingRef.current = false
        setIsConnected(false)
        setIsConnecting(false)
        setIsListening(false)
        setIsSpeaking(false)
        setIsProcessing(false)
        setIsSearching(false)
        setIsMicEnabled(false)
    }, [])

    const disconnectFromAgent = useCallback(() => {
        cleanup()
    }, [cleanup])

    const handleClose = useCallback(() => {
        cleanup()
        setTranscript('')
        setError(null)
        setMessages([])
        onClose()
    }, [cleanup, onClose])

    useEffect(() => {
        return () => {
            cleanup()
            cancelAnimationFrame(animationFrameRef.current)
        }
    }, [cleanup])

    if (!isOpen) return null

    // Determine current status display
    const getStatusDisplay = () => {
        if (isConnecting) return { text: 'Connecting...', icon: null, color: 'text-yellow-400' }
        if (!isConnected) return { text: 'Not Connected', icon: null, color: 'text-muted-foreground' }
        if (isSearching) return { text: 'Searching knowledge base...', icon: <Search className="w-3 h-3 animate-pulse" />, color: 'text-emerald-400' }
        if (isProcessing) return { text: 'Thinking...', icon: <Brain className="w-3 h-3 animate-pulse" />, color: 'text-blue-400' }
        if (isSpeaking) return { text: 'Speaking...', icon: <Volume2 className="w-3 h-3 animate-pulse" />, color: 'text-indigo-400' }
        if (isListening) return { text: 'Listening...', icon: <Mic className="w-3 h-3" />, color: 'text-primary' }
        return { text: isMicEnabled ? 'Ready' : 'Mic Off', icon: null, color: 'text-muted-foreground' }
    }

    const status = getStatusDisplay()

    // Visualizer bar color based on state
    const getVisualizerColor = () => {
        if (isSpeaking) return 'linear-gradient(to top, #6366f1, #818cf8)'
        if (isSearching) return 'linear-gradient(to top, #10b981, #34d399)'
        if (isProcessing) return 'linear-gradient(to top, #3b82f6, #60a5fa)'
        if (isListening) return 'linear-gradient(to top, rgba(178, 52, 62, 0.8), rgba(220, 80, 100, 0.6))'
        return 'rgba(255, 255, 255, 0.2)'
    }

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
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 
                                ${isSpeaking ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]' :
                                    isSearching ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]' :
                                        isProcessing ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' :
                                            'bg-gradient-to-br from-primary to-primary/60'}`}>
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            {isConnected && (
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background 
                                    ${isConnecting ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Maya</h3>
                            <p className={`text-xs flex items-center gap-1.5 ${status.color}`}>
                                {status.icon}
                                {status.text}
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
                    {/* Visualizer */}
                    <div className="flex items-center justify-center mb-4 w-full">
                        <div className="flex items-end justify-center gap-1 h-12">
                            {visualizerData.map((height, index) => (
                                <div
                                    key={index}
                                    className="w-1.5 rounded-full transition-all duration-75"
                                    style={{
                                        height: `${Math.min(height, 48)}px`,
                                        background: getVisualizerColor(),
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Messages / Transcript area */}
                    <div className="w-full flex-1 max-h-[250px] overflow-y-auto space-y-3 px-2 custom-scrollbar">
                        {messages.length === 0 && !transcript && !isProcessing && !isSearching ? (
                            <div className="flex items-center justify-center h-full text-white/30 text-sm">
                                {isConnected ? 'Start speaking...' : 'Click to connect to Maya'}
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

                                {/* Searching indicator */}
                                {isSearching && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] p-3 rounded-2xl bg-emerald-500/5 text-emerald-400/70 rounded-tl-sm text-sm flex items-center gap-2 border border-emerald-500/10">
                                            <Search className="w-3 h-3 animate-pulse" />
                                            Searching knowledge base...
                                        </div>
                                    </div>
                                )}

                                {/* Processing indicator */}
                                {isProcessing && !isSearching && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] p-3 rounded-2xl bg-primary/5 text-primary/50 rounded-tl-sm text-sm flex items-center gap-2 border border-primary/10">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Thinking...
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

                {/* Controls */}
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

                {/* Footer */}
                <div className="px-6 pb-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        Powered by <span className="text-emerald-400">ChromaDB</span> + <span className="text-primary/80">Azure</span> + <span className="text-indigo-400">Cartesia</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
