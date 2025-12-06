import { useState } from 'react';
import AvatarScene from './components/AvatarScene';
import TextToSpeechInput from './components/TextToSpeechInput';
import type { VoiceType } from './types/voice';
import './App.css';

function App() {
  const [textToSpeak, setTextToSpeak] = useState<string>('');
  const [voiceType, setVoiceType] = useState<VoiceType>('female');

  const handleTextSubmit = (text: string, voice: VoiceType) => {
    setTextToSpeak(text);
    setVoiceType(voice);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎮 AckoFit Avatar</h1>
        <p>Interactive 3D Avatar with Viseme-based Lip Sync</p>
      </header>

      <main className="app-main">
        <div className="app-content">
          <div className="form-section">
            <TextToSpeechInput onTextSubmit={handleTextSubmit} />
          </div>
          
          <div className="viewer-section">
            <AvatarScene textToSpeak={textToSpeak} voiceType={voiceType} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
