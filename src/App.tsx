import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ChapterDetailPage } from "./pages/ChapterDetailPage";
import { HomePage } from "./pages/HomePage";
import { NovelChaptersPage } from "./pages/NovelChaptersPage";
import { TestEdgeTTSPage } from "./pages/TestEdgeTTSPage";
import { TestSplitTextPage } from "./pages/TestSplitTextPage";

// Get base path from environment or use '/'
const basePath = import.meta.env.BASE_URL || "/";

function App() {
	useEffect(() => {
		//disabled body scroll
		document.body.style.overflow = "hidden";
	}, []);

	return (
		<BrowserRouter basename={basePath}>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/test" element={<TestEdgeTTSPage />} />
				<Route path="/test-split" element={<TestSplitTextPage />} />
				<Route path="/novel/:novelId" element={<NovelChaptersPage />} />
				<Route
					path="/novel/:novelId/chapter/:chapterId"
					element={<ChapterDetailPage />}
				/>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
