import { useState } from 'react';
import './TextToSpeechInput.css';

interface TextToSpeechInputProps {
  onTextSubmit: (text: string) => void;
  isLoading?: boolean;
}

export default function TextToSpeechInput({ onTextSubmit, isLoading }: TextToSpeechInputProps) {
  const [text, setText] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && 'speechSynthesis' in window) {
      onTextSubmit(text.trim());
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
      <p className="input-description">Enter text for the avatar to speak</p>
      
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

