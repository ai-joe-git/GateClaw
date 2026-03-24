# oc-remote Talkie Walkie Implementation Prompt

## Context

You are implementing voice features (TTS/STT) in a forked Android remote client for OpenCode called "oc-remote". This is similar to the existing Telegram voice features in GateClaw.

**Project Location:** `C:\Users\uscha\Desktop\Sandbox\oc-remote`

**GateClaw Reference:** `C:\Users\uscha\Desktop\Sandbox\GateClaw` (Telegram implementation can be referenced for patterns)

---

## Goal

Add Talkie Walkie voice experience to oc-remote Android app:

1. **TTS (Text-to-Speech)** - Assistant responses are spoken aloud
2. **STT (Speech-to-Text)** - User can record voice and it gets transcribed to text
3. **Voice Selection** - User can choose which voice to use for TTS
4. **Multiple Modes** - User chooses between Native Android or Server-based (PocketTTS/Whisper) for both TTS and STT

---

## User Experience Requirements

### TTS Behavior

- When assistant sends a text response, if TTS is enabled, the app speaks the text
- User can choose TTS OFF, Native Android TTS, or Server TTS (PocketTTS)
- User can select which voice to use
- Voice list for Server TTS comes from `GET /voice/voices` (GateClaw endpoint)
- Voice list for Native TTS comes from `android.speech.tts.TextToSpeech.getVoices()`
- **Auto-play setting** - User chooses whether TTS plays automatically or requires tap
- **Audio routing** - User chooses speaker (default) or earpiece

### STT Behavior

- User holds mic button to record voice message
- When released, audio is transcribed and sent as text message
- User can choose STT OFF, Native Android Speech Recognition, or Server Whispercpp
- Native STT is default (works offline)
- Server STT forwards audio to GateClaw → whispercpp → returns transcription
- **Max recording duration** - User configurable, default 60 seconds, can be disabled

### Voice Modes

| Mode          | Mic Button     | Behavior                                                        |
| ------------- | -------------- | --------------------------------------------------------------- |
| OFF           | Hidden         | Normal text input only                                          |
| Talkie Walkie | Always visible | Hold to record, release to send + auto-play response if enabled |

---

## Settings Requirements

### TTS Settings

| Setting      | Options                 | Default         |
| ------------ | ----------------------- | --------------- |
| TTS Mode     | OFF / Native / Server   | Native          |
| TTS Voice    | List from server/device | First available |
| TTS Speed    | 0.5x - 2.0x             | 1.0x            |
| Auto-play    | ON / OFF                | ON              |
| Audio Output | Speaker / Earpiece      | Speaker         |

### STT Settings

| Setting                | Options                      | Default       |
| ---------------------- | ---------------------------- | ------------- |
| STT Mode               | OFF / Native / Server        | Native        |
| STT Language           | From device locales          | en-US         |
| Max Recording Duration | OFF / 15s / 30s / 60s / 120s | 60s           |
| Voice Input Mode       | OFF / Talkie Walkie / Full   | Talkie Walkie |

---

## Project Structure

```
oc-remote/
├── app/src/main/
│   ├── AndroidManifest.xml
│   ├── kotlin/dev/minios/ocremote/
│   │   ├── MainActivity.kt
│   │   ├── data/
│   │   │   ├── api/
│   │   │   │   └── OpenCodeApi.kt           # Modify - add voice API methods
│   │   │   └── repository/
│   │   │       ├── DraftRepository.kt
│   │   │       └── SettingsRepository.kt    # Modify - add voice settings
│   │   ├── domain/model/
│   │   │   ├── Part.kt
│   │   │   ├── Message.kt
│   │   │   └── ServerConnection.kt
│   │   ├── service/
│   │   │   └── OpenCodeConnectionService.kt
│   │   ├── ui/screens/chat/
│   │   │   ├── ChatScreen.kt               # Modify - add mic button + recording UI
│   │   │   └── ChatViewModel.kt           # Modify - add voice state + handlers
│   │   ├── TtsManager.kt                  # CREATE - TTS implementation
│   │   └── SttManager.kt                  # CREATE - STT implementation
│   └── res/
└── build.gradle.kts
```

