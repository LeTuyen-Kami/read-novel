import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NovelChaptersPage } from './pages/NovelChaptersPage';
import { ChapterDetailPage } from './pages/ChapterDetailPage';

// Get base path from environment or use '/'
const basePath = import.meta.env.BASE_URL || '/';

function App() {
  return (
    <BrowserRouter basename={basePath}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/novel/:novelId" element={<NovelChaptersPage />} />
        <Route path="/novel/:novelId/chapter/:chapterId" element={<ChapterDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
