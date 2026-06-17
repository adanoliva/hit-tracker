import { useState, useEffect } from 'react'
import { useDeviceStore } from './stores/deviceStore'
import { useProfileStore } from './stores/profileStore'
import { useTrainingStore } from './stores/trainingStore'
import { Dashboard } from './components/Dashboard'
import { TrainingPage } from './components/Training'
import { DevicesPage } from './components/Devices'
import { ProfilesPage } from './components/Profiles'

type Page = 'dashboard' | 'training' | 'devices' | 'profiles'

const NAV = [
  { id: 'dashboard', label: 'Inicio', icon: '🏠' },
  { id: 'training', label: 'Entrenar', icon: '🥊' },
  { id: 'devices', label: 'Dispositivos', icon: '📡' },
  { id: 'profiles', label: 'Perfiles', icon: '⚙️' }
] as const

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')
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
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-all ${
              page === item.id ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
