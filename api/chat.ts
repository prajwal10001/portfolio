// Vercel Serverless Function for Azure OpenAI Chat
// This handles the LLM conversation for Maya voice assistant

export const config = {
    runtime: 'edge',
}

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
}

interface RequestBody {
    messages: Message[]
    systemPrompt?: string
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
        const { messages, systemPrompt } = body

        // Get Azure OpenAI credentials from environment
        const apiKey = process.env.AZURE_OPENAI_API_KEY
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo'
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'

        if (!apiKey || !endpoint) {
            return new Response(
                JSON.stringify({ error: 'Azure OpenAI not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Build messages with system prompt
        const fullMessages: Message[] = [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            ...messages
        ]

        // Call Azure OpenAI
        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                messages: fullMessages,
                max_tokens: 150, // Keep responses short for voice
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Azure OpenAI error:', errorText)
            return new Response(
                JSON.stringify({ error: 'Failed to get AI response' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const data = await response.json()
        const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

        return new Response(
            JSON.stringify({ message: assistantMessage }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Chat API error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
