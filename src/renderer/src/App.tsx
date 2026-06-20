import { useState, useEffect } from 'react'
import { LayoutDashboard, Dumbbell, Gamepad2, Bluetooth, SlidersHorizontal } from 'lucide-react'
import { useDeviceStore } from './stores/deviceStore'
import { useProfileStore } from './stores/profileStore'
import { useTrainingStore } from './stores/trainingStore'

const SESSION_PHASES = ['preparing', 'round', 'resting']
import { Dashboard } from './components/Dashboard'
import { TrainingPage } from './components/Training'
import { GamePage } from './components/Game'
import { DevicesPage } from './components/Devices'
import { ProfilesPage } from './components/Profiles'

type Page = 'dashboard' | 'training' | 'game' | 'devices' | 'profiles'

const NAV = [
  { id: 'dashboard', label: 'Inicio',       Icon: LayoutDashboard },
  { id: 'training',  label: 'Entrenar',     Icon: Dumbbell },
  { id: 'game',      label: 'Game',         Icon: Gamepad2 },
  { id: 'devices',   label: 'Dispositivos', Icon: Bluetooth },
  { id: 'profiles',  label: 'Perfiles',     Icon: SlidersHorizontal }
] as const

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')
  const activePhase = useTrainingStore((s) => s.activePhase)
  const sessionActive = SESSION_PHASES.includes(activePhase)
  const setDevices = useDeviceStore((s) => s.setDevices)
  const setProfiles = useProfileStore((s) => s.setProfiles)
  const setTrainings = useTrainingStore((s) => s.setTrainings)

  useEffect(() => {
    Promise.all([
      window.api.loadDevices(),
      window.api.loadProfiles(),
      window.api.loadTrainings()
    ]).then(([devices, profiles, trainings]) => {
      setDevices(devices)
      if (profiles.length > 0) setProfiles(profiles)
      setTrainings(trainings)
    })
  }, [])

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={(p) => setPage(p as Page)} />
      case 'training':
        return <TrainingPage onBack={() => setPage('dashboard')} />
      case 'game':
        return <GamePage />
      case 'devices':
        return <DevicesPage onBack={() => setPage('dashboard')} />
      case 'profiles':
        return <ProfilesPage onBack={() => setPage('dashboard')} />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary select-none">
      <div className="flex-1 overflow-y-auto">{renderPage()}</div>

      <nav className="border-t border-border bg-bg-secondary flex">
        {NAV.map((item) => {
          const blocked = sessionActive && item.id !== 'training'
          return (
            <button
              key={item.id}
              onClick={() => !blocked && setPage(item.id)}
              disabled={blocked}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-all ${
                blocked
                  ? 'text-text-muted opacity-30 cursor-not-allowed'
                  : page === item.id
                    ? 'text-accent'
                    : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <item.Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
