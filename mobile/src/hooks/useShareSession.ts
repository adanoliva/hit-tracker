import React, { useState } from 'react'
import { Share, View } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { captureRef } from 'react-native-view-shot'
import type { Training } from '../core/types'
import { generateShareText } from '../utils/shareText'

interface UseShareSessionOptions {
  training: Training
  chartRef: React.RefObject<View | null>
}

interface UseShareSessionReturn {
  share: () => Promise<void>
  isSharing: boolean
}

export function useShareSession({ training, chartRef }: UseShareSessionOptions): UseShareSessionReturn {
  const [isSharing, setIsSharing] = useState(false)

  const share = async () => {
    if (isSharing) return
    setIsSharing(true)
    try {
      const text = generateShareText(training)
      try {
        const tmpUri = (FileSystem.cacheDirectory ?? '') + 'hit-tracker-share.png'
        await new Promise(r => setTimeout(r, 300))
        const uri = await captureRef(chartRef, { format: 'png', quality: 0.9 })
        await FileSystem.copyAsync({ from: uri, to: tmpUri })
        await Sharing.shareAsync(tmpUri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartir sesión',
          UTI: 'public.png',
        })
      } catch {
        await Share.share({ message: text })
      }
    } finally {
      setIsSharing(false)
    }
  }

  return { share, isSharing }
}