---

## GateClaw Server Endpoints

The app connects to GateClaw's OpenCode server at `http://192.168.0.154:4100` (local IP).

| Endpoint                 | Method | Description                               |
| ------------------------ | ------ | ----------------------------------------- |
| `GET /voice/voices`      | GET    | Returns list of PocketTTS voices          |
| `POST /voice/synthesize` | POST   | Body: `{text, voice}` → Returns audio/wav |
| `POST /voice/transcribe` | POST   | Body: audio bytes → Returns `{text}`      |

---

## Implementation Plan

### Phase 1: Android Manifest & Settings Infrastructure

#### 1.1 AndroidManifest.xml - Add permissions:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" /> <!-- Android 13+ -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" /> <!-- older Android -->
```

#### 1.2 SettingsRepository.kt - Add Voice Settings

**Add enums:**

```kotlin
enum class TtsMode { OFF, NATIVE, SERVER }
enum class SttMode { OFF, NATIVE, SERVER }
enum class VoiceInputMode { OFF, TALKWIE, FULL }
enum class AudioOutput { SPEAKER, EARPIECE }
enum class MaxRecordingDuration(val seconds: Int?) {
    OFF(null),
    S15(15),
    S30(30),
    S60(60),
    S120(120)
}
```

**Add settings flows:**

```kotlin
// TTS Settings
val ttsMode: Flow<TtsMode>
val ttsVoice: Flow<String>
val ttsSpeed: Flow<Float>
val ttsAutoPlay: Flow<Boolean>
val ttsAudioOutput: Flow<AudioOutput>

// STT Settings
val sttMode: Flow<SttMode>
val sttLanguage: Flow<String>
val sttMaxDuration: Flow<MaxRecordingDuration>
val voiceInputMode: Flow<VoiceInputMode>
```

**Add helper functions:**

```kotlin
suspend fun getNativeTtsVoices(context: Context): List<String>
suspend fun getServerTtsVoices(serverUrl: String): List<String>
fun getNativeSttLanguages(context: Context): List<String>
```

---

### Phase 2: TtsManager.kt (CREATE)

**File:** `app/src/main/kotlin/dev/minios/ocremote/TtsManager.kt`

```kotlin
class TtsManager(private val context: Context) {

    // Native Android TTS
    private var nativeTts: TextToSpeech? = null
    private var nativeVoices: Set<Voice>? = null
    private var isInitialized = false

    // Audio focus
    private var audioManager: AudioManager? = null

    // Configuration
    var currentMode: TtsMode = TtsMode.NATIVE
    var currentVoice: String = "default"
    var currentSpeed: Float = 1.0f
    var autoPlay: Boolean = true
    var audioOutput: AudioOutput = AudioOutput.SPEAKER

    // Callbacks
    var onStart: () -> Unit = {}
    var onDone: () -> Unit = {}
    var onError: (String) -> Unit = {}

    suspend fun initNative(): TextToSpeech
    suspend fun getNativeVoices(): List<String>

    fun speakNative(text: String, voice: String, speed: Float)
    suspend fun speakServer(text: String, voice: String, serverUrl: String): ByteArray

    fun speak(text: String, mode: TtsMode, voice: String, speed: Float, serverUrl: String)
    fun stop()
    fun release()

    // Audio routing
    private fun setAudioOutput(output: AudioOutput) {
        audioOutput = output
        // For earpiece: use AudioManager.STREAM_VOICE_CALL
        // For speaker: use AudioManager.STREAM_MUSIC
    }
}
```

**Key Implementation Notes:**

1. Native TTS uses `android.speech.tts.TextToSpeech`
2. Initialize with `TextToSpeech.OnInitListener`
3. Get voices with `tts.voices` after initialization
4. Speak with `tts.speak(text, QUEUE_FLUSH, null, utteranceId)`
5. Handle `UtteranceProgressListener` for onDone callback
6. Audio routing via `AudioManager` and `setSpeakerphoneOn()`

**Audio Output Routing:**

```kotlin
private fun routeAudioToEarpiece() {
    audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
    audioManager?.isSpeakerphoneOn = false
}

