# n8n-nodes-ffmpeg-advanced

[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40ksoftm%2Fn8n-nodes-ffmpeg-advanced.svg)](https://badge.fury.io/js/%40ksoftm%2Fn8n-nodes-ffmpeg-advanced)

Advanced audiovisual processing node for n8n based on FFmpeg research. Process video and audio using FFmpeg with advanced and preset capabilities directly within your workflows.

Stop wrestling with complex command-line arguments. This node gives you a powerful interface for common video and audio tasks while still expecting the flexibility of raw commands when you need them.

## 🚀 Key Features

- **Format Conversion**: Convert between MP4, WebM, AVI, MOV, and GIF with ease.
- **Smart Compression**: Optimize file sizes using Constant Rate Factor (CRF) and speed presets.
- **Audio Extraction**: Rip audio tracks from videos into MP3, WAV, or AAC.
- **Metadata Analysis**: Get detailed JSON analysis of media streams using `ffprobe`.
- **Custom Commands**: Run complex FFmpeg filters and arguments for unlimited power.
- **Streaming Optimization**: Built-in flags for low-latency streaming applications.
- **Merge Streams**: Combine video and audio from different sources into a single file.

## 📦 Operations

### 1. Convert / Transcode
Change format, resolution, or codec.
- **Formats**: `MP4`, `WebM`, `AVI`, `MOV`, `GIF`.
- **Codecs**:
  - Video: `Auto`, `H.264 (libx264)`, `VP9 (libvpx-vp9)`.
  - Audio: `Auto`, `AAC`, `Opus`.
- **Resolution**: `1080p`, `720p`, `480p`, or `Keep Original`.
- **Streaming Optimization**: Enable low-latency and no-buffer flags for real-time needs.

### 2. Compress (Optimize)
Reduce file size efficiently.
- **CRF (Constant Rate Factor)**: Fine-tune quality vs. size (0-51). Default is 23.
- **Presets**: From `Ultrafast` (larger file, fast) to `Veryslow` (small file, slow).

### 3. Extract Audio
Rip audio track from video.
- **Formats**: `MP3`, `WAV`, `AAC`.

### 4. Get Metadata (Analysis)
Return detailed JSON info about the file.
- Uses `ffprobe` to analyze streams, formats, and bitrate.
- Returns JSON output alongside the original binary data.

### 5. Custom Command
Run raw FFmpeg arguments.
- **Arguments**: Enter flags like `-c:v libx264 -preset slow`.
- **Output Extension**: Specify the expected output format.

### 6. Image to Video
Create video from a static image with animation presets.
- **Presets**: `Zoom Pan`, `Simple Loop`, `YouTube Shorts` (9:16), `YouTube Long` (16:9).
- **Duration**: Set the length of the resulting video.

### 7. Merge Video & Audio
Combine a video stream and an audio stream.
- **Video/Audio Inputs**: Specify the binary property names for video and audio (e.g., `video` and `audio`).
- **Shortest**: Option to finish encoding when the shortest input ends.
- **Codecs**: "Copy" mode available for zero-loss merging.

### 8. Concatenate Videos
Join multiple video files sequentially into a single file. (Aggregates all input items).
- **Concatenation Method**:
  - `Stream Copy`: Fast, no quality loss. Requires inputs to have identical codecs and resolutions.
  - `Re-encode`: Slower, but can join videos with different properties.
- **Output Extension**: Specify the container for the final video (e.g. `mp4`).

## 💡 Usage Scenarios

### Scenario A: Optimization Pipeline
You allow users to upload large raw videos, but you need to save storage space.
1. **Operation**: `Compress`.
2. **Preset**: `Medium`.
3. **CRF**: `25` (Good balance).

### Scenario B: Podcast Generation
Turn a Zoom meeting recording into an audio podcast.
1. **Operation**: `Extract Audio`.
2. **Format**: `MP3`.

### Scenario C: Web Animation
Convert a short product demo video into a GIF for an email campaign.
1. **Operation**: `Convert`.
2. **Format**: `GIF`.
3. **Resolution**: `480p` (to keep size manageable).

### Scenario D: Advanced Filtering
Apply a specific watermark or filter complex not covered by standard options.
2. **Arguments**: `-vf "drawtext=text='Watermark':x=10:y=10:fontsize=24:fontcolor=white"`.

### Scenario E: Merging Audio to Video
You have a silent video and a separate voiceover track.
1. **Operation**: `Merge Video & Audio`.
2. **Video Binary Field**: `video`.
3. **Audio Binary Field**: `audio`.
4. **Video Codec**: `Copy` (Fastest, no quality loss).

## 📥 Installation

```bash
npm install @ksoftm/n8n-nodes-ffmpeg-advanced
```

## ⚠️ Requirements

- **Binary Data**: This node requires a binary input field (default: `data`).
- **Memory**: Processing large video files requires significant RAM. Ensure your n8n instance has sufficient resources.
- **Dependencies**: This package includes `@ffmpeg-installer/ffmpeg` to provide the necessary binaries automatically.

## License

MIT
