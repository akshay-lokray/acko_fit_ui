import { useState } from 'react';
import { Link } from 'react-router-dom';
import AvatarScene from '../components/AvatarScene';
import TextToSpeechInput from '../components/TextToSpeechInput';
import type { VoiceType } from '../types/voice';
import '../App.css';

export default function AvatarPage() {
  const [textToSpeak, setTextToSpeak] = useState<string>('');
  const [voiceType, setVoiceType] = useState<VoiceType>('female');

  const handleTextSubmit = (text: string, voice: VoiceType) => {
    setTextToSpeak(text);
    setVoiceType(voice);
  };

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>🎮 AckoFit Avatar</h1>
        <p>Interactive 3D Avatar with Viseme-based Lip Sync</p>
      </header>

      <main className="app-main">
        <div className="app-content">
          <div className="form-section">
            <TextToSpeechInput onTextSubmit={handleTextSubmit} />
          </div>
        </div>
      </main>

      {/* Avatar Section - Fixed at bottom right */}
      <div className="avatar-container-form">
        <AvatarScene textToSpeak={textToSpeak} voiceType={voiceType} />
      </div>
    </div>
  );
}