private fun routeAudioToSpeaker() {
    audioManager?.mode = AudioManager.MODE_NORMAL
    audioManager?.isSpeakerphoneOn = true
}
```

---

### Phase 3: SttManager.kt (CREATE)

**File:** `app/src/main/kotlin/dev/minios/ocremote/SttManager.kt`

```kotlin
class SttManager(private val context: Context) {

    // Recording
    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var isRecording = false
    private var recordingStartTime: Long = 0

    // Native speech recognition
    private var speechRecognizer: SpeechRecognizer? = null

    // Configuration
    var maxDurationMs: Int = 60000
    var language: String = "en-US"
    var currentMode: SttMode = SttMode.NATIVE

    // Callbacks
    var onRecordingStarted: () -> Unit = {}
    var onRecordingStopped: (ByteArray) -> Unit = {}
    var onPartialResult: (String) -> Unit = {}
    var onFinalResult: (String) -> Unit = {}
    var onError: (String) -> Unit = {}
    var onMaxDurationReached: () -> Unit = {}

    fun startRecording(): Boolean
    fun stopRecording(): ByteArray
    fun cancelRecording()

    fun startNativeRecognition()
    fun stopNativeRecognition()

    suspend fun recognizeServer(audioBytes: ByteArray, serverUrl: String): String

    fun release()
}
```

**Key Implementation Notes:**

1. Recording uses `MediaRecorder` with:
   - Output format: `MediaRecorder.OutputFormat.MPEG_4` (AAC codec)
   - Audio source: `MediaRecorder.AudioSource.MIC`
   - Sample rate: 16000 Hz
   - Bit rate: 128kbps

2. For max duration, use a handler to auto-stop:

```kotlin
private val maxDurationHandler = Handler(Looper.getMainLooper())
private val maxDurationRunnable = Runnable {
    if (isRecording) {
        stopRecording()
        onMaxDurationReached()
    }
}
```

3. Native STT uses `SpeechRecognizer` with `RecognitionListener`

4. Server STT: POST audio to `/voice/transcribe`

---

### Phase 4: ChatViewModel.kt (Modify)

**File:** `app/src/main/kotlin/dev/minios/ocremote/ui/screens/chat/ChatViewModel.kt`

**Add VoiceState:**

```kotlin
data class VoiceState(
    val ttsMode: TtsMode = TtsMode.NATIVE,
    val ttsVoice: String = "default",
    val ttsSpeed: Float = 1.0f,
    val ttsAutoPlay: Boolean = true,
    val ttsAudioOutput: AudioOutput = AudioOutput.SPEAKER,

    val sttMode: SttMode = SttMode.NATIVE,
    val sttLanguage: String = "en-US",
    val sttMaxDuration: MaxRecordingDuration = MaxRecordingDuration.S60,
    val voiceInputMode: VoiceInputMode = VoiceInputMode.TALKWIE,

    val isRecording: Boolean = false,
    val recordingDurationSeconds: Int = 0,
    val isSpeaking: Boolean = false
)
```

**Add to ChatUiState:**

```kotlin
data class ChatUiState(
    // ... existing fields
    val voiceState: VoiceState = VoiceState()
)
```

**Add voice functions:**

```kotlin
fun startRecording()
fun stopRecording()
fun cancelRecording()
fun speakText(text: String)
fun stopSpeaking()
fun updateVoiceSettings(settings: VoiceState)
private fun handleAssistantMessage(message: Message.Assistant)
```

**Auto TTS on response:**

```kotlin
private fun handleAssistantMessage(message: Message.Assistant) {
    val vs = uiState.value.voiceState
    if (vs.ttsMode != TtsMode.OFF && !vs.isSpeaking) {
        val text = extractTextFromMessage(message)
        if (text.isNotBlank()) {
            // Check auto-play setting
            if (vs.ttsAutoPlay) {
                ttsManager.speak(
                    text = text,
                    mode = vs.ttsMode,
                    voice = vs.ttsVoice,
                    speed = vs.ttsSpeed,
                    serverUrl = currentServerUrl
                )
            }
        }
    }
}
```

**Recording flow:**

```kotlin
fun stopRecording() {
    val audioBytes = sttManager.stopRecording()

    if (vs.sttMode == SttMode.SERVER) {
        val text = sttManager.recognizeServer(audioBytes, serverUrl)
        if (text.isNotBlank()) {
            sendMessage(text)
        }
    }
    // For Native STT, result comes via callback
}
```

---

### Phase 5: ChatScreen.kt - ChatInputBar (Modify)

**File:** `app/src/main/kotlin/dev/minios/ocremote/ui/screens/chat/ChatScreen.kt`

**Add parameters to ChatInputBar:**

```kotlin
voiceInputMode: VoiceInputMode = VoiceInputMode.OFF,
isRecording: Boolean = false,
recordingDurationSeconds: Int = 0,
onStartRecording: () -> Unit = {},
onStopRecording: () -> Unit = {},
onCancelRecording: () -> Unit = {},
```

**Add mic button (near attach button):**

```kotlin
if (voiceInputMode != VoiceInputMode.OFF) {
    IconButton(
        onClick = {
            if (isRecording) onStopRecording() else onStartRecording()
        }
    ) {
        Icon(
            imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
            contentDescription = if (isRecording) "Stop recording" else "Start recording"
        )
    }
}
```

**Recording overlay UI:**

```kotlin
if (isRecording) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Red.copy(alpha = 0.1f))
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Recording indicator
        Icon(
            imageVector = Icons.Default.FiberManualRecord,
            contentDescription = null,
            tint = Color.Red,
            modifier = Modifier.size(16.dp).padding(end = 4.dp)
        )

        // Duration
        Text(
            text = "Recording ${recordingDurationSeconds}s",
            modifier = Modifier.weight(1f),
            color = Color.Red
        )

        // Waveform/progress (optional)
        LinearProgressIndicator(
            progress = { recordingDurationSeconds / 60f },
            modifier = Modifier.width(60.dp).padding(horizontal = 8.dp),
            color = Color.Red
        )

        // Cancel button
        IconButton(onClick = onCancelRecording) {
            Icon(Icons.Default.Close, "Cancel recording")
        }
    }
}
```

**Hold-to-record gesture:**

```kotlin
val isHeld = remember { mutableStateOf(false) }

