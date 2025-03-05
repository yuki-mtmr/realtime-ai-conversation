export class Recorder {
    constructor(onDataAvailable) {
        this.onDataAvailable = onDataAvailable;
        this.audioContext = null;
        this.mediaStream = null;
        this.mediaStreamSource = null;
        this.workletNode = null;
        this.statusElement = document.getElementById('status');
    }

    async start(stream) {
        try {
            if (this.audioContext) {
                await this.audioContext.close();
            }

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            await this.audioContext.audioWorklet.addModule("/static/js/audio/audio-processor-worklet.js");

            this.mediaStream = stream;
            this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);

            this.workletNode = new AudioWorkletNode(this.audioContext, "audio-processor-worklet");
            this.workletNode.port.onmessage = event => {
                this.onDataAvailable(event.data.buffer);
            };

            this.mediaStreamSource.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);
            this.statusElement.textContent = "Recording started";
        } catch (error) {
            console.error('Recorder error:', error);
            this.statusElement.textContent = `Error: ${error.message}`;
            this.stop();
        }
    }

    async stop() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        this.mediaStreamSource = null;
        this.workletNode = null;
        this.statusElement.textContent = "Recording stopped";
    }
}