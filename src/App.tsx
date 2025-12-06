import { useState } from 'react';
import AvatarScene from './components/AvatarScene';
import TextToSpeechInput from './components/TextToSpeechInput';
import './App.css';

function App() {
  const [textToSpeak, setTextToSpeak] = useState<string>('');

  const handleTextSubmit = (text: string) => {
    setTextToSpeak(text);
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
            <AvatarScene textToSpeak={textToSpeak} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
