import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './pages/Dashboard'
import TrainingPlan from './pages/TrainingPlan'
import Trends from './pages/Trends'
import Settings from './pages/Settings'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-50 font-inter">
      <main className="pb-20">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan" element={<TrainingPlan />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default App
