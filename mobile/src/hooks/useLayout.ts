import { useWindowDimensions } from 'react-native'

export function useLayout() {
  const { width, height } = useWindowDimensions()
  return {
    isTablet: width >= 768,
    isLandscape: width > height
  }
}
