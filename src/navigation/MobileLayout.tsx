import React, { useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { TouchableOpacity } from 'react-native'
import { LayoutDashboard, Timer, ClipboardList, Bluetooth, SlidersHorizontal, type LucideProps } from 'lucide-react-native'
import { Dashboard } from '../components/Dashboard'
import { TrainingPage } from '../components/Session'
import { EntrenamientoPage } from '../components/PlanRunner'
import { DevicesPage } from '../components/Devices'
import { ProfilesPage } from '../components/Profiles'
import { SessionDetail } from '../components/SessionDetail'
import { useTrainingStore } from '../core/stores/trainingStore'
import { colors } from '../theme'
import type { Training } from '../core/types'

const Tab = createBottomTabNavigator()

type IconComponent = React.ComponentType<LucideProps>

const TAB_ICONS: Record<string, IconComponent> = {
  Inicio: LayoutDashboard,
  Sesión: Timer,
  Entrenamiento: ClipboardList,
  Dispositivos: Bluetooth,
  Perfiles: SlidersHorizontal
}

const SESSION_PHASES = ['preparing', 'round', 'resting']

export function MobileLayout() {
  const activePhase = useTrainingStore((s) => s.activePhase)
  const sessionActive = SESSION_PHASES.includes(activePhase)
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)

  if (selectedTraining) {
    return (
      <SessionDetail
        training={selectedTraining}
        onBack={() => setSelectedTraining(null)}
        onDelete={() => setSelectedTraining(null)}
      />
    )
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgSecondary, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color }) => {
          const Icon = TAB_ICONS[route.name]
          return Icon ? <Icon size={22} color={color} /> : null
        },
        tabBarButton: sessionActive && route.name !== 'Sesión'
          ? (props) => <TouchableOpacity {...(props as any)} disabled style={[props.style as any, { opacity: 0.3 }]} />
          : undefined
      })}
    >
      <Tab.Screen name="Inicio">
        {({ navigation }) => (
          <Dashboard
            onNavigate={(p) => navigation.navigate(p === 'training' ? 'Sesión' : p)}
            onSelectTraining={setSelectedTraining}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Sesión" component={TrainingPage} />
      <Tab.Screen name="Entrenamiento" component={EntrenamientoPage} />
      <Tab.Screen name="Dispositivos" component={DevicesPage} />
      <Tab.Screen name="Perfiles" component={ProfilesPage} />
    </Tab.Navigator>
  )
}
