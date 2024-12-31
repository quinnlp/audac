const status = document.getElementById("status");
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

async function generateAudio() {
    const fileInput = document.getElementById("mappingFile");
    const textSequence = document.getElementById("textSequence").value;

    if (!fileInput.files.length) {
	status.textContent = "Please upload a mapping file.";
        return null;
    }

    try {
        const file = fileInput.files[0];
        const mapping = JSON.parse(await file.text());

        let buffers = [];
    
        // Process text sequence
        for (let i = 0; i < textSequence.length; ) {
            let matched = false;

            for (let len = textSequence.length - i; len > 0; len--) {
                const substring = textSequence.slice(i, i + len);
                if (mapping[substring]) {
		    try {
			const response = await fetch(mapping[substring]);
			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
			console.log("found \"" + substring + "\"");
			buffers.push(audioBuffer);
			i += len; // Advance by matched length
			matched = true;
			break;
		    } catch (err) {
			    console.error("Error decoding audio for \"${substring}\":", err)
		    }
	        }
            }

            if (!matched) {
		console.log("skipped \"" + textSequence[i] + "\"")
                i++;
            }
        }

        // Concatenate audio
        if (!buffers.length) {
            status.textContent = "No matching audio files found.";
            return null;
        }

        const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
        const outputBuffer = audioContext.createBuffer(
            buffers[0].numberOfChannels,
            totalLength,
            buffers[0].sampleRate
        );

        let offset = 0;
        for (const buffer of buffers) {
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                outputBuffer
		    .getChannelData(channel)
		    .set(buffer.getChannelData(channel), offset);
            }
            offset += buffer.length;
        }
	return outputBuffer;

    } catch (error) {
        console.error(error);
        status.textContent += "An error occurred: " + error.message;
	return null;
    }
}

document.getElementById("playButton").addEventListener("click", async () => {
    status.textContent = "";

    const outputBuffer = await generateAudio(); 
    // Play concatenated audio
    const source = audioContext.createBufferSource();

    source.buffer = outputBuffer;
    source.playbackRate.value = document.getElementById('playbackRate').value;
    source.connect(audioContext.destination);

    source.start();

    status.textContent = "Playing audio...";

});

// When the download button is clicked
document.getElementById("downloadButton").addEventListener("click", async () => {
    const outputBuffer = await generateAudio();
    if (!outputBuffer) return;

    // Prepare WAV data
    const wavData = await WavEncoder.encode({
        sampleRate: outputBuffer.sampleRate,
        channelData: Array.from({ length: outputBuffer.numberOfChannels }, (_, i) =>
            outputBuffer.getChannelData(i)
        ),
    });

    // Create a Blob for the WAV data
    const blob = new Blob([wavData], { type: "audio/wav" });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.wav";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url); // Clean up
    status.textContent = "Downloaded audio as output.wav.";
});

