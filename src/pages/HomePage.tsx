import { Link } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>🎮 AckoFit</h1>
        <p>Welcome to AckoFit Avatar Platform</p>
      </header>

      <main className="home-main">
        <div className="home-content">
          <div className="feature-card">
            <h2>3D Avatar Creator</h2>
            <p>Create and interact with personalized 3D avatars</p>
            <Link to="/avatar" className="cta-button">
              Go to Avatar →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

