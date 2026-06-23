# Feature: Video Recording + Real-Time Sensor Data Capture (Mobile)

## Overview

Integrate simultaneous video recording with BLE sensor data capture in the Hit Tracker mobile app, creating a unified session that combines visual footage with impact metrics for easy social sharing and offline analysis.

## Context

Hit Tracker is an open-source IoT boxing/fitness impact monitoring system. The architecture consists of:
- **Hardware**: ESP32-32D + MPU-6050 accelerometer transmitting via BLE only on movement detection
- **Desktop App**: Electron + React + TypeScript handling real-time analysis and visualization
- **Mobile App** (future, this feature): React Native/Android extending the platform to capture and share training sessions

The mobile app is part of a monorepo using Yarn workspaces with three packages: `core` (shared logic), `desktop`, and `mobile`.

## Problem Statement

Currently, Hit Tracker's powerful impact data is locked in desktop-only analysis. Users cannot easily:
1. Record their training session visually while capturing sensor data
2. Share authenticated session data (video + metrics) on social platforms
3. Access training data while training (only have desktop at home)

A mobile app that simultaneously records video and captures sensor data solves this gap, bridging precision (hardware) with shareability (social).

## User Story

**As a** boxer/fitness enthusiast using Hit Tracker,
**I want to** record a training session that captures both video footage and real impact data simultaneously,
**So that** I can review my form, share my workout on social media, and analyze performance metrics offline.

## Feature Scope

### What's Included

1. **Camera Integration**
   - Start/stop video recording from app UI
   - Video stored with timestamp-based filename (e.g., `session_2025-01-16_14h32m47s_video.mp4`)
   - Resolution: 1080p or device default; frame rate: 30fps

2. **Parallel BLE Data Capture**
   - While recording video, simultaneously receive and buffer impact data from ESP32
   - Each impact event includes: timestamp, acceleration values (x/y/z), gyroscope values (x/y/z), derived metrics (force estimate, RPM if applicable)
   - Data stored as JSON following existing schema: `session_2025-01-16_14h32m47s.json`

3. **Timestamp Synchronization**
   - Video start timestamp recorded to millisecond precision
   - All sensor events timestamped relative to video start
   - Playback must align video and data visualizations within ±100ms

4. **Session Persistence**
   - Both video and data saved locally to device storage
   - Metadata file (separate JSON) tracks: device ID, profile used, calibration timestamp, BLE connection info, session duration
   - Files organized by date: `/sessions/2025-01-16/`

5. **Export & Sharing**
   - User can export video + metadata as shareable format (video file + JSON sidecar)
   - Option to generate thumbnail or preview
   - Framework for future overlays (golpes counter, power gauge, etc.)

### What's Out of Scope

- Live streaming to external platforms
- Video editing/trimming in app (can be added in v2)
- Audio recording or commentary
- Cloud sync (v2 feature)
- Automatic metadata extraction from video (pose detection, form analysis)

## Technical Requirements

### Architecture

**Mobile App Structure** (React Native/Android):
```
packages/mobile/
├── src/
│   ├── services/
│   │   ├── BLEService.ts (existing, extend if needed)
│   │   ├── VideoRecordingService.ts (NEW)
│   │   ├── SessionStorageService.ts (extend)
│   │   └── SyncService.ts (orchestrate BLE + video)
│   ├── hooks/
│   │   ├── useVideoRecording.ts (NEW)
│   │   ├── useBLESession.ts (existing)
│   │   └── useSyncedSessionCapture.ts (NEW - orchestrates both)
│   ├── components/
│   │   ├── SessionRecorder.tsx (NEW - main UI)
│   │   ├── CameraPreview.tsx (NEW)
│   │   └── RecordingControls.tsx (NEW)
│   └── screens/
│       └── TrainingSessionScreen.tsx (route component)
```

### Dependencies

**New packages** (React Native ecosystem):
- `@react-native-camera/camera` or `expo-camera` (camera access)
- `@react-native-fs/fs` or `expo-file-system` (local file management)
- Consider: `react-native-video` for playback/preview

**Existing** (from core):
- BLE service from `core` package
- Session types from `core/types`
- Zustand stores for UI state

### Platform Specifics

**Android:**
- Permissions: `CAMERA`, `RECORD_AUDIO` (optional), `WRITE_EXTERNAL_STORAGE`
- Video codec: H.264 (standard, widely supported)
- File format: MP4
- Storage location: App's private directory or scoped storage (API 30+)

