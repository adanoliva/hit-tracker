import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as ScreenOrientation from 'expo-screen-orientation'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { MobileLayout } from './src/navigation/MobileLayout'
import { useTrainingStore } from './src/core/stores/trainingStore'
import { useProfileStore } from './src/core/stores/profileStore'
import { useDeviceStore } from './src/core/stores/deviceStore'
import { storage } from './src/services/storage'
import { colors } from './src/theme'

function RootNavigator() {
  const { width, height } = useWindowDimensions()
  const isTablet = Math.min(width, height) >= 600

  useEffect(() => {
    ScreenOrientation.lockAsync(
      isTablet
        ? ScreenOrientation.OrientationLock.LANDSCAPE
        : ScreenOrientation.OrientationLock.PORTRAIT_UP
    )
  }, [isTablet])

  return <MobileLayout />
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
        <StatusBar style="light" backgroundColor={colors.bgPrimary} translucent={false} />
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary }
})
