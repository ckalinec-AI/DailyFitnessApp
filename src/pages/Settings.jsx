import { useState } from 'react'
import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { getItem, setItem, removeItem, clearAll } from '../lib/storage'
import { PLAN_START_DATE_DEFAULT, RACE_DAY_OFFSET, getDayOffset } from '../lib/trainingPlan'
import Card from '../components/ui/Card'
import { useWhoop } from '../hooks/useWhoop'

const RACE_DATE = '2026-08-01'

function getDaysToRace(planStartDate) {
  const today = startOfDay(new Date())
  const raceDay = startOfDay(new Date(RACE_DATE + 'T00:00:00'))
  const diff = differenceInCalendarDays(raceDay, today)
  return diff
}

export default function Settings() {
  const [planStartDate, setPlanStartDate] = useState(() => getItem('planStartDate', PLAN_START_DATE_DEFAULT))
  const [weightUnit, setWeightUnit] = useState(() => getItem('weightUnit', 'lbs'))
  const [confirmClear, setConfirmClear] = useState(false)
  const whoop = useWhoop()

  const daysToRace = getDaysToRace(planStartDate)

  const handleConnect = whoop.connect

  const handleDisconnect = () => {
    whoop.disconnect()
  }

  const handleClearAll = () => {
    clearAll()
    whoop.disconnect()
    setPlanStartDate(PLAN_START_DATE_DEFAULT)
    setWeightUnit('lbs')
    setConfirmClear(false)
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>

      {/* Training Plan section */}
      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Training Plan</p>
        <Card variant="default" padding="none">
          <div className="px-4">
            {/* Plan start date */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">Plan Start Date</p>
                <p className="text-xs text-gray-500">When your training block began</p>
              </div>
              <input
                type="date"
                value={planStartDate}
                onChange={e => { setPlanStartDate(e.target.value); setItem('planStartDate', e.target.value) }}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
              />
            </div>

            <div className="border-t border-white/5" />

            {/* Race date (read-only) */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">Race Day</p>
                <p className="text-xs text-gray-500">47-Mile Road Race</p>
              </div>
              <p className="text-sm font-semibold text-yellow-400">Aug 1, 2026</p>
            </div>

            <div className="border-t border-white/5" />

            {/* Days to race countdown */}
            <div className="flex items-center justify-between py-3">
              <p className="text-sm font-medium text-white">Days to Race</p>
              <p className="text-sm font-bold text-blue-400">{daysToRace > 0 ? daysToRace : 'Race complete!'}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Whoop section */}
      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Whoop</p>
        <Card variant="default" padding="none">
          <div className="px-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">Whoop</p>
                <p className="text-xs text-gray-500">{whoop.connected ? 'Connected' : 'Not connected'}</p>
              </div>
              {whoop.connected ? (
                <button onClick={handleDisconnect} className="text-sm text-red-400 font-medium hover:text-red-300 transition-colors">
                  Disconnect
                </button>
              ) : (
                <button onClick={handleConnect} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
                  Connect
                </button>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* Preferences section */}
      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Preferences</p>
        <Card variant="default" padding="none">
          <div className="px-4">
            <div className="flex items-center justify-between py-3">
              <p className="text-sm font-medium text-white">Weight Unit</p>
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                {['lbs', 'kg'].map(unit => (
                  <button
                    key={unit}
                    onClick={() => { setWeightUnit(unit); setItem('weightUnit', unit) }}
                    className={[
                      'px-3 py-1 rounded-md text-sm font-medium transition-all',
                      weightUnit === unit
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white',
                    ].join(' ')}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Data section */}
      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Data</p>
        <Card variant="default" padding="none">
          <div className="px-4">
            <div className="py-3">
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full py-2 text-sm text-red-400 font-medium hover:text-red-300 transition-colors text-left"
                >
                  Clear all data…
                </button>
              ) : (
                <div>
                  <p className="text-sm text-gray-400 mb-3">This will delete your weight log and Whoop tokens. Plan settings are reset to defaults. Are you sure?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmClear(false)} className="flex-1 py-2 border border-white/10 rounded-xl text-sm text-gray-400 font-medium">
                      Cancel
                    </button>
                    <button onClick={handleClearAll} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm text-white font-semibold">
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* App info */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-700">Kadence v0.1.0</p>
        <p className="text-xs text-gray-700 mt-1">47-Mile Road Race · Aug 1, 2026</p>
      </div>
    </div>
  )
}
