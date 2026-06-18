import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, TouchableOpacity } from 'react-native'
import { Dashboard } from '../components/Dashboard'
import { TrainingPage } from '../components/Training'
import { GamePage } from '../components/Game'
import { DevicesPage } from '../components/Devices'
import { ProfilesPage } from '../components/Profiles'
import { useTrainingStore } from '../core/stores/trainingStore'
import { colors } from '../theme'

const Tab = createBottomTabNavigator()

const TAB_ICONS: Record<string, string> = {
  Inicio: '🏠', Entrenar: '🥊', Game: '🎯', Dispositivos: '📡', Perfiles: '⚙️'
}

const SESSION_PHASES = ['preparing', 'round', 'resting']

export function MobileLayout() {
  const activePhase = useTrainingStore((s) => s.activePhase)
  const sessionActive = SESSION_PHASES.includes(activePhase)

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgSecondary, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
        tabBarButton: sessionActive && route.name !== 'Entrenar'
          ? (props) => <TouchableOpacity {...(props as any)} disabled style={[props.style as any, { opacity: 0.3 }]} />
          : undefined
      })}
    >
      <Tab.Screen name="Inicio">
        {({ navigation }) => <Dashboard onNavigate={(p) => navigation.navigate(p === 'training' ? 'Entrenar' : p)} />}
      </Tab.Screen>
      <Tab.Screen name="Entrenar" component={TrainingPage} />
      <Tab.Screen name="Game" component={GamePage} />
      <Tab.Screen name="Dispositivos" component={DevicesPage} />
      <Tab.Screen name="Perfiles" component={ProfilesPage} />
    </Tab.Navigator>
  )
}
