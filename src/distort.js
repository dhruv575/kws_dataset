// src/distort.js

import { audioBufferToWavBlob } from './audioUtils';

export async function distortPitchAndSpeed(recordingBlob) {
  console.log('distortPitchAndSpeed: Start');
  try {
    // Decode the recording blob
    const recordingArrayBuffer = await recordingBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const recordingAudioBuffer = await audioContext.decodeAudioData(recordingArrayBuffer);

    const sampleRate = audioContext.sampleRate;
    const playbackRate = chooseRandomPlaybackRate();

    // Calculate the new length based on playback rate
    const newLength = Math.ceil(recordingAudioBuffer.length / playbackRate);

    const offlineContext = new OfflineAudioContext(
      recordingAudioBuffer.numberOfChannels,
      newLength,
      sampleRate
    );

    // Create buffer source for recording
    const recordingSource = offlineContext.createBufferSource();
    recordingSource.buffer = recordingAudioBuffer;
    recordingSource.playbackRate.value = playbackRate;

    // Connect source to destination
    recordingSource.connect(offlineContext.destination);

    // Start source
    recordingSource.start();

    // Render
    const renderedBuffer = await offlineContext.startRendering();

    // Encode renderedBuffer to WAV Blob
    const wavBlob = audioBufferToWavBlob(renderedBuffer);

    audioContext.close();

    console.log('distortPitchAndSpeed: Completed');
    return wavBlob;
  } catch (error) {
    console.error('distortPitchAndSpeed: Error:', error);
    throw error;
  }
}

function chooseRandomPlaybackRate() {
  // Randomly select playbackRate between 0.7 and 0.9 or 1.1 and 1.3
  let playbackRate;
  if (Math.random() < 0.5) {
    // Speed up
    playbackRate = 1.1 + Math.random() * 0.2; // between 1.1 and 1.3
  } else {
    // Slow down
    playbackRate = 0.7 + Math.random() * 0.2; // between 0.7 and 0.9
  }
  console.log(`chooseRandomPlaybackRate: Selected playbackRate ${playbackRate.toFixed(2)}`);
  return playbackRate;
}
