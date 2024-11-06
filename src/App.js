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

const RecordingCount = styled.div`
  color: #666;
  font-size: 0.9rem;
  margin-top: 1rem;
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


const KeywordRecorder = () => {
  const [words, setWords] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [stream, setStream] = useState(null);
  const [keywordRecordingsCount, setKeywordRecordingsCount] = useState([]);
  const [isGeneratingDuplicates, setIsGeneratingDuplicates] = useState(false);
  const mediaRecorderRef = useRef(null);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSubmit = () => {
    const keywordsArray = words.split(',').map((word) => word.trim()).filter(Boolean);
    setKeywords(keywordsArray);
    setSubmitted(true);
    setIsComplete(false);
    setRecordings([]);
    setKeywordRecordingsCount(Array(keywordsArray.length).fill(0));
    setCurrentKeywordIndex(0);
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
  
    const desiredAmount = parseInt(amount);
  
    if (!isRecording && keywordRecordingsCount[currentKeywordIndex] < desiredAmount) {
      // Start recording without specifying a mimeType
      mediaRecorderRef.current = new MediaRecorder(stream);
  
      const audioChunks = [];
  
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };
  
      mediaRecorderRef.current.onstop = async () => {
        // Combine chunks into a single Blob
        const audioBlob = new Blob(audioChunks);
  
        // Convert to WAV format
        const wavBlob = await convertToWav(audioBlob);
  
        const currentKeyword = keywords[currentKeywordIndex];
        const updatedCount = keywordRecordingsCount[currentKeywordIndex] + 1;
  
        // Add the new recording to the state
        setRecordings((prev) => [
          ...prev,
          {
            keyword: currentKeyword,
            take: updatedCount,
            blob: wavBlob,
          },
        ]);
  
        // Update the count for the current keyword
        setKeywordRecordingsCount((prevCounts) => {
          const updatedCounts = [...prevCounts];
          updatedCounts[currentKeywordIndex] = updatedCount;
          return updatedCounts;
        });
  
        // Check if we've reached the desired amount for the current keyword
        if (updatedCount >= desiredAmount) {
          if (currentKeywordIndex >= keywords.length - 1) {
            // All keywords recorded
            setIsComplete(true);
            setSubmitted(false);
            stopStream();
          } else {
            // Move to the next keyword
            setCurrentKeywordIndex((prevIndex) => prevIndex + 1);
          }
        }
  
        setIsRecording(false);
      };
  
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else if (isRecording) {
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
  
      allRecordings.push(...duplicates);
  
      // Group recordings by keyword
      const recordingsByKeyword = {};
      allRecordings.forEach((recording) => {
        const { keyword } = recording;
        if (!recordingsByKeyword[keyword]) {
          recordingsByKeyword[keyword] = [];
        }
        recordingsByKeyword[keyword].push(recording);
      });
  
      const zip = new JSZip();
  
      // For each keyword, sort recordings and assign sequential numbers
      Object.keys(recordingsByKeyword).forEach((keyword) => {
        const keywordRecordings = recordingsByKeyword[keyword];
  
        // Sort recordings based on original take number
        keywordRecordings.sort((a, b) => {
          const extractNumber = (take) => {
            const match = take.toString().match(/^(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          };
  
          const aNum = extractNumber(a.take);
          const bNum = extractNumber(b.take);
  
          return aNum - bNum;
        });
  
        // Assign sequential numbers and add files to the ZIP
        keywordRecordings.forEach((recording, index) => {
          const fileNumber = index + 1; // Start numbering from 1
          const fileName = `${keyword}_${fileNumber}.wav`;
          zip.file(fileName, recording.blob);
        });
      });
  
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keyword_recordings.zip';
      a.click();
      window.URL.revokeObjectURL(url);
  
      setIsGeneratingDuplicates(false);
    } catch (error) {
      console.error('handleDownload: Error generating duplicates:', error);
      alert('An error occurred while generating duplicates. Please check the console for details.');
      setIsGeneratingDuplicates(false);
    }
  };
  

  const currentKeyword = keywords[currentKeywordIndex];
  const recordingsForKeyword = keywordRecordingsCount[currentKeywordIndex];

  const progress = submitted
    ? `Recording ${recordingsForKeyword + 1} of ${amount} for "${currentKeyword}"`
    : '';

  return (
    <Container>
      <Card>
        <Title>Keyword Dataset Recorder</Title>
        <p>
          After you record X amount of takes, the tool will automatically generate more duplicates. For each keyword, there will be 20 more samples created with background effects, the same amount of samples as recorded with distortions applied, and then another 20 samples with background effects and distorions. The output will be a zip folder of .wav files.
        </p>
        {!submitted ? (
          <>
            <InputGroup>
              <Label>Keywords (comma-separated)</Label>
              <Input
                type="text"
                placeholder="yes, no, maybe"
                value={words}
                onChange={(e) => setWords(e.target.value)}
              />
            </InputGroup>

            <InputGroup>
              <Label>Recordings per keyword</Label>
              <Input
                type="number"
                min="1"
                placeholder="3"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </InputGroup>

            <Button onClick={handleSubmit} disabled={!words || !amount}>
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
                  ? 'Generating Duplicates...'
                  : `Download Recordings`}
              </Button>
            )}
          </>
        ) : (
          <>
            <RecordingInfo>
              <CurrentWord>"{currentKeyword}"</CurrentWord>
              <Progress>{progress}</Progress>
            </RecordingInfo>

            <Button large recording={isRecording} onClick={toggleRecording}>
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>

            <RecordingCount>
              {recordings.length} recording{recordings.length !== 1 ? 's' : ''} saved
            </RecordingCount>
          </>
        )}
      </Card>
    </Container>
  );
};

export default KeywordRecorder;