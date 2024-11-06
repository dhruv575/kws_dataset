import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const VoiceBoxContainer = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  text-align: center;
  width: 100%;
  max-width: 400px;
`;

const RecordButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  background-color: #28a745;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
`;

const VoiceInputBox = ({ mediaRecorder, isRecording }) => {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (mediaRecorder) {
      mediaRecorder.onstart = () => setRecording(true);
      mediaRecorder.onstop = () => setRecording(false);
    }
  }, [mediaRecorder]);

  const startRecording = () => {
    if (mediaRecorder && !recording) {
      mediaRecorder.start();
      console.log("Recording started...");

      // Automatically stop recording after 1 second
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          console.log("Recording stopped automatically after 1 second.");
        }
      }, 1000);
    } else {
      console.log("Already recording...");
    }
  };

  return (
    <VoiceBoxContainer>
      <p>Voice Input (Microphone)</p>
      <RecordButton onClick={startRecording} disabled={recording}>
        {recording ? "Recording..." : "Start Recording"}
      </RecordButton>
    </VoiceBoxContainer>
  );
};

export default VoiceInputBox;
