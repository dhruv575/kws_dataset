// src/overlay.js

import { audioBufferToWavBlob } from './audioUtils';

export async function overlayBackgroundEffect(recordingBlob, effectAudioBuffer) {
  console.log('overlayBackgroundEffect: Start');
  try {
    // Decode the recording blob
    const recordingArrayBuffer = await recordingBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const recordingAudioBuffer = await audioContext.decodeAudioData(recordingArrayBuffer);

    // Calculate the max duration as the recording duration
    const recordingDuration = recordingAudioBuffer.duration;
    const sampleRate = audioContext.sampleRate;
    const length = Math.ceil(recordingDuration * sampleRate);

    // Truncate the effectAudioBuffer to match the recording's duration
    const truncatedEffectAudioBuffer = audioContext.createBuffer(
      effectAudioBuffer.numberOfChannels,
      length,
      sampleRate
    );

    for (let channel = 0; channel < effectAudioBuffer.numberOfChannels; channel++) {
      const originalChannelData = effectAudioBuffer.getChannelData(channel);
      const truncatedChannelData = truncatedEffectAudioBuffer.getChannelData(channel);
      truncatedChannelData.set(originalChannelData.subarray(0, length));
    }

    const offlineContext = new OfflineAudioContext(
      recordingAudioBuffer.numberOfChannels,
      length,
      sampleRate
    );

    // Create buffer source for recording
    const recordingSource = offlineContext.createBufferSource();
    recordingSource.buffer = recordingAudioBuffer;

    // Create gain node for recording
    const recordingGainNode = offlineContext.createGain();
    recordingGainNode.gain.value = 1.0; // 100% volume

    // Connect recording source through gain node
    recordingSource.connect(recordingGainNode).connect(offlineContext.destination);

    // Create buffer source for effect
    const effectSource = offlineContext.createBufferSource();
    effectSource.buffer = truncatedEffectAudioBuffer;

    // Create gain node for effect
    const effectGainNode = offlineContext.createGain();

    // Randomly select volume between 30% and 70%
    const effectVolume = Math.random() * 0.4 + 0.3; // between 0.3 and 0.7
    effectGainNode.gain.value = effectVolume;

    // Connect effect source through gain node
    effectSource.connect(effectGainNode).connect(offlineContext.destination);

    // Start sources
    recordingSource.start();
    effectSource.start();

    // Render
    const renderedBuffer = await offlineContext.startRendering();

    // Encode renderedBuffer to WAV Blob
    const wavBlob = audioBufferToWavBlob(renderedBuffer);

    audioContext.close();

    console.log('overlayBackgroundEffect: Completed');
    return wavBlob;
  } catch (error) {
    console.error('overlayBackgroundEffect: Error:', error);
    throw error;
  }
}