**iOS** (future):
- Permissions: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` (in Info.plist)
- Similar video codec/format

### Data Schema

**Session JSON** (existing structure, no changes needed):
```json
{
  "id": "session_2025-01-16_14h32m47s",
  "deviceId": "esp32_001",
  "profileId": "profile_boxing_heavy",
  "startTime": "2025-01-16T14:32:47Z",
  "endTime": "2025-01-16T14:45:22Z",
  "training": {
    "rounds": [
      {
        "roundNumber": 1,
        "durationMs": 180000,
        "impacts": [
          {
            "timestamp": 1234,
            "accel": { "x": 12.5, "y": -8.3, "z": 45.2 },
            "gyro": { "x": 0.1, "y": 0.2, "z": 0.3 },
            "force": 850
          }
        ]
      }
    ]
  },
  "metadata": {
    "videoPath": "session_2025-01-16_14h32m47s_video.mp4",
    "calibrationTimestamp": "2025-01-16T14:30:00Z",
    "bleConnectionDuration": 892000,
    "videoDurationMs": 788000,
    "syncOffset": 0
  }
}
```

**Video Metadata** (sidecar file):
```json
{
  "videoFile": "session_2025-01-16_14h32m47s_video.mp4",
  "duration": 788000,
  "startTime": "2025-01-16T14:32:47Z",
  "resolution": "1080x1920",
  "frameRate": 30,
  "codec": "h264",
  "fileSize": 245000000,
  "recordingStartTimestamp": 1234567890000
}
```

## User Flow

1. **Pre-Session Setup** (existing)
   - Open mobile app
   - Select device (ESP32)
   - Select profile
   - Confirm calibration status

2. **Start Recording** (NEW)
   - Tap "Record Session" button
   - Camera preview appears
   - UI shows: Recording indicator, elapsed time, active BLE connection status
   - On tap: video recording begins AND BLE listening begins (timestamp synchronized)

3. **During Session** (EXTEND)
   - Video frames flowing to file
   - BLE events continuously received and buffered in memory
   - UI shows real-time counter of impacts captured
   - Display optional live metrics (punch count, avg force) from sensor data

4. **End Recording** (NEW)
   - Tap "Stop" button
   - Video write finalized
   - Sensor buffer written to JSON
   - Files saved with synchronized timestamps
   - Brief success confirmation with file paths shown

5. **Post-Session Review** (EXTEND)
   - Video player shows recorded footage
   - Overlay option: display impact events as markers on timeline
   - Tap impact to see metrics (force, acceleration, etc.)
   - Option to export both files for offline sharing

## Implementation Notes

### Critical Considerations

1. **Timestamp Precision**
   - Use `Date.now()` or `performance.now()` consistently
   - Record video start time **before** starting video codec
   - All sensor events timestamped relative to video start (not absolute)
   - Resync BLE timestamps if connection drops and resumes

2. **Memory Management**
   - Don't hold entire video in memory (stream to disk)
   - Buffer sensor data in memory (~100 events/sec = manageable), flush periodically
   - Watch for memory leaks during long sessions (10+ min videos)

3. **BLE Robustness**
   - If BLE disconnects, pause video recording or show warning
   - Option: resume without sensor data (video-only fallback)
   - Clear user messaging about sync status

4. **File Storage**
   - Use app's private cache/documents directory (no external storage request)
   - Implement cleanup: old sessions archived/deleted based on policy
   - Consider: compress video for smaller file sizes (trade-off: quality vs storage)

5. **UI/UX**
   - Keep recording UI minimal (big red record button, timer, connection indicator)
   - Show clear feedback: "Recording video + sensor data"
   - Preview video immediately after stop (not required for MVP, but nice-to-have)

### Testing Strategy

- **Unit tests**: VideoRecordingService logic, timestamp sync, file I/O
- **Integration tests**: BLE + video parallel operation, session persistence
- **E2E**: Record 5-min session, verify video plays and data aligns within tolerance
- **Performance**: Test with long sessions (15+ min), monitor battery/memory

## Acceptance Criteria

- [ ] User can start/stop video recording from mobile app UI
- [ ] Video file saved with timestamp-based filename
- [ ] BLE sensor data simultaneously captured and saved to JSON
- [ ] Video start time synchronized with sensor timestamp (±100ms)
- [ ] Session metadata includes video path and sync info
- [ ] Both files persist locally on device after session ends
- [ ] User can export/view both video and data together
- [ ] No loss of sensor events during recording
- [ ] Graceful handling if BLE disconnects mid-session
- [ ] Code follows existing project conventions (TypeScript, monorepo structure)

## Deliverables

1. **Code**
   - `VideoRecordingService.ts`: handles camera, file I/O, lifecycle
   - `useSyncedSessionCapture.ts`: hooks both BLE and video services
   - `SessionRecorder.tsx`, `CameraPreview.tsx`, `RecordingControls.tsx`: UI components
   - Updated `SessionStorageService` to handle video paths

2. **Tests**
   - Unit tests for video/timestamp logic
   - Integration test for BLE + video parallel operation

3. **Documentation**
   - Updated `TRAINING-ROUNDS-GUIDE.md` or new `MOBILE-RECORDING-GUIDE.md`
   - Code comments for timestamp synchronization logic

4. **Dependencies**
   - Update `package.json` in `packages/mobile` with camera/file system libraries

## Related Features / Dependencies

- **Mobile App Setup** (prerequisite): Base React Native project, BLE integration, routing
- **Session Model** (existing): Training + Rounds structure already defined; this feature extends it with video metadata
- **v2 Feature**: "Playback with Overlay" — visualizing impact events on video timeline
- **v2 Feature**: "Social Sharing" — export optimized format for TikTok/Instagram

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Video file too large, storage issues | Implement compression; warn user about storage before recording |
| BLE + video recording consumes too much battery | Test battery drain; document expected battery life for long sessions |
| Timestamp sync drift over long sessions | Regular resync with BLE heartbeat; store sync offset in metadata |
| Camera access denied (permissions) | Clear permission request flow; fallback to audio-only if needed |

## Estimated Effort

- **Backend services** (Video + Sync): 3-4 days
- **UI components**: 2-3 days
- **Testing & refinement**: 2 days
- **Total**: ~1 week for solid MVP

---

**Status**: Ready for agent feature-spec implementation
**Last Updated**: 2025-01-16
**Author**: Hit Tracker team
