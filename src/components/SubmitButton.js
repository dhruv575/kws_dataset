import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 1rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
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
  background-color: ${props => props.recording ? "#dc3545" : "#0066cc"};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: ${props => props.large ? "1.1rem" : "1rem"};
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background-color: ${props => props.recording ? "#bb2d3b" : "#0052a3"};
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
  const [currentRecordingCount, setCurrentRecordingCount] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordings, setRecordings] = useState([]);

  const handleSubmit = () => {
    const keywordsArray = words.split(',').map(word => word.trim()).filter(word => word);
    setKeywords(keywordsArray);
    setSubmitted(true);
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const recording = {
              keyword: keywords[currentKeywordIndex],
              take: currentRecordingCount,
              blob: e.data
            };
            setRecordings(prev => [...prev, recording]);
          }
        };

        recorder.onstop = () => {
          setIsRecording(false);
          handleNextRecording();
        };

        setMediaRecorder(recorder);
      })
      .catch(error => {
        console.error("Microphone access denied:", error);
        alert("Please allow microphone access to record keywords.");
      });
  };

  const handleNextRecording = () => {
    if (currentRecordingCount < parseInt(amount)) {
      setCurrentRecordingCount(prev => prev + 1);
    } else if (currentKeywordIndex < keywords.length - 1) {
      setCurrentKeywordIndex(prev => prev + 1);
      setCurrentRecordingCount(1);
    } else {
      setSubmitted(false);
      setCurrentKeywordIndex(0);
      setCurrentRecordingCount(1);
      alert("All recordings completed!");
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      mediaRecorder.start();
      setIsRecording(true);
    } else {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const progress = submitted ? 
    `Word ${currentKeywordIndex + 1} of ${keywords.length}, Recording ${currentRecordingCount} of ${amount}` : '';

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

            <Button 
              onClick={handleSubmit}
              disabled={!words.trim() || !amount}
            >
              Start Recording Session
            </Button>
          </>
        ) : (
          <>
            <RecordingInfo>
              <CurrentWord>"{keywords[currentKeywordIndex]}"</CurrentWord>
              <Progress>{progress}</Progress>
            </RecordingInfo>

            <Button
              large
              recording={isRecording}
              onClick={toggleRecording}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>

            {recordings.length > 0 && (
              <RecordingCount>
                {recordings.length} recording{recordings.length !== 1 ? 's' : ''} saved
              </RecordingCount>
            )}
          </>
        )}
      </Card>
    </Container>
  );
};

export default KeywordRecorder;