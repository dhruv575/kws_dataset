import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import JSZip from 'jszip';

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
  max-width: 500px;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 1.5rem;
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
    setKeywordRecordingsCount(Array(keywordsArray.length).fill(0)); // Initialize counts to zero
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
      const mimeType = 'audio/ogg; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        alert('Your browser does not support recording in OGG format.');
        return;
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const currentKeyword = keywords[currentKeywordIndex];
          const updatedCount = keywordRecordingsCount[currentKeywordIndex] + 1;

          // Add the new recording
          setRecordings((prev) => [
            ...prev,
            {
              keyword: currentKeyword,
              take: updatedCount,
              blob: e.data,
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
              // If we've finished all keywords, mark as complete
              setIsComplete(true);
              setSubmitted(false);
              stopStream();
            } else {
              // Move to the next keyword immediately
              setCurrentKeywordIndex((prevIndex) => prevIndex + 1);
            }
          }
        }
      };

      mediaRecorderRef.current.onstop = () => setIsRecording(false);

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    recordings.forEach((recording) => {
      const fileName = `${recording.keyword}_${recording.take}.ogg`;
      zip.file(fileName, recording.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keyword_recordings.zip';
    a.click();
    window.URL.revokeObjectURL(url);
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
              <Button download onClick={handleDownload} style={{ marginTop: '1rem' }}>
                Download Recordings ({recordings.length} files)
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