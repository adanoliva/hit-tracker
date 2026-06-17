import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { Dashboard } from '../components/Dashboard'
import { TrainingPage } from '../components/Training'
import { DevicesPage } from '../components/Devices'
import { ProfilesPage } from '../components/Profiles'
import { colors } from '../theme'

const Tab = createBottomTabNavigator()

function icon(label: string) {
  const map: Record<string, string> = {
    Inicio: '🏠', Entrenar: '🥊', Dispositivos: '📡', Perfiles: '⚙️'
  }
  return <Text style={{ fontSize: 20 }}>{map[label]}</Text>
}

export function MobileLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgSecondary, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 }
      }}
    >
      <Tab.Screen name="Inicio" options={{ tabBarIcon: () => icon('Inicio') }}>
        {() => <Dashboard onNavigate={() => {}} />}
      </Tab.Screen>
      <Tab.Screen name="Entrenar" options={{ tabBarIcon: () => icon('Entrenar') }}
        component={TrainingPage} />
      <Tab.Screen name="Dispositivos" options={{ tabBarIcon: () => icon('Dispositivos') }}
        component={DevicesPage} />
      <Tab.Screen name="Perfiles" options={{ tabBarIcon: () => icon('Perfiles') }}
        component={ProfilesPage} />
    </Tab.Navigator>
  )
}