IconButton(
    onClick = { /* handled by gesture */ },
    modifier = Modifier
        .pointerInput(Unit) {
            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false)
                isHeld.value = true
                onStartRecording()

                val up = waitForUpOrCancellation()
                isHeld.value = false
                onStopRecording()
            }
        }
) {
    Icon(
        imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
        contentDescription = "Voice"
    )
}
```

---

### Phase 6: Settings Screen - Voice Settings

**Add VoiceSettingsSection composable:**

```kotlin
@Composable
fun VoiceSettingsSection(
    // TTS
    ttsMode: TtsMode,
    onTtsModeChange: (TtsMode) -> Unit,
    ttsVoice: String,
    onTtsVoiceChange: (String) -> Unit,
    ttsSpeed: Float,
    onTtsSpeedChange: (Float) -> Unit,
    ttsAutoPlay: Boolean,
    onTtsAutoPlayChange: (Boolean) -> Unit,
    ttsAudioOutput: AudioOutput,
    onTtsAudioOutputChange: (AudioOutput) -> Unit,
    ttsVoices: List<String>,

    // STT
    sttMode: SttMode,
    onSttModeChange: (SttMode) -> Unit,
    sttLanguage: String,
    onSttLanguageChange: (String) -> Unit,
    sttMaxDuration: MaxRecordingDuration,
    onSttMaxDurationChange: (MaxRecordingDuration) -> Unit,
    voiceInputMode: VoiceInputMode,
    onVoiceInputModeChange: (VoiceInputMode) -> Unit,
    sttLanguages: List<String>,

    serverUrl: String,
    onTestTts: () -> Unit,
    onTestStt: () -> Unit,
)
```

**Settings UI Layout:**

```
┌─────────────────────────────────────────────────────┐
│ Voice Settings                                      │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Text-to-Speech (TTS)                           │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Mode:     [▼ Native       ]                     │ │
│ │           OFF / Native / Server                  │ │
│ │                                                  │ │
│ │ Voice:   [▼ joe_original]                       │ │
│ │           (dropdown of available voices)         │ │
│ │                                                  │ │
│ │ Speed:   [======●======] 1.0x                  │ │
│ │           0.5x                    2.0x         │ │
│ │                                                  │ │
│ │ Auto-play: [ON ]                                │ │
│ │                                                  │ │
│ │ Audio:   [● Speaker ] ○ Earpiece               │ │
│ │                                                  │ │
│ │ [Test TTS] - Speaks sample text                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Voice Input (STT)                              │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Input Mode: [▼ Talkie Walkie]                  │ │
│ │             OFF / Talkie Walkie / Full           │ │
│ │                                                  │ │
│ │ Language: [▼ English (US)      ]                │ │
│ │             (dropdown of locales)               │ │
│ │                                                  │ │
│ │ Recognition: [▼ Native       ]                  │ │
│ │              OFF / Native / Server              │ │
│ │                                                  │ │
│ │ Max Duration: [▼ 60 seconds   ]                │ │
│ │              OFF / 15s / 30s / 60s / 120s      │ │
│ │                                                  │ │
│ │ [Test STT] - Records and shows transcription   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

