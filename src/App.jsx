import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './pages/Dashboard'
import TrainingPlan from './pages/TrainingPlan'
import Trends from './pages/Trends'
import Settings from './pages/Settings'
import WhoopCallback from './pages/WhoopCallback'

function App() {
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-50 font-inter">
      <main className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan" element={<TrainingPlan />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/whoop/callback" element={<WhoopCallback />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default App
