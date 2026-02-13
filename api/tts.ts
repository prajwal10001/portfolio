// Vercel Serverless Function for Cartesia TTS
// This converts text to speech using Cartesia's API

export const config = {
    runtime: 'edge',
}

interface RequestBody {
    text: string
    voiceId?: string
}

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        )
    }

    try {
        const body: RequestBody = await request.json()
        const { text, voiceId } = body

        if (!text || text.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Text is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Get Cartesia credentials from environment
        const apiKey = process.env.CARTESIA_API_KEY
        // Katie voice - natural female voice
        const defaultVoiceId = process.env.CARTESIA_VOICE_ID || 'f786b574-daa5-4673-aa0c-cbe3e8534c02'

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'Cartesia API not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Call Cartesia TTS API
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
                    id: voiceId || defaultVoiceId,
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
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Cartesia TTS error:', errorText)
            return new Response(
                JSON.stringify({ error: 'TTS failed' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Return audio as blob
        const audioBuffer = await response.arrayBuffer()

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache',
            },
        })

    } catch (error) {
        console.error('TTS API error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