### Phase 7: OpenCodeApi.kt (Modify)

**File:** `app/src/main/kotlin/dev/minios/ocremote/data/api/OpenCodeApi.kt`

**Add voice API methods:**

```kotlin
// Get available TTS voices from GateClaw
suspend fun getTtsVoices(serverUrl: String): List<String> {
    // GET /voice/voices
    // Returns: { voices: [{ voice_id, name, ... }] }
    // Parse and return voice_id values
}

// Synthesize speech via PocketTTS
suspend fun synthesizeSpeech(serverUrl: String, text: String, voice: String): ByteArray {
    // POST /voice/synthesize
    // Body: { text: "...", voice: "joe_original" }
    // Returns: audio/wav bytes
}

// Transcribe audio via whispercpp
suspend fun transcribeAudio(serverUrl: String, audioBytes: ByteArray): String {
    // POST /voice/transcribe
    // Body: multipart/form-data with audio file
    // Returns: { text: "transcribed text" }
}
```

---

## File Changes Summary

| File                    | Action        | Description                                                                                        |
| ----------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `AndroidManifest.xml`   | Modify        | Add RECORD_AUDIO, READ_MEDIA_AUDIO permissions                                                     |
| `SettingsRepository.kt` | Modify        | Add voice enums (TtsMode, SttMode, VoiceInputMode, AudioOutput, MaxRecordingDuration) and settings |
| `OpenCodeApi.kt`        | Modify        | Add getTtsVoices, synthesizeSpeech, transcribeAudio methods                                        |
| `TtsManager.kt`         | **CREATE**    | Native + Server TTS with audio routing                                                             |
| `SttManager.kt`         | **CREATE**    | Native + Server STT with recording and max duration                                                |
| `ChatViewModel.kt`      | Modify        | Add VoiceState, voice callbacks, auto-TTS on responses                                             |
| `ChatScreen.kt`         | Modify        | Add mic button, recording UI to ChatInputBar                                                       |
| `SettingsScreen.kt`     | Create/Modify | Add VoiceSettingsSection composable                                                                |

---

## Important Implementation Notes

### 1. Audio Recording Format

- Output format: `MediaRecorder.OutputFormat.MPEG_4` (AAC)
- Audio source: `MediaRecorder.AudioSource.MIC`
- Sample rate: 16000 Hz (optimal for whispercpp)
- Bit rate: 128kbps
- Channels: Mono

### 2. Audio Output Routing

```kotlin
// For speaker (default like Telegram)
audioManager?.mode = AudioManager.MODE_NORMAL
audioManager?.isSpeakerphoneOn = true

// For earpiece (privacy)
audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
audioManager?.isSpeakerphoneOn = false
```

### 3. Max Recording Duration

```kotlin
val maxDurationHandler = Handler(Looper.getMainLooper())
val maxDurationRunnable = Runnable {
    if (isRecording) {
        val audio = stopRecording()
        onMaxDurationReached()
    }
}

// Start timer when recording begins
fun startRecording(): Boolean {
    // ... start recorder
    maxDurationDuration.seconds?.let { seconds ->
        maxDurationHandler.postDelayed(maxDurationRunnable, seconds * 1000L)
    }
    return true
}
```

