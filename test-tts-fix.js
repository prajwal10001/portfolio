// Quick Test Script for TTS Fix
// Run this with: node test-tts-fix.js

import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function testTTS() {
    console.log('🧪 Testing TTS with new settings...\n');

    const testText = "Hello! I'm Maya, your AI assistant. This voice should sound natural and clear.";

    try {
        const response = await fetch('https://api.cartesia.ai/tts/bytes', {
            method: 'POST',
            headers: {
                'Cartesia-Version': '2024-06-10',
                'Content-Type': 'application/json',
                'X-API-Key': process.env.CARTESIA_API_KEY,
            },
            body: JSON.stringify({
                model_id: 'sonic-3',
                transcript: testText,
                voice: {
                    mode: 'id',
                    id: process.env.CARTESIA_VOICE_ID || 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
                    __experimental_controls: {
                        speed: 'normal',
                        emotion: ['positivity:high']
                    }
                },
                output_format: {
                    container: 'mp3',
                    encoding: 'mp3',
                    sample_rate: 44100, // FIXED: 44.1kHz instead of 24kHz
                    bit_rate: 128000,
                },
                language: 'en',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ TTS API Error:', errorText);
            return;
        }

        const audioBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(audioBuffer);

        // Save test audio
        fs.writeFileSync('test-tts-output.mp3', buffer);

        console.log('✅ TTS Test Successful!');
        console.log(`📊 Audio size: ${(buffer.length / 1024).toFixed(2)} KB`);
        console.log(`📝 Text length: ${testText.length} characters`);
        console.log(`🎵 Sample rate: 44100 Hz (44.1 kHz)`);
        console.log(`📁 Output file: test-tts-output.mp3`);
        console.log('\n👉 Play the file to verify it sounds natural (not sped up)');
        console.log('   You can play it with: start test-tts-output.mp3 (Windows)');
        console.log('                         open test-tts-output.mp3 (Mac)');
        console.log('                         xdg-open test-tts-output.mp3 (Linux)');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Check if API key exists
if (!process.env.CARTESIA_API_KEY) {
    console.error('❌ CARTESIA_API_KEY not found in .env file');
    console.log('💡 Make sure you have a .env file with:');
    console.log('   CARTESIA_API_KEY=your_api_key_here');
    process.exit(1);
}

testTTS();
