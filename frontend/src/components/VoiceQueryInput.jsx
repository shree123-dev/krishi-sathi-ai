import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';

export default function VoiceQueryInput({ voiceTranscript, setVoiceTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setFeedbackMsg('Listening to your query... Speak clearly into your microphone.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setFeedbackMsg('Voice query captured successfully.');
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
        setFeedbackMsg(`Microphone prompt: ${event.error === 'not-allowed' ? 'Access denied' : 'Tap to try again'}`);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setRecognitionSupported(false);
    }
  }, [setVoiceTranscript]);

  const toggleRecording = () => {
    if (!recognitionSupported) {
      // Friendly simulation fallback for browsers without Web Speech
      if (isRecording) {
        setIsRecording(false);
      } else {
        setIsRecording(true);
        setFeedbackMsg('Simulating voice input...');
        setTimeout(() => {
          setVoiceTranscript('The edges of the lower leaves are showing yellow discoloration and drying out prematurely.');
          setIsRecording(false);
          setFeedbackMsg('Sample voice transcript generated.');
        }, 1500);
      }
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Speech recognition start failed', err);
      }
    }
  };

  return (
    <div className={`option-box ${voiceTranscript || isRecording ? 'active' : ''}`}>
      <div className="option-box-header">
        <span className="option-title">
          <Volume2 size={18} style={{ color: 'var(--primary-600)' }} />
          Option 3: Voice Query
        </span>
        {isRecording && (
          <span style={{ fontSize: '0.75rem', color: 'var(--red-500)', fontWeight: 700 }}>
            ● Recording Audio...
          </span>
        )}
      </div>

      <div className="voice-input-wrapper">
        <button
          type="button"
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          id="btn-voice-query"
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          {isRecording ? 'Stop Recording' : 'Speak Your Query'}
        </button>

        {feedbackMsg && (
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
            {feedbackMsg}
          </span>
        )}
      </div>

      {voiceTranscript && (
        <div className="voice-transcript-box">
          <strong>Transcribed Audio:</strong> "{voiceTranscript}"
        </div>
      )}
    </div>
  );
}