### 4. TTS Voice Names

- **Native Android**: Use voice IDs from `TextToSpeech.getVoices()`
- **Server PocketTTS**: Use voice IDs like `joe_original`, `andrew-tate`, `matthew_mcconaughey`
- Fetch server voices from `GET /voice/voices`

### 5. Error Handling

- Handle `SecurityException` for microphone permission denied
- Handle `EngineNotSupportedException` for TTS/STT engine not available
- Handle `NetworkException` for server mode failures
- Show user-friendly error via Snackbar or Toast

### 6. Lifecycle

- Stop recording in `onPause()` if recording
- Stop TTS playback in `onPause()` (configurable)
- Release TTS/STT resources in `onDestroy()`
- Save recording to cache directory, clean on app restart

---

## Testing Checklist

### TTS Testing

- [ ] Native TTS speaks when assistant responds
- [ ] Native TTS voice selection works from dropdown
- [ ] Native TTS speed adjustment works (slider)
- [ ] TTS Auto-play ON plays automatically
- [ ] TTS Auto-play OFF requires tap
- [ ] TTS Audio output Speaker plays on speaker
- [ ] TTS Audio output Earpiece plays in earpiece
- [ ] Server TTS speaks via PocketTTS
- [ ] Server TTS voice selection from voice list
- [ ] TTS OFF doesn't speak
- [ ] Stop TTS button works

### STT Testing

- [ ] Hold mic to record
- [ ] Release sends transcription
- [ ] Native STT transcription works
- [ ] Server STT transcription via whispercpp
- [ ] Cancel recording works
- [ ] Recording duration shown
- [ ] Max duration 15s auto-cancels
- [ ] Max duration 30s auto-cancels
- [ ] Max duration 60s auto-cancels
- [ ] Max duration 120s auto-cancels
- [ ] Max duration OFF allows unlimited
- [ ] STT OFF hides mic button
- [ ] Language selection changes STT language

### Settings Testing

- [ ] TTS mode selection persists
- [ ] TTS voice selection persists
- [ ] TTS speed persists
- [ ] TTS auto-play persists
- [ ] TTS audio output persists
- [ ] STT mode selection persists
- [ ] STT language persists
- [ ] STT max duration persists
- [ ] Voice input mode persists
- [ ] Settings sync across app restart

### Edge Cases

- [ ] Empty transcription handled (don't send)
- [ ] Very long text truncated for TTS (configurable max chars)
- [ ] Very long recording handled (max duration enforced)
- [ ] Network failure for server STT/TTS shows error
- [ ] Permission denied shows permission request
- [ ] Headphone plugged in routes audio correctly
- [ ] Bluetooth headset available as audio option

---

## Reference Files (GateClaw Telegram Implementation)

For patterns and best practices, refer to:

**STT (Whisper):** `packages/gateclaw-orchestrator/src/telegram-bot/stt/client.ts`
**TTS (PocketTTS):** `packages/gateclaw-orchestrator/src/telegram-bot/tts/client.ts`
**Voice Manager:** `packages/gateclaw-orchestrator/src/telegram-bot/voice/manager.ts`
**Config:** `packages/gateclaw-orchestrator/src/telegram-bot/config.ts`

---

## Implementation Order

1. **SettingsRepository** - Add enums and settings flows
2. **TtsManager** - Native Android TTS only (no server yet)
3. **Settings UI** - TTS section with voice dropdown, speed slider, auto-play toggle, audio output selector
4. **ChatViewModel** - TTS auto-speak on responses
5. **SttManager** - Native Android Speech Recognition + recording
6. **ChatInputBar** - Mic button + recording UI
7. **ChatViewModel** - Recording → transcribe → send as text
8. **Settings UI** - STT section with mode, language, max duration
9. **Server TTS** - Voice list from GateClaw, synthesize endpoint
10. **Server STT** - Transcribe endpoint (check if GateClaw has it)
11. **Full testing + polish**
