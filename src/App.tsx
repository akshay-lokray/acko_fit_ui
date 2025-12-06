import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AvatarPage from './pages/AvatarPage';
import { MultiStepForm } from '@/components/MultiStepForm'
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MultiStepForm />} />
        <Route path="/avatar" element={<AvatarPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
