import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import { useLayout } from './src/hooks/useLayout'
import { MobileLayout } from './src/navigation/MobileLayout'
import { TabletLayout } from './src/navigation/TabletLayout'
import { useTrainingStore } from './src/core/stores/trainingStore'
import { useProfileStore } from './src/core/stores/profileStore'
import { useDeviceStore } from './src/core/stores/deviceStore'
import { storage } from './src/services/storage'
import { colors } from './src/theme'

function RootNavigator() {
  const { isTablet, isLandscape } = useLayout()
  return isTablet && isLandscape ? <TabletLayout /> : <MobileLayout />
}

export default function App() {
  const setTrainings = useTrainingStore((s) => s.setTrainings)
  const setProfiles = useProfileStore((s) => s.setProfiles)
  const setDevices = useDeviceStore((s) => s.setDevices)

  useEffect(() => {
    Promise.all([
      storage.loadTrainings(),
      storage.loadProfiles(),
      storage.loadDevices()
    ]).then(([trainings, profiles, devices]) => {
      setTrainings(trainings)
      if (profiles.length > 0) setProfiles(profiles)
      setDevices(devices)
    })
  }, [])

  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={colors.bgPrimary} />
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary }
})
