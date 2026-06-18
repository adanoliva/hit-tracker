import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as ScreenOrientation from 'expo-screen-orientation'
import * as SplashScreen from 'expo-splash-screen'
import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, useWindowDimensions, View, Image, ActivityIndicator } from 'react-native'
import { MobileLayout } from './src/navigation/MobileLayout'
import { useTrainingStore } from './src/core/stores/trainingStore'
import { useProfileStore } from './src/core/stores/profileStore'
import { useDeviceStore } from './src/core/stores/deviceStore'
import { storage } from './src/services/storage'
import { colors } from './src/theme'

SplashScreen.preventAutoHideAsync()

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bgPrimary,
    card: colors.bgSecondary,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
    notification: colors.accent,
  },
}

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
  const [ready, setReady] = useState(false)
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
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Image source={require('./assets/splash-icon.png')} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer theme={NAV_THEME}>
        <StatusBar style="light" backgroundColor={colors.bgPrimary} translucent={false} />
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  loading: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  loadingLogo: { width: 160, height: 160 },
  spinner: { marginTop: 32 },
})
