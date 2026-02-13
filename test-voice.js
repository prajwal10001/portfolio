// Debug script to test STT, LLM, and TTS individually
// Run with: node test-voice.js

import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔧 Voice Agent Debug Tool\n');
console.log('='.repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables Check:');
const envVars = {
    'AZURE_SPEECH_KEY': process.env.AZURE_SPEECH_KEY ? '✅ Set' : '❌ Missing',
    'AZURE_SPEECH_REGION': process.env.AZURE_SPEECH_REGION || '❌ Missing',
    'AZURE_OPENAI_API_KEY': process.env.AZURE_OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
    'AZURE_OPENAI_ENDPOINT': process.env.AZURE_OPENAI_ENDPOINT || '❌ Missing',
    'AZURE_OPENAI_DEPLOYMENT': process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo',
    'CARTESIA_API_KEY': process.env.CARTESIA_API_KEY ? '✅ Set' : '❌ Missing',
    'CARTESIA_VOICE_ID': process.env.CARTESIA_VOICE_ID || 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
};

for (const [key, value] of Object.entries(envVars)) {
    console.log(`   ${key}: ${value}`);
}

// Test 1: Azure OpenAI (LLM)
async function testLLM() {
    console.log('\n' + '='.repeat(50));
    console.log('🧠 Test 1: Azure OpenAI (LLM)');
    console.log('='.repeat(50));

    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    if (!apiKey || !endpoint) {
        console.log('❌ FAILED: Missing API key or endpoint');
        return false;
    }

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    console.log(`   URL: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: 'You are Maya, a friendly AI assistant.' },
                    { role: 'user', content: 'Hello Maya, who are you?' }
                ],
                max_tokens: 100,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ FAILED: HTTP ${response.status}`);
            console.log(`   Error: ${errorText}`);
            return false;
        }

        const data = await response.json();
        const message = data.choices[0]?.message?.content;
        console.log(`✅ SUCCESS!`);
        console.log(`   Response: "${message?.substring(0, 100)}..."`);
        return true;

    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        return false;
    }
}

// Test 2: Cartesia TTS
async function testTTS() {
    console.log('\n' + '='.repeat(50));
    console.log('🔊 Test 2: Cartesia TTS');
    console.log('='.repeat(50));

    const apiKey = process.env.CARTESIA_API_KEY;
    const voiceId = process.env.CARTESIA_VOICE_ID || 'f786b574-daa5-4673-aa0c-cbe3e8534c02';

    if (!apiKey) {
        console.log('❌ FAILED: Missing Cartesia API key');
        return false;
    }

    console.log(`   Voice ID: ${voiceId}`);

    try {
        const response = await fetch('https://api.cartesia.ai/tts/bytes', {
            method: 'POST',
            headers: {
                'Cartesia-Version': '2024-06-10',
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                model_id: 'sonic-3',
                transcript: 'Hello, I am Maya, your AI voice assistant.',
                voice: { mode: 'id', id: voiceId },
                output_format: {
                    container: 'mp3',
                    bit_rate: 128000,
                    sample_rate: 24000,
                },
                language: 'en',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ FAILED: HTTP ${response.status}`);
            console.log(`   Error: ${errorText}`);
            return false;
        }

        const audioBuffer = await response.arrayBuffer();
        console.log(`✅ SUCCESS!`);
        console.log(`   Audio size: ${audioBuffer.byteLength} bytes`);

        // Save to file for manual testing
        const fs = await import('fs');
        fs.writeFileSync('test-audio.mp3', Buffer.from(audioBuffer));
        console.log(`   Saved to: test-audio.mp3 (play it to verify TTS)`);
        return true;

    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        return false;
    }
}

// Test 3: Azure Speech SDK availability
async function testSTT() {
    console.log('\n' + '='.repeat(50));
    console.log('🎤 Test 3: Azure Speech SDK');
    console.log('='.repeat(50));

    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !speechRegion) {
        console.log('❌ FAILED: Missing Azure Speech key or region');
        return false;
    }

    try {
        const sdk = await import('microsoft-cognitiveservices-speech-sdk');
        console.log(`✅ SDK loaded successfully`);

        const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechRecognitionLanguage = 'en-US';
        console.log(`✅ Speech config created`);
        console.log(`   Region: ${speechRegion}`);
        console.log(`   Language: en-US`);

        // Note: Full STT test requires microphone input
        console.log(`\n   ℹ️  Full STT test requires microphone input (tested in browser)`);
        return true;

    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        return false;
    }
}

// Run all tests
async function runTests() {
    const results = {
        llm: await testLLM(),
        tts: await testTTS(),
        stt: await testSTT(),
    };

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary');
    console.log('='.repeat(50));
    console.log(`   LLM (Azure OpenAI): ${results.llm ? '✅ Working' : '❌ Failed'}`);
    console.log(`   TTS (Cartesia):     ${results.tts ? '✅ Working' : '❌ Failed'}`);
    console.log(`   STT (Azure Speech): ${results.stt ? '✅ SDK Ready' : '❌ Failed'}`);

    if (results.llm && results.tts && results.stt) {
        console.log('\n🎉 All components are working!');
        console.log('   If voice agent still fails, check browser console for errors.\n');
    } else {
        console.log('\n⚠️  Some components failed. Fix the issues above.\n');
    }
}

runTests();
