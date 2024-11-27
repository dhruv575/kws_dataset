import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import JSZip from 'jszip';
import { generateDuplicates } from './createDuplicates';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  padding: 1rem;
  background-image: url('/logo512.png');
  background-repeat: repeat;
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  max-width: 700px;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: bold;
`;

const InputGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  
  &:focus {
    outline: none;
    border-color: #0066cc;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: ${props => props.large ? "1rem" : "0.5rem"};
  background-color: ${props => {
    if (props.download) return "#28a745";
    return props.recording ? "#dc3545" : "#0066cc";
  }};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: ${props => props.large ? "1.1rem" : "1rem"};
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: ${props => props.download ? "0.5rem" : "0"};
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background-color: ${props => {
      if (props.download) return "#218838";
      return props.recording ? "#bb2d3b" : "#0052a3";
    }};
  }
`;

const RecordingInfo = styled.div`
  text-align: center;
  margin: 1rem 0;
`;

const CurrentWord = styled.div`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const Progress = styled.div`
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

// Helper functions to convert audio data to WAV format
async function convertToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const wavBuffer = audioBufferToWav(audioBuffer);
  const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

  audioContext.close();

  return wavBlob;
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
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

const predefinedWords = [
  "Hello", "Thank", "Good", "Bad", "Happy", "Sad", "Okay", "Sure",
  "No", "Yes", "Please", "Sorry", "Great", "Awful", "Love", "Hate",
  "Nice", "Angry", "Welcome", "Maybe"
];

const predefinedClasses = ["Positive", "Negative", "Neutral"];
const recordingsPerClass = 20;

const KeywordRecorder = () => {
  const [submitted, setSubmitted] = useState(false);
  const [currentClassIndex, setCurrentClassIndex] = useState(0);
  const [recordingCount, setRecordingCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [stream, setStream] = useState(null);
  const [name, setName] = useState('');
  const [isGeneratingDuplicates, setIsGeneratingDuplicates] = useState(false);
  const mediaRecorderRef = useRef(null);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    setSubmitted(true);
    setIsComplete(false);
    setRecordings([]);
    setCurrentClassIndex(0);
    setRecordingCount(0);
    stopStream();

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((newStream) => {
        setStream(newStream);
      })
      .catch((error) => {
        console.error("Microphone access denied:", error);
        alert("Please allow microphone access to record keywords.");
        setSubmitted(false);
      });
  };

  const toggleRecording = () => {
    if (!stream) return;

    if (!isRecording) {
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks);
        const wavBlob = await convertToWav(audioBlob);

        const currentClass = predefinedClasses[currentClassIndex];
        const currentWord = predefinedWords[recordingCount % predefinedWords.length];

        setRecordings((prev) => [
          ...prev,
          { class: currentClass, word: currentWord, blob: wavBlob, keyword: currentClass, take: recordingCount + 1 },
        ]);

        const nextRecordingCount = recordingCount + 1;
        if (nextRecordingCount < recordingsPerClass) {
          setRecordingCount(nextRecordingCount);
        } else if (currentClassIndex < predefinedClasses.length - 1) {
          setCurrentClassIndex((prev) => prev + 1);
          setRecordingCount(0);
        } else {
          setIsComplete(true);
          setSubmitted(false);
          stopStream();
        }

        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDownload = async () => {
    setIsGeneratingDuplicates(true);

    try {
      const allRecordings = [...recordings];
    
      // Generate duplicates
      const duplicates = await generateDuplicates(recordings);
    
      console.log("Original Recordings:", recordings);
      console.log("Duplicates:", duplicates);
    
      // Ensure duplicates have valid class properties
      duplicates.forEach((duplicate) => {
        if (!duplicate.class) {
          duplicate.class = predefinedClasses.find((cls) => cls === duplicate.keyword) || "Unknown";
        }
      });
    
      allRecordings.push(...duplicates);
    
      console.log("All Recordings:", allRecordings);
    
      const zip = new JSZip();
    
      // Group recordings by class
      predefinedClasses.forEach((className, classIndex) => {
        const classRecordings = allRecordings.filter(
          (rec) => rec.class === className || !rec.class
        );
    
        classRecordings.forEach((recording, index) => {
          const fileNumber = index + 1;
          zip.file(`${classIndex + 1}_${fileNumber}.wav`, recording.blob);
        });
      });
    
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_collected_data.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    
      setIsGeneratingDuplicates(false);
    } catch (error) {
      console.error("Error generating duplicates:", error);
      alert("An error occurred while generating duplicates. Please check the console for details.");
      setIsGeneratingDuplicates(false);
    }    
  };

  const currentClass = predefinedClasses[currentClassIndex];
  const currentWord = predefinedWords[recordingCount % predefinedWords.length];
  const progress = `Recording ${recordingCount + 1} of ${recordingsPerClass} for "${currentClass}" class`;

  return (
    <Container>
      <Card>
        <Title>Spoken Words Dataset Recorder</Title>
        <p>
          Thanks so much for helping with our project! We are working on building tiny machine learning powered wearables to help occupational therapists train students with autism better understand conversational cues.
        </p>
        <p>
          We are collecting speech data of people saying the same 20 words with Positive, Negative, and Neutral tones. We ask that when you run the <strong>Positive</strong> recordings, you speak with a smile on your face. For the <strong>Negative</strong> recordings, speak with a slight frown (or introduce negativity/anger however else you'd like). For <strong>Neutral</strong> recordings, we ask that you try and inject as little emotion into your speech as possible.
        </p>
        <p>
          This whole process shouldn't take more than 2 minutes. Please try and speak loudly! When you're done, please extract your folder and upload the folder to <a href="https://drive.google.com/drive/folders/1URP6nvmFNe-MytEl13n69sXRAaG-rKtR?usp=sharing" target="_blank" rel="noopener noreferrer">this Google Drive link</a> or email to dhruvgup@seas.upenn.edu.
        </p>
        {!submitted ? (
          <>
            <InputGroup>
              <Label>Your Name</Label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </InputGroup>

            <Button onClick={handleSubmit} disabled={!name.trim()}>
              Start Recording Session
            </Button>

            {isComplete && (
              <Button
                download
                onClick={handleDownload}
                disabled={isGeneratingDuplicates}
                style={{ marginTop: '1rem' }}
              >
                {isGeneratingDuplicates
                  ? "Generating Duplicates..."
                  : `Download Recordings`}
              </Button>
            )}
          </>
        ) : (
          <>
            <RecordingInfo>
              <CurrentWord>"{currentWord}"</CurrentWord>
              <Progress>{progress}</Progress>
            </RecordingInfo>
            <Button large recording={isRecording} onClick={toggleRecording}>
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
          </>
        )}
      </Card>
    </Container>
  );
};

export default KeywordRecorder;