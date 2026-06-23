import { useState } from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { Text } from 'react-native'
import { Dashboard } from '../components/Dashboard'
import { SessionDetail } from '../components/SessionDetail'
import type { Training } from '../core/types'
import { TrainingPage } from '../components/Training'
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
        options={{ drawerIcon: () => <Text>🏠</Text> }}
      >
        {({ navigation }) => (
          <Dashboard
            onNavigate={(p) => navigation.navigate(p === 'training' ? 'Entrenar' : p)}
            onSelectTraining={setSelectedTraining}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="Entrenar"
        options={{ drawerIcon: () => <Text>🥊</Text> }}
        component={TrainingPage}
      />
      <Drawer.Screen
        name="Dispositivos"
        options={{ drawerIcon: () => <Text>📡</Text> }}
        component={DevicesPage}
      />
      <Drawer.Screen
        name="Perfiles"
        options={{ drawerIcon: () => <Text>⚙️</Text> }}
        component={ProfilesPage}
      />
    </Drawer.Navigator>
  )
}
