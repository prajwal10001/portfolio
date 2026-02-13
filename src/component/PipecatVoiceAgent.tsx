/**
 * Pipecat Voice Agent Component
 * ==============================
 * Connects to Pipecat WebSocket server for ultra-low latency voice AI.
 * 
 * Uses @pipecat-ai/client-js and @pipecat-ai/websocket-transport
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react'
import { PipecatClient, TranscriptData, BotOutputData } from '@pipecat-ai/client-js'
import { WebSocketTransport, ProtobufFrameSerializer } from '@pipecat-ai/websocket-transport'

type Status = 'idle' | 'connecting' | 'connected' | 'listening' | 'processing' | 'speaking' | 'error'

const STATUS_MESSAGES: Record<Status, string> = {
    idle: 'Click to start conversation',
    connecting: 'Connecting to Maya...',
    connected: 'Connected! Click mic to speak',
    listening: 'Listening...',
    processing: 'Thinking...',
    speaking: 'Maya is speaking...',
    error: 'Connection error. Try again.',
}

export default function PipecatVoiceAgent() {
    const [status, setStatus] = useState<Status>('idle')
    const [isConnected, setIsConnected] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [agentResponse, setAgentResponse] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [audioLevel, setAudioLevel] = useState(0)
    const [isMicEnabled, setIsMicEnabled] = useState(false)

    const clientRef = useRef<PipecatClient | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number | null>(null)

    // Initialize and connect to Pipecat server
    const connect = useCallback(async () => {
        setStatus('connecting')
        setError(null)

        try {
            const transport = new WebSocketTransport({
                wsUrl: 'ws://localhost:8765',
                recorderSampleRate: 16000,
                playerSampleRate: 24000,
                serializer: new ProtobufFrameSerializer(),
            })

            const client = new PipecatClient({
                transport,
                enableMic: true,
                enableCam: false,
                callbacks: {
                    onConnected: () => {
                        console.log('✅ Connected to Pipecat server')
                        setIsConnected(true)
                        setStatus('connected')
                        setError(null)
                    },
                    onDisconnected: () => {
                        console.log('❌ Disconnected from Pipecat server')
                        setIsConnected(false)
                        setStatus('idle')
                    },
                    onBotStartedSpeaking: () => {
                        console.log('🔊 Maya started speaking')
                        setStatus('speaking')
                    },
                    onBotStoppedSpeaking: () => {
                        console.log('🔇 Maya stopped speaking')
                        setStatus('connected')
                    },
                    onUserTranscript: (data: TranscriptData) => {
                        console.log('📝 Transcript:', data)
                        setTranscript(data.text)
                        if (data.final) {
                            setStatus('processing')
                        }
                    },
                    onBotOutput: (data: BotOutputData) => {
                        console.log('💬 Maya:', data.text)
                        setAgentResponse(data.text)
                    },
                    onLocalAudioLevel: (level: number) => {
                        setAudioLevel(level * 100)
                    },
                    onUserStartedSpeaking: () => {
                        setStatus('listening')
                    },
                    onUserStoppedSpeaking: () => {
                        setStatus('processing')
                    },
                },
            })

            clientRef.current = client

            // Connect to the WebSocket server
            await client.connect()

        } catch (err: any) {
            console.error('Connection failed:', err)
            setError(err.message || 'Failed to connect. Make sure pipecat_server.py is running.')
            setStatus('error')
        }
    }, [])

    // Disconnect from Pipecat server
    const disconnect = useCallback(async () => {
        if (clientRef.current) {
            await clientRef.current.disconnect()
            clientRef.current = null
        }
        setIsConnected(false)
        setStatus('idle')
        setTranscript('')
        setAgentResponse('')
        setIsMicEnabled(false)
    }, [])

    // Toggle microphone
    const toggleMic = useCallback(() => {
        if (!clientRef.current || !isConnected) return

        const newState = !isMicEnabled
        clientRef.current.enableMic(newState)
        setIsMicEnabled(newState)
        setStatus(newState ? 'listening' : 'connected')
    }, [isConnected, isMicEnabled])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect()
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [])

    // Audio visualizer
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const draw = () => {
            const width = canvas.width
            const height = canvas.height

            // Clear canvas
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
            ctx.fillRect(0, 0, width, height)

            // Draw audio level
            const barCount = 20
            const barWidth = width / barCount - 2
            const maxHeight = height * 0.8

            for (let i = 0; i < barCount; i++) {
                const barHeight = (audioLevel / 100) * maxHeight * (0.5 + Math.random() * 0.5)
                const x = i * (barWidth + 2)
                const y = (height - barHeight) / 2

                // Gradient based on status
                let color = '#4B5563' // gray
                if (status === 'listening') color = '#10B981' // green
                if (status === 'speaking') color = '#8B5CF6' // purple
                if (status === 'processing') color = '#F59E0B' // amber

                ctx.fillStyle = color
                ctx.fillRect(x, y, barWidth, barHeight)
            }

            if (status === 'listening' || status === 'speaking') {
                animationRef.current = requestAnimationFrame(draw)
            }
        }

        if (status === 'listening' || status === 'speaking') {
            draw()
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [status, audioLevel])

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Main Button - Always visible */}
            <button
                onClick={isConnected ? disconnect : connect}
                className={`
                    group relative w-16 h-16 rounded-full shadow-2xl
                    flex items-center justify-center
                    transition-all duration-300 ease-out
                    ${isConnected
                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                        : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
                    }
                    ${status === 'speaking' ? 'animate-pulse' : ''}
                `}
                disabled={status === 'connecting'}
            >
                {isConnected ? (
                    <PhoneOff className="w-7 h-7 text-white" />
                ) : (
                    <Phone className="w-7 h-7 text-white" />
                )}

                {/* Pulse animation when connected */}
                {isConnected && (
                    <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
                )}
            </button>

            {/* Expanded Panel when connected */}
            {isConnected && (
                <div className="absolute bottom-20 right-0 w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-b border-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Volume2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Maya</h3>
                                <p className="text-xs text-gray-400">
                                    {STATUS_MESSAGES[status]}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Audio Visualizer */}
                    <div className="p-4">
                        <canvas
                            ref={canvasRef}
                            width={272}
                            height={60}
                            className="w-full rounded-lg bg-gray-800/50"
                        />
                    </div>

                    {/* Transcript */}
                    {transcript && (
                        <div className="px-4 pb-2">
                            <p className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-2">
                                <span className="text-green-400">You:</span> {transcript}
                            </p>
                        </div>
                    )}

                    {/* Agent Response */}
                    {agentResponse && (
                        <div className="px-4 pb-2">
                            <p className="text-sm text-gray-300 bg-purple-900/30 rounded-lg p-2">
                                <span className="text-purple-400">Maya:</span> {agentResponse}
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="px-4 pb-2">
                            <p className="text-sm text-red-400 bg-red-900/30 rounded-lg p-2">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Mic Button */}
                    <div className="p-4 pt-2 border-t border-gray-700/50">
                        <button
                            onClick={toggleMic}
                            className={`
                                w-full py-3 rounded-xl flex items-center justify-center gap-2
                                transition-all duration-200 font-medium
                                ${isMicEnabled
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                }
                            `}
                            disabled={status === 'processing' || status === 'speaking'}
                        >
                            {isMicEnabled ? (
                                <>
                                    <MicOff className="w-5 h-5" />
                                    Mute Mic
                                </>
                            ) : (
                                <>
                                    <Mic className="w-5 h-5" />
                                    Unmute Mic
                                </>
                            )}
                        </button>
                    </div>

                    {/* Latency indicator */}
                    <div className="px-4 pb-4 text-center">
                        <span className="text-xs text-gray-500">
                            ⚡ Pipecat • ~300ms latency
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
