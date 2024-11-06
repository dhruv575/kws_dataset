// src/audioUtils.js

export function audioBufferToWavBlob(audioBuffer) {
    const wavBuffer = audioBufferToWav(audioBuffer);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    return wavBlob;
  }
  
  export function audioBufferToWav(audioBuffer, opt = {}) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = opt.float32 ? 3 : 1; // 3 = IEEE float, 1 = PCM
    const bitDepth = format === 3 ? 32 : 16;
  
    let result;
    if (numChannels === 2) {
      result = interleave(
        audioBuffer.getChannelData(0),
        audioBuffer.getChannelData(1)
      );
    } else {
      result = audioBuffer.getChannelData(0);
    }
  
    return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
  }
  
  function interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
  
    let index = 0;
    let inputIndex = 0;
  
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }
  
  function encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
  
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);
  
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (PCM) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate */
    view.setUint32(28, sampleRate * blockAlign, true);
    /* block align */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true);
  
    floatTo16BitPCM(view, 44, samples);
  
    return buffer;
  }
  
  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      output.setInt16(offset, s, true);
    }
  }
  
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  