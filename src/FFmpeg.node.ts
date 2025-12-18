import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IBinaryKeyData,
} from 'n8n-workflow';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

// Set the ffmpeg path locally
ffmpeg.setFfmpegPath(ffmpegPath.path);

export class FFmpeg implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FFmpeg Advanced',
    name: 'ffmpegAdvanced',
    icon: 'fa:film',
    group: ['transform'],
    version: 1,
    description: 'Process video and audio using FFmpeg with advanced and preset capabilities',
    defaults: {
      name: 'FFmpeg',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Convert / Transcode',
            value: 'convert',
            description: 'Change format, resolution, or codec',
          },
          {
            name: 'Compress (Optimize)',
            value: 'compress',
            description: 'Reduce file size using CRF and presets',
          },
          {
            name: 'Extract Audio',
            value: 'extractAudio',
            description: 'Rip audio track from video',
          },
          {
            name: 'Get Metadata (Analysis)',
            value: 'metadata',
            description: 'Return JSON analysis of streams and format',
          },
          {
            name: 'Custom Command',
            value: 'custom',
            description: 'Run raw FFmpeg arguments for complex filters',
          },
          {
            name: 'Image to Video',
            value: 'imageToVideo',
            description: 'Convert static image to video with effects',
          },
          {
            name: 'Merge Video & Audio',
            value: 'merge',
            description: 'Combine video and audio from different sources',
          },
        ],
        default: 'convert',
      },
      // ----------------------------------
      // Operation: Convert
      // ----------------------------------
      {
        displayName: 'Output Format',
        name: 'format',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['convert', 'merge'],
          },
        },
        options: [
          { name: 'MP4', value: 'mp4' },
          { name: 'WebM', value: 'webm' },
          { name: 'AVI', value: 'avi' },
          { name: 'MOV', value: 'mov' },
          { name: 'GIF', value: 'gif' },
        ],
        default: 'mp4',
        description: 'The container format for the output',
      },
      {
        displayName: 'Video Codec',
        name: 'videoCodec',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['convert', 'merge'],
          },
        },
        options: [
          { name: 'Auto', value: 'auto' },
          { name: 'Copy (Stream Copy)', value: 'copy' },
          { name: 'H.264 (libx264)', value: 'libx264' },
          { name: 'VP9 (libvpx-vp9)', value: 'libvpx-vp9' },
        ],
        default: 'auto',
        description: 'Select specific video encoder (e.g., VP9 for efficiency)',
      },
      {
        displayName: 'Audio Codec',
        name: 'audioCodec',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['convert', 'merge'],
          },
        },
        options: [
          { name: 'Auto', value: 'auto' },
          { name: 'AAC', value: 'aac' },
          { name: 'Opus (libopus)', value: 'libopus' },
        ],
        default: 'auto',
        description: 'Select specific audio encoder',
      },
      {
        displayName: 'Resolution',
        name: 'resolution',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['convert'],
          },
        },
        options: [
          { name: 'Keep Original', value: 'original' },
          { name: '1080p', value: '1920x1080' },
          { name: '720p', value: '1280x720' },
          { name: '480p', value: '854x480' },
        ],
        default: 'original',
      },
      {
        displayName: 'Streaming Optimization',
        name: 'streamingOpt',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['convert'],
          },
        },
        default: false,
        description: 'Apply low-latency flags (-fflags nobuffer -flags low_delay) and tuning',
      },
      // ----------------------------------
      // Operation: Compress
      // ----------------------------------
      {
        displayName: 'Compression Level (CRF)',
        name: 'crf',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['compress'],
          },
        },
        typeOptions: {
          minValue: 0,
          maxValue: 51,
        },
        default: 23,
        description: 'Constant Rate Factor. 0 is lossless, 23 is default, 51 is worst quality. Range 18-28 is usually best.',
      },
      {
        displayName: 'Preset',
        name: 'preset',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['compress', 'convert'],
          },
        },
        options: [
          { name: 'Ultrafast', value: 'ultrafast' },
          { name: 'Superfast', value: 'superfast' },
          { name: 'Fast', value: 'fast' },
          { name: 'Medium', value: 'medium' },
          { name: 'Slow', value: 'slow' },
          { name: 'Veryslow', value: 'veryslow' },
        ],
        default: 'medium',
        description: 'Encoding speed vs compression ratio trade-off',
      },
      // ----------------------------------
      // Operation: Extract Audio
      // ----------------------------------
      {
        displayName: 'Audio Format',
        name: 'audioFormat',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['extractAudio'],
          },
        },
        options: [
          { name: 'MP3', value: 'mp3' },
          { name: 'WAV', value: 'wav' },
          { name: 'AAC', value: 'aac' },
        ],
        default: 'mp3',
      },
      // ----------------------------------
      // Operation: Image to Video
      // ----------------------------------
      {
        displayName: 'Presets',
        name: 'animationPreset',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['imageToVideo'],
          },
        },
        options: [
          { name: 'Simple Loop', value: 'simple' },
          { name: 'Zoom Pan', value: 'zoompan', description: 'Slow 1.5x zoom effect' },
          { name: 'YouTube Shorts', value: 'shorts', description: '9:16 crop + zoom' },
          { name: 'YouTube Long', value: 'youtubelong', description: '16:9 crop + zoom' },
        ],
        default: 'zoompan',
      },
      {
        displayName: 'Duration (Seconds)',
        name: 'duration',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['imageToVideo'],
          },
        },
        default: 5,
      },
      {
        displayName: 'Frame Rate',
        name: 'frameRate',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['imageToVideo'],
          },
        },
        default: 25,
      },
      // ----------------------------------
      // Operation: Merge
      // ----------------------------------
      {
        displayName: 'Video Binary Field',
        name: 'videoBinaryProperty',
        type: 'string',
        default: 'video',
        required: true,
        displayOptions: {
          show: {
            operation: ['merge'],
          },
        },
        description: 'The name of the binary property containing the video file',
      },
      {
        displayName: 'Audio Binary Field',
        name: 'audioBinaryProperty',
        type: 'string',
        default: 'audio',
        required: true,
        displayOptions: {
          show: {
            operation: ['merge'],
          },
        },
        description: 'The name of the binary property containing the audio file',
      },
      {
        displayName: 'Shortest',
        name: 'shortest',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            operation: ['merge'],
          },
        },
        description: 'Finish encoding when the shortest input stream ends',
      },
      // ----------------------------------
      // Operation: Custom
      // ----------------------------------
      {
        displayName: 'Custom Arguments',
        name: 'customArgs',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['custom'],
          },
        },
        default: '-c:v libx264 -preset slow -crf 22',
        description: 'Enter raw FFmpeg arguments separated by spaces. Do not include input/output file paths.',
      },
      {
        displayName: 'Output Extension',
        name: 'outputExtension',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['custom'],
          },
        },
        default: 'mp4',
        description: 'The file extension for the resulting file (e.g. mp4, mp3)',
      },
      // ----------------------------------
      // Save Options
      // ----------------------------------
      {
        displayName: 'Save to File',
        name: 'saveToFile',
        type: 'boolean',
        default: false,
        description: 'Whether to save the processed file to a specific path on the disk instead of returning binary data',
      },
      {
        displayName: 'Output File Path',
        name: 'filePath',
        type: 'string',
        default: '',
        placeholder: '/path/to/output/video.mp4',
        displayOptions: {
          show: {
            saveToFile: [true],
          },
        },
        description: 'Full absolute path where the file should be saved. Ensure the directory exists and is writable.',
      },
      {
        displayName: 'Output Filename',
        name: 'fileName',
        type: 'string',
        default: '',
        placeholder: 'my_video',
        displayOptions: {
          show: {
            saveToFile: [false],
          },
        },
        description: 'Optional custom filename (without extension) for the binary data. If empty, a UUID will be used.',
      },
      // ----------------------------------
      // Standard Properties
      // ----------------------------------
      {
        displayName: 'Input Binary Field',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        description: 'The name of the binary property containing the media file to process',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
        const saveToFile = this.getNodeParameter('saveToFile', i) as boolean;


        if (!items[i].binary || !items[i].binary![binaryPropertyName]) {
          throw new Error(`Item ${i} does not contain binary data with name "${binaryPropertyName}"`);
        }

        const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
        const tempDir = os.tmpdir();

        let command: ffmpeg.FfmpegCommand;
        const tempFilesToDelete: string[] = [];

        if (operation === 'merge') {
          const videoProp = this.getNodeParameter('videoBinaryProperty', i) as string;
          const audioProp = this.getNodeParameter('audioBinaryProperty', i) as string;

          if (!items[i].binary || !items[i].binary![videoProp] || !items[i].binary![audioProp]) {
            throw new Error(`Item ${i} must contain both binary data properties: "${videoProp}" and "${audioProp}"`);
          }

          const videoBuffer = await this.helpers.getBinaryDataBuffer(i, videoProp);
          const audioBuffer = await this.helpers.getBinaryDataBuffer(i, audioProp);

          const videoFileName = `video_in_${uuidv4()}`;
          const audioFileName = `audio_in_${uuidv4()}`;
          const videoPath = path.join(tempDir, videoFileName);
          const audioPath = path.join(tempDir, audioFileName);

          fs.writeFileSync(videoPath, videoBuffer);
          fs.writeFileSync(audioPath, audioBuffer);
          tempFilesToDelete.push(videoPath, audioPath);

          // Initialize FFmpeg with Video Input
          command = ffmpeg(videoPath).input(audioPath);
        } else {
          const inputFileName = `input_${uuidv4()}`;
          const inputFilePath = path.join(tempDir, inputFileName);

          // Write binary to disk (FFmpeg needs file paths for best performance)
          fs.writeFileSync(inputFilePath, inputBuffer);
          tempFilesToDelete.push(inputFilePath);

          // Initialize FFmpeg
          command = ffmpeg(inputFilePath);
        }

        if (operation === 'metadata') {
          // Handle Metadata Analysis
          // For metadata, we used 'inputFilePath' which might not exist in scope or match logic above.
          // We can use the first file in tempFilesToDelete as the primary input.
          const metadata = await new Promise((resolve, reject) => {
            const primaryInput = tempFilesToDelete[0];
            ffmpeg.ffprobe(primaryInput, (err, metadata) => {
              if (err) reject(err);
              else resolve(metadata);
            });
          });

          returnData.push({
            json: metadata as any,
            binary: items[i].binary,
          });

          // Cleanup
          // Cleanup
          tempFilesToDelete.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
          continue;
        }

        // Handle Processing Operations
        let outputFileName = `output_${uuidv4()}`;
        let outputExtension = 'mp4';

        // Configure Command based on Operation
        if (operation === 'convert') {
          outputExtension = this.getNodeParameter('format', i) as string;
          const resolution = this.getNodeParameter('resolution', i) as string;
          const preset = this.getNodeParameter('preset', i) as string;
          const videoCodec = this.getNodeParameter('videoCodec', i) as string;
          const audioCodec = this.getNodeParameter('audioCodec', i) as string;
          const streamingOpt = this.getNodeParameter('streamingOpt', i) as boolean;

          if (resolution !== 'original') {
            command.size(resolution);
          }

          // Apply Video Codec
          if (videoCodec !== 'auto') {
            command.videoCodec(videoCodec);
          }

          // Apply Audio Codec
          if (audioCodec !== 'auto') {
            command.audioCodec(audioCodec);
          }

          // Apply Streaming Optimizations
          if (streamingOpt) {
            // Flags for low latency and no buffer (Real-time streaming optimization)
            command.addOption('-fflags', 'nobuffer');
            command.addOption('-flags', 'low_delay');
            // Tune for zero latency if using x264
            if (videoCodec === 'libx264' || videoCodec === 'auto') {
              command.addOption('-tune', 'zerolatency');
            }
          }

          command.outputOptions(`-preset ${preset}`);

        } else if (operation === 'compress') {
          const crf = this.getNodeParameter('crf', i) as number;
          const preset = this.getNodeParameter('preset', i) as string;
          // Standard H.264 compression settings
          command.videoCodec('libx264')
            .outputOptions(`-crf ${crf}`)
            .outputOptions(`-preset ${preset}`);

        } else if (operation === 'extractAudio') {
          outputExtension = this.getNodeParameter('audioFormat', i) as string;
          command.noVideo();

        } else if (operation === 'imageToVideo') {
          const preset = this.getNodeParameter('animationPreset', i) as string;
          const duration = this.getNodeParameter('duration', i) as number;
          const fps = this.getNodeParameter('frameRate', i) as number;
          outputExtension = 'mp4';

          // Input options for image loop
          command.inputOptions(['-loop 1']);

          // Output options
          command.outputOptions([`-t ${duration}`, '-pix_fmt yuv420p']);

          if (preset === 'zoompan') {
            // ZoomPan effect: 5s duration default, but dynamic based on input
            const frames = Math.ceil(duration * fps);
            // "zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720"
            const filter = `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
            command.outputOptions(['-vf', filter, '-c:v libx264']);
          } else if (preset === 'shorts') {
            // YouTube Shorts: 9:16 crop + zoom
            const frames = Math.ceil(duration * fps);
            // "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=..."
            const zoomPart = `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920`;
            const filter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${zoomPart}`;
            command.outputOptions(['-vf', filter, '-c:v libx264']);
          } else if (preset === 'youtubelong') {
            // YouTube Long: 16:9 crop + zoom (1920x1080)
            const frames = Math.ceil(duration * fps);
            // "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=..."
            const zoomPart = `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
            const filter = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,${zoomPart}`;
            command.outputOptions(['-vf', filter, '-c:v libx264']);
          } else {
            // Simple loop
            command.outputOptions(['-c:v libx264', '-preset medium']);
          }

        } else if (operation === 'custom') {
          outputExtension = this.getNodeParameter('outputExtension', i) as string;
          const args = (this.getNodeParameter('customArgs', i) as string).split(' ');
          command.outputOptions(args);

        } else if (operation === 'merge') {
          outputExtension = this.getNodeParameter('format', i) as string;
          const videoCodec = this.getNodeParameter('videoCodec', i) as string;
          const audioCodec = this.getNodeParameter('audioCodec', i) as string;
          const shortest = this.getNodeParameter('shortest', i) as boolean;

          if (videoCodec !== 'auto') {
            command.videoCodec(videoCodec);
          }
          if (audioCodec !== 'auto') {
            command.audioCodec(audioCodec);
          }
          if (shortest) {
            command.outputOptions('-shortest');
          }
        }

        const outputFilePath = path.join(tempDir, `${outputFileName}.${outputExtension}`);

        // Execute FFmpeg
        await new Promise((resolve, reject) => {
          command
            .on('end', () => resolve(true))
            .on('error', (err) => reject(new Error(`FFmpeg processing failed: ${err.message}`)))
            .save(outputFilePath);
        });

        if (saveToFile) {
          // Save to specific path
          const targetPath = this.getNodeParameter('filePath', i) as string;

          if (!targetPath) {
            throw new Error('File path is required when "Save to File" is enabled.');
          }

          // Ensure directory exists
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          fs.copyFileSync(outputFilePath, targetPath);

          returnData.push({
            json: {
              ...items[i].json,
              outputFilePath: targetPath,
              saved: true
            },
            binary: {},
          });

        } else {
          // Return as Binary Data
          const outputBuffer = fs.readFileSync(outputFilePath);

          const customFileName = this.getNodeParameter('fileName', i) as string;
          const finalFileName = customFileName ? `${customFileName}.${outputExtension}` : `${outputFileName}.${outputExtension}`;

          // Prepare Binary Data
          const binaryData: IBinaryKeyData = {};
          binaryData[binaryPropertyName] = await this.helpers.prepareBinaryData(
            outputBuffer,
            finalFileName
          );

          returnData.push({
            json: items[i].json,
            binary: binaryData,
          });
        }

        // Cleanup temporary files
        tempFilesToDelete.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
        if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
