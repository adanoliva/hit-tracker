import { useState } from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { LayoutDashboard, Timer, ClipboardList, Bluetooth, SlidersHorizontal } from 'lucide-react-native'
import { Dashboard } from '../components/Dashboard'
import { SessionDetail } from '../components/SessionDetail'
import type { Training } from '../core/types'
import { TrainingPage } from '../components/Training'
import { EntrenamientoPage } from '../components/Entrenamiento'
import { DevicesPage } from '../components/Devices'
import { ProfilesPage } from '../components/Profiles'
import { colors } from '../theme'

const Drawer = createDrawerNavigator()

export function TabletLayout() {
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
    <Drawer.Navigator
      defaultStatus="open"
      screenOptions={{
        headerShown: false,
        drawerType: 'permanent',
        drawerStyle: { backgroundColor: colors.bgSecondary, borderRightColor: colors.border, width: 220 },
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.textMuted,
        drawerLabelStyle: { fontSize: 14, fontWeight: '600' }
      }}
    >
      <Drawer.Screen
        name="Inicio"
        options={{ drawerIcon: ({ color }) => <LayoutDashboard size={20} color={color} /> }}
      >
        {({ navigation }) => (
          <Dashboard
            onNavigate={(p) => navigation.navigate(p === 'training' ? 'Sesión' : p)}
            onSelectTraining={setSelectedTraining}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="Sesión"
        options={{ drawerIcon: ({ color }) => <Timer size={20} color={color} /> }}
        component={TrainingPage}
      />
      <Drawer.Screen
        name="Entrenamiento"
        options={{ drawerIcon: ({ color }) => <ClipboardList size={20} color={color} /> }}
        component={EntrenamientoPage}
      />
      <Drawer.Screen
        name="Dispositivos"
        options={{ drawerIcon: ({ color }) => <Bluetooth size={20} color={color} /> }}
        component={DevicesPage}
      />
      <Drawer.Screen
        name="Perfiles"
        options={{ drawerIcon: ({ color }) => <SlidersHorizontal size={20} color={color} /> }}
        component={ProfilesPage}
      />
    </Drawer.Navigator>
  )
}
