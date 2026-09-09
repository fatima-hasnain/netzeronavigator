import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SurrogatePage from './pages/SurrogatePage'
import ChartPage from './pages/ChartPage'

export default function App() {
  return (
    <BrowserRouter>
      <div data-theme="midnight" className="dashboard-shell min-h-screen antialiased">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/s/:surrogateId" element={<SurrogatePage />} />
          <Route path="/s/:surrogateId/chart" element={<ChartPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
