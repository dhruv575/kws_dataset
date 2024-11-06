// src/createDuplicates.js

import { overlayBackgroundEffect } from './overlay';
import { distortPitchAndSpeed } from './distort';

export async function generateDuplicates(recordings) {
  console.log('generateDuplicates: Start');

  // Load background effects
  const backgroundEffects = await loadBackgroundEffects();
  console.log('generateDuplicates: Background effects loaded');

  if (backgroundEffects.length === 0) {
    console.error('generateDuplicates: No background effects loaded.');
    return [];
  }

  // Group recordings by keyword
  const recordingsByKeyword = groupRecordingsByKeyword(recordings);
  console.log('generateDuplicates: Recordings grouped by keyword');

  const newRecordings = [];

  // For each keyword
  for (const keyword in recordingsByKeyword) {
    console.log(`generateDuplicates: Processing keyword "${keyword}"`);
    const keywordRecordings = recordingsByKeyword[keyword];

    try {
      // Step 1: Overlay background effects onto 4 random recordings per effect
      const step1Recordings = await generateStep1Recordings(keywordRecordings, backgroundEffects);
      console.log(`generateDuplicates: Step 1 recordings for keyword "${keyword}" generated`);

      // Step 2: Distort pitch and speed of each recording
      const step2Recordings = await generateStep2Recordings(keywordRecordings);
      console.log(`generateDuplicates: Step 2 recordings for keyword "${keyword}" generated`);

      // Step 3: Overlay background effects and distort pitch and speed
      const step3Recordings = await generateStep3Recordings(keywordRecordings, backgroundEffects);
      console.log(`generateDuplicates: Step 3 recordings for keyword "${keyword}" generated`);

      newRecordings.push(...step1Recordings, ...step2Recordings, ...step3Recordings);
    } catch (error) {
      console.error(`generateDuplicates: Error processing keyword "${keyword}":`, error);
    }
  }

  console.log('generateDuplicates: Completed');
  return newRecordings;
}

async function loadBackgroundEffects() {
  console.log('loadBackgroundEffects: Start');
  const effectUrls = [
    '/effects/effect1.wav',
    '/effects/effect2.wav',
    '/effects/effect3.wav',
    '/effects/effect4.wav',
    '/effects/effect5.wav',
  ];

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const effects = await Promise.all(
    effectUrls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`loadBackgroundEffects: Loaded ${url}`);
        return audioBuffer;
      } catch (error) {
        console.error(`loadBackgroundEffects: Error loading ${url}:`, error);
        return null;
      }
    })
  );

  audioContext.close(); // Close the context when done

  // Filter out any null effects (in case of errors)
  const loadedEffects = effects.filter((effect) => effect !== null);
  console.log(`loadBackgroundEffects: Loaded ${loadedEffects.length} effects`);
  return loadedEffects;
}

function groupRecordingsByKeyword(recordings) {
  console.log('groupRecordingsByKeyword: Start');
  const grouped = {};
  recordings.forEach((recording) => {
    if (!grouped[recording.keyword]) {
      grouped[recording.keyword] = [];
    }
    grouped[recording.keyword].push(recording);
  });
  console.log('groupRecordingsByKeyword: Completed');
  return grouped;
}

function getRandomSamples(array, numSamples) {
  console.log(`getRandomSamples: Selecting ${numSamples} samples from array of length ${array.length}`);
  const shuffled = array.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numSamples);
}

async function generateStep1Recordings(recordings, backgroundEffects) {
  console.log('generateStep1Recordings: Start');
  const step1Recordings = [];
  const numSamplesPerEffect = 4;

  for (const effect of backgroundEffects) {
    console.log('generateStep1Recordings: Processing background effect');
    // Randomly sample 4 recordings
    const sampledRecordings = getRandomSamples(recordings, numSamplesPerEffect);
    for (const recording of sampledRecordings) {
      console.log(`generateStep1Recordings: Processing recording take ${recording.take}`);
      try {
        // Duplicate the recording
        const newBlob = await overlayBackgroundEffect(recording.blob, effect);
        const newRecording = {
          keyword: recording.keyword,
          take: `${recording.take}_bg`,
          blob: newBlob,
        };
        step1Recordings.push(newRecording);
      } catch (error) {
        console.error('generateStep1Recordings: Error processing recording:', error);
      }
    }
  }
  console.log('generateStep1Recordings: Completed');
  return step1Recordings;
}

async function generateStep2Recordings(recordings) {
  console.log('generateStep2Recordings: Start');
  const step2Recordings = [];

  for (const recording of recordings) {
    console.log(`generateStep2Recordings: Processing recording take ${recording.take}`);
    try {
      // Duplicate the recording
      const newBlob = await distortPitchAndSpeed(recording.blob);
      const newRecording = {
        keyword: recording.keyword,
        take: `${recording.take}_distort`,
        blob: newBlob,
      };
      step2Recordings.push(newRecording);
    } catch (error) {
      console.error('generateStep2Recordings: Error processing recording:', error);
    }
  }
  console.log('generateStep2Recordings: Completed');
  return step2Recordings;
}

async function generateStep3Recordings(recordings, backgroundEffects) {
  console.log('generateStep3Recordings: Start');
  const step3Recordings = [];
  const numSamplesPerEffect = 4;

  for (const effect of backgroundEffects) {
    console.log('generateStep3Recordings: Processing background effect');
    // Randomly sample 4 recordings
    const sampledRecordings = getRandomSamples(recordings, numSamplesPerEffect);
    for (const recording of sampledRecordings) {
      console.log(`generateStep3Recordings: Processing recording take ${recording.take}`);
      try {
        // Duplicate the recording
        const overlayedBlob = await overlayBackgroundEffect(recording.blob, effect);
        const newBlob = await distortPitchAndSpeed(overlayedBlob);
        const newRecording = {
          keyword: recording.keyword,
          take: `${recording.take}_bg_distort`,
          blob: newBlob,
        };
        step3Recordings.push(newRecording);
      } catch (error) {
        console.error('generateStep3Recordings: Error processing recording:', error);
      }
    }
  }
  console.log('generateStep3Recordings: Completed');
  return step3Recordings;
}
