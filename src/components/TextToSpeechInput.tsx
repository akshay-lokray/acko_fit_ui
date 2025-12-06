import { useState } from 'react';
import type { VoiceType } from '../types/voice';
import './TextToSpeechInput.css';

interface TextToSpeechInputProps {
  onTextSubmit: (text: string, voiceType: VoiceType) => void;
  isLoading?: boolean;
}

export default function TextToSpeechInput({ onTextSubmit, isLoading }: TextToSpeechInputProps) {
  const [text, setText] = useState('');
  const [voiceType, setVoiceType] = useState<VoiceType>('female');
  const [isSupported, setIsSupported] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && 'speechSynthesis' in window) {
      onTextSubmit(text.trim(), voiceType);
    } else {
      setIsSupported(false);
      alert('Text-to-speech is not supported in your browser.');
    }
  };

  const handleClear = () => {
    setText('');
    setIsSupported(true);
  };

  return (
    <div className="text-to-speech-input">
      <h3>Make Avatar Speak</h3>
      <p className="input-description">Select avatar and voice type, then enter text to speak</p>
      
      <div className="voice-selection">
        <label htmlFor="voice-type">Avatar & Voice Type:</label>
        <div className="voice-options">
          <button
            type="button"
            className={`voice-btn ${voiceType === 'female' ? 'active' : ''}`}
            onClick={() => setVoiceType('female')}
          >
            👩 Female Avatar
          </button>
          <button
            type="button"
            className={`voice-btn ${voiceType === 'male' ? 'active' : ''}`}
            onClick={() => setVoiceType('male')}
          >
            👨 Male Avatar
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="speech-form">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text here... (e.g., 'Hello! Welcome to AckoFit.')"
          className="speech-textarea"
          rows={4}
          disabled={isLoading}
        />
        
        <div className="speech-actions">
          <button 
            type="submit" 
            className="speak-btn"
            disabled={!text.trim() || isLoading}
          >
            {isLoading ? 'Processing...' : '🗣️ Speak'}
          </button>
          
          {text && (
            <button 
              type="button" 
              className="clear-btn"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {!isSupported && (
        <p className="error-text">
          ⚠️ Text-to-speech is not supported in your browser.
        </p>
      )}
    </div>
  );
}

