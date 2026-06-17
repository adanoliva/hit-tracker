import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { Dashboard } from '../components/Dashboard'
import { TrainingPage } from '../components/Training'
import { DevicesPage } from '../components/Devices'
import { ProfilesPage } from '../components/Profiles'
import { colors } from '../theme'

const Tab = createBottomTabNavigator()

const TAB_ICONS: Record<string, string> = {
  Inicio: '🏠', Entrenar: '🥊', Dispositivos: '📡', Perfiles: '⚙️'
}

export function MobileLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgSecondary, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>
      })}
    >
      <Tab.Screen name="Inicio">
        {({ navigation }) => <Dashboard onNavigate={(p) => navigation.navigate(p === 'training' ? 'Entrenar' : p)} />}
      </Tab.Screen>
      <Tab.Screen name="Entrenar" component={TrainingPage} />
      <Tab.Screen name="Dispositivos" component={DevicesPage} />
      <Tab.Screen name="Perfiles" component={ProfilesPage} />
    </Tab.Navigator>
  )
}
