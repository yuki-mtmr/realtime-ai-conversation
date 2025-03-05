import { Player } from './audio/Player.js';
import { Recorder } from './audio/Recorder.js';

const BUFFER_SIZE = 4800;
const statusElement = document.getElementById('status');

async function startAudio() {
    try {
        const ws = new WebSocket(`ws://${window.location.host}/ws`);
        const audioPlayer = new Player();
        await audioPlayer.init(24000);

        ws.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                if (data?.type !== 'response.audio.delta') return;

                const binary = atob(data.delta);
                const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                const pcmData = new Int16Array(bytes.buffer);

                audioPlayer.play(pcmData);
            } catch (error) {
                console.error('WebSocket message error:', error);
                statusElement.textContent = `WebSocket error: ${error.message}`;
            }
        };

        let buffer = new Uint8Array();

        const appendToBuffer = (newData) => {
            const newBuffer = new Uint8Array(buffer.length + newData.length);
            newBuffer.set(buffer);
            newBuffer.set(newData, buffer.length);
            buffer = newBuffer;
        };

        const handleAudioData = (data) => {
            const uint8Array = new Uint8Array(data);
            appendToBuffer(uint8Array);

            if (buffer.length >= BUFFER_SIZE) {
                const toSend = new Uint8Array(buffer.slice(0, BUFFER_SIZE));
                buffer = new Uint8Array(buffer.slice(BUFFER_SIZE));

                const regularArray = String.fromCharCode(...toSend);
                const base64 = btoa(regularArray);

                ws.send(JSON.stringify({type: 'input_audio_buffer.append', audio: base64}));
            }
        };

        const audioRecorder = new Recorder(handleAudioData);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await audioRecorder.start(stream);
        statusElement.textContent = "Connected and recording";

    } catch (error) {
        console.error('Error:', error);
        statusElement.textContent = `Error: ${error.message}. Please check your microphone settings.`;
        alert('Error accessing the microphone. Please check your settings and try again.');
    }
}

// Button to toggle audio
const toggleButton = document.getElementById('toggleAudio');
let isAudioOn = false;

toggleButton.addEventListener('click', async () => {
    if (!isAudioOn) {
        await startAudio();
        toggleButton.textContent = 'Stop Audio';
        isAudioOn = true;
    } else {
        location.reload();
        toggleButton.textContent = 'Start Audio';
        isAudioOn = false;
    }
});