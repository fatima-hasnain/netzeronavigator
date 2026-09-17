import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SurrogatePage from './pages/SurrogatePage'
import ChartPage from './pages/ChartPage'
import { SiteHeader } from './components/SiteHeader'

export default function App() {
  return (
    <BrowserRouter>
      <div data-theme="graphite" className="dashboard-shell min-h-screen antialiased">
        <SiteHeader />
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
