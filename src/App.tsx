import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SurrogatePage from './pages/SurrogatePage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/s/:surrogateId" element={<SurrogatePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
