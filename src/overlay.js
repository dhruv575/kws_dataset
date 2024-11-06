// src/overlay.js

import { audioBufferToWavBlob } from './audioUtils';

export async function overlayBackgroundEffect(recordingBlob, effectAudioBuffer) {
  console.log('overlayBackgroundEffect: Start');
  try {
    // Decode the recording blob
    const recordingArrayBuffer = await recordingBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const recordingAudioBuffer = await audioContext.decodeAudioData(recordingArrayBuffer);

    const maxDuration = Math.max(recordingAudioBuffer.duration, effectAudioBuffer.duration);
    const sampleRate = audioContext.sampleRate;
    const length = Math.ceil(maxDuration * sampleRate);

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
    effectSource.buffer = effectAudioBuffer;

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
