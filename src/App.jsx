import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './pages/Dashboard'
import TrainingPlan from './pages/TrainingPlan'
import Trends from './pages/Trends'
import Settings from './pages/Settings'

export default function App() {
  return (
    <div className="min-h-screen bg-brand-bg">
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
