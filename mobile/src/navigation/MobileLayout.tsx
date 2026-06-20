import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { TouchableOpacity } from 'react-native'
import { LayoutDashboard, Dumbbell, Gamepad2, Bluetooth, SlidersHorizontal, type LucideProps } from 'lucide-react-native'
import { Dashboard } from '../components/Dashboard'
import { TrainingPage } from '../components/Training'
import { GamePage } from '../components/Game'
import { DevicesPage } from '../components/Devices'
import { ProfilesPage } from '../components/Profiles'
import { useTrainingStore } from '../core/stores/trainingStore'
import { colors } from '../theme'

const Tab = createBottomTabNavigator()

type IconComponent = (props: LucideProps) => JSX.Element

const TAB_ICONS: Record<string, IconComponent> = {
  Inicio: LayoutDashboard,
  Entrenar: Dumbbell,
  Game: Gamepad2,
  Dispositivos: Bluetooth,
  Perfiles: SlidersHorizontal
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
        tabBarIcon: ({ color }) => {
          const Icon = TAB_ICONS[route.name]
          return Icon ? <Icon size={22} color={color} /> : null
        },
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
