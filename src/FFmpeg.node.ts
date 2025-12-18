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
          {
            name: 'Concatenate Videos',
            value: 'concatenate',
            description: 'Join multiple video files sequentially',
          },

        ],
        default: 'convert',
      },
      {
        displayName: 'Input Source',
        name: 'inputSource',
        type: 'options',
        options: [
          {
            name: 'Binary Field',
            value: 'binary',
          },
          {
            name: 'File Path',
            value: 'path',
          },
        ],
        default: 'binary',
        displayOptions: {
          show: {
            operation: ['convert', 'compress', 'custom', 'imageToVideo', 'metadata'],
          },
        },
      },
      {
        displayName: 'Input File Path',
        name: 'inputPath',
        type: 'string',
        default: '',
        placeholder: '/path/to/video.mp4',
        displayOptions: {
          show: {
            inputSource: ['path'],
            operation: ['convert', 'compress', 'custom', 'imageToVideo', 'metadata'],
          },
        },
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
      // ----------------------------------
      // Operation: Concatenate
      // ----------------------------------
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
      // Operation: Concatenate
      // ----------------------------------
      // ----------------------------------
      // Operation: Concatenate
      // ----------------------------------
      {
        displayName: 'Input Source',
        name: 'inputSourceConcat',
        type: 'options',
        options: [
          {
            name: 'Binary Items (Multiple Items)',
            value: 'binaryItems',
            description: 'Use binary data from multiple incoming items',
          },
          {
            name: 'File Paths (List/Array)',
            value: 'pathList',
            description: 'Use a list of file paths from a single item',
          },
        ],
        default: 'binaryItems',
        displayOptions: {
          show: {
            operation: ['concatenate'],
          },
        },
      },
      {
        displayName: 'File Paths',
        name: 'filesListField',
        type: 'string',
        default: '',
        placeholder: '/tmp/video1.mp4, /tmp/video2.mp4',
        description: 'Comma-separated paths or an expression resolving to an Array of strings',
        displayOptions: {
          show: {
            operation: ['concatenate'],
            inputSourceConcat: ['pathList'],
          },
        },
      },
      {
        displayName: 'Concatenation Method',
        name: 'concatenationMethod',
        type: 'options',
        options: [
          {
            name: 'Stream Copy (Fast, Same Codecs)',
            value: 'copy',
            description: 'Uses concat demuxer. Fast, no quality loss, but requires identical codecs/resolutions.',
          },
          {
            name: 'Re-encode (Compatible, Different Codecs)',
            value: 'reencode',
            description: 'Uses concat filter. Slower, normalizes inputs to same format.',
          },
        ],
        default: 'copy',
        displayOptions: {
          show: {
            operation: ['concatenate'],
          },
        },
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
            operation: ['custom', 'concatenate'],
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
        displayOptions: {
          show: {
            inputSource: ['binary'],
          },
          hide: {
            operation: ['merge'],
          }
        },
      },

    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const tempDir = os.tmpdir();

    // Check for Aggregation Operation (Concatenate)
    const firstOperation = this.getNodeParameter('operation', 0) as string;

    if (firstOperation === 'concatenate') {
      const inputSource = this.getNodeParameter('inputSourceConcat', 0, 'binaryItems') as string;
      const method = this.getNodeParameter('concatenationMethod', 0) as string;
      const saveToFile = this.getNodeParameter('saveToFile', 0) as boolean;
      const outputExtension = this.getNodeParameter('outputExtension', 0) as string;

      const inputFiles: string[] = [];
      const fileListPath = path.join(tempDir, `filelist_${uuidv4()}.txt`);

      // Gather inputs based on Source
      if (inputSource === 'pathList') {
        // Single Item with List of Paths
        const filesListInput = this.getNodeParameter('filesListField', 0) as string;
        if (!filesListInput) {
          throw new Error('File Paths field is empty');
        }

        let paths: string[] = [];
        if (Array.isArray(filesListInput)) {
          paths = filesListInput;
        } else if (typeof filesListInput === 'string') {
          if (filesListInput.includes(',')) {
            paths = filesListInput.split(',').map(p => p.trim());
          } else {
            paths = [filesListInput.trim()];
          }
        }

        // Validate paths
        for (const p of paths) {
          if (!p) continue;
          if (!fs.existsSync(p)) {
            if (this.continueOnFail()) {
              // Log warning?
            } else {
              throw new Error(`Input file not found: ${p}`);
            }
          }
          inputFiles.push(p);
        }

      } else {
        // Binary Items (Legacy / Default)
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;
        for (let i = 0; i < items.length; i++) {
          if (!items[i].binary || !items[i].binary![binaryPropertyName]) {
            continue;
          }
          const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
          const inputFileName = `concat_in_${i}_${uuidv4()}.${outputExtension}`;
          const inputFilePath = path.join(tempDir, inputFileName);
          fs.writeFileSync(inputFilePath, inputBuffer);
          inputFiles.push(inputFilePath);
        }
      }

      if (inputFiles.length === 0) {
        if (this.continueOnFail()) {
          return [items];
        }
        throw new Error('No valid input files found for concatenation');
      }

      let command: ffmpeg.FfmpegCommand;
      const outputFileName = `concat_output_${uuidv4()}`;
      const outputFilePath = path.join(tempDir, `${outputFileName}.${outputExtension}`);

      if (method === 'copy') {
        const fileListContent = inputFiles.map(f => `file '${f}'`).join('\n');
        fs.writeFileSync(fileListPath, fileListContent);

        command = ffmpeg();
        command
          .input(fileListPath)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions('-c copy');
      } else {
        command = ffmpeg();
        inputFiles.forEach(f => command.input(f));
        command.complexFilter(`concat=n=${inputFiles.length}:v=1:a=1`);
        command.outputOptions('-c:v libx264');
      }

      await new Promise((resolve, reject) => {
        command
          .on('end', () => resolve(true))
          .on('error', (err) => reject(new Error(`FFmpeg concat failed: ${err.message}`)))
          .save(outputFilePath);
      });

      if (saveToFile) {
        const targetPath = this.getNodeParameter('filePath', 0) as string;
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(outputFilePath, targetPath);

        returnData.push({
          json: { ...items[0].json, saved: true, outputFilePath: targetPath },
          binary: {}
        });
      } else {
        const outputBuffer = fs.readFileSync(outputFilePath);
        const binaryData: IBinaryKeyData = {};
        binaryData['data'] = await this.helpers.prepareBinaryData(outputBuffer, `${outputFileName}.${outputExtension}`);

        returnData.push({
          json: { ...items[0].json, concatenatedCount: inputFiles.length },
          binary: binaryData
        });
      }

      // Cleanup
      if (inputSource === 'binaryItems') {
        inputFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
      }
      if (fs.existsSync(fileListPath)) fs.unlinkSync(fileListPath);
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      return [returnData];
    }

    // Standard Loop
    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const saveToFile = this.getNodeParameter('saveToFile', i) as boolean;
        const inputSource = this.getNodeParameter('inputSource', i, 'binary') as string;

        let command: ffmpeg.FfmpegCommand;
        const tempFilesToDelete: string[] = [];
        const tempDir = os.tmpdir();

        // 1. Prepare Input
        let inputFilePath = '';

        if (operation === 'merge') {
          const videoProp = this.getNodeParameter('videoBinaryProperty', i) as string;
          const audioProp = this.getNodeParameter('audioBinaryProperty', i) as string;

          // Merge currently only supports binary inputs based on existing properties
          // Converting to path support would require structural changes to 'merge' props
          // For now, keeping as is or we can add path support if requested.
          // User request was generic "Getting duplickets...".
          // I will leave merge as-is but respect check for props.

          const videoBuffer = await this.helpers.getBinaryDataBuffer(i, videoProp);
          const audioBuffer = await this.helpers.getBinaryDataBuffer(i, audioProp);

          const videoPath = path.join(tempDir, `video_in_${uuidv4()}`);
          const audioPath = path.join(tempDir, `audio_in_${uuidv4()}`);

          fs.writeFileSync(videoPath, videoBuffer);
          fs.writeFileSync(audioPath, audioBuffer);
          tempFilesToDelete.push(videoPath, audioPath);

          command = ffmpeg(videoPath).input(audioPath);

        } else if (inputSource === 'path') {
          inputFilePath = this.getNodeParameter('inputPath', i) as string;
          if (!inputFilePath || !fs.existsSync(inputFilePath)) {
            throw new Error(`Input file not found: ${inputFilePath}`);
          }
          command = ffmpeg(inputFilePath);

        } else {
          // Binary Input
          const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
          if (!items[i].binary || !items[i].binary![binaryPropertyName]) {
            throw new Error(`Item ${i} does not contain binary data with name "${binaryPropertyName}"`);
          }
          const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
          inputFilePath = path.join(tempDir, `input_${uuidv4()}`);
          fs.writeFileSync(inputFilePath, inputBuffer);
          tempFilesToDelete.push(inputFilePath);

          command = ffmpeg(inputFilePath);
        }

        // 2. Metadata
        if (operation === 'metadata') {
          // For metadata, we need to ensure we have a valid input path.
          // If binary, inputFilePath is set. If path, inputFilePath is set.
          const metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(items[i].json.inputPath as string || inputFilePath, (err, metadata) => {
              if (err) reject(err);
              else resolve(metadata);
            });
          });

          returnData.push({
            json: metadata as any,
            binary: items[i].binary,
          });
          tempFilesToDelete.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
          continue;
        }

        // 3. Configure Output
        let outputFileName = `output_${uuidv4()}`;
        let outputExtension = 'mp4';

        if (operation === 'convert') {
          outputExtension = this.getNodeParameter('format', i) as string;
          const resolution = this.getNodeParameter('resolution', i) as string;
          const preset = this.getNodeParameter('preset', i) as string;
          const videoCodec = this.getNodeParameter('videoCodec', i) as string;
          const audioCodec = this.getNodeParameter('audioCodec', i) as string;
          const streamingOpt = this.getNodeParameter('streamingOpt', i) as boolean;

          if (resolution !== 'original') command.size(resolution);
          if (videoCodec !== 'auto') command.videoCodec(videoCodec);
          if (audioCodec !== 'auto') command.audioCodec(audioCodec);
          if (streamingOpt) {
            command.addOption('-fflags', 'nobuffer');
            command.addOption('-flags', 'low_delay');
            if (videoCodec === 'libx264' || videoCodec === 'auto') {
              command.addOption('-tune', 'zerolatency');
            }
          }
          command.outputOptions(`-preset ${preset}`);

        } else if (operation === 'compress') {
          const crf = this.getNodeParameter('crf', i) as number;
          const preset = this.getNodeParameter('preset', i) as string;
          command.videoCodec('libx264').outputOptions(`-crf ${crf}`).outputOptions(`-preset ${preset}`);

        } else if (operation === 'extractAudio') {
          outputExtension = this.getNodeParameter('audioFormat', i) as string;
          command.noVideo();

        } else if (operation === 'imageToVideo') {
          // For imageToVideo, input is usually an image binary or path.
          // Existing logic: command.inputOptions(['-loop 1']);
          // Handled naturally by command init above.
          const preset = this.getNodeParameter('animationPreset', i) as string;
          const duration = this.getNodeParameter('duration', i) as number;
          const fps = this.getNodeParameter('frameRate', i) as number;
          outputExtension = 'mp4';

          command.inputOptions(['-loop 1']);
          command.outputOptions([`-t ${duration}`, '-pix_fmt yuv420p']);

          const frames = Math.ceil(duration * fps);
          if (preset === 'zoompan') {
            const filter = `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`;
            command.outputOptions(['-vf', filter, '-c:v libx264']);
          } else if (preset === 'shorts') {
            const zoomPart = `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920`;
            const filter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${zoomPart}`;
            command.outputOptions(['-vf', filter, '-c:v libx264']);
          } else if (preset === 'youtubelong') {
            const zoomPart = `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
            const filter = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,${zoomPart}`;
            command.outputOptions(['-vf', filter, '-c:v libx264']);
          } else {
            command.outputOptions(['-c:v libx264', '-preset medium']);
          }

        } else if (operation === 'custom') {
          outputExtension = this.getNodeParameter('outputExtension', i) as string;
          const args = (this.getNodeParameter('customArgs', i) as string).split(' ');
          command.outputOptions(args);
        }

        const outputFilePath = path.join(tempDir, `${outputFileName}.${outputExtension}`);

        await new Promise((resolve, reject) => {
          command
            .on('end', () => resolve(true))
            .on('error', (err) => reject(new Error(`FFmpeg processing failed: ${err.message}`)))
            .save(outputFilePath);
        });

        if (saveToFile) {
          const targetPath = this.getNodeParameter('filePath', i) as string;
          if (!targetPath) throw new Error('File path required for save');
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.copyFileSync(outputFilePath, targetPath);

          returnData.push({
            json: { ...items[i].json, saved: true, outputFilePath: targetPath },
            binary: {}
          });
        } else {
          const outputBuffer = fs.readFileSync(outputFilePath);
          const customFileName = this.getNodeParameter('fileName', i) as string;
          const finalFileName = customFileName ? `${customFileName}.${outputExtension}` : `${outputFileName}.${outputExtension}`;

          // We need to decide which PROPERTY to put output in.
          // Usually same as input check, or default 'data'.
          // If 'path' input, we don't have a binary property name. Default to 'data'.
          let outBinProp = 'data';
          if (inputSource === 'binary') {
            outBinProp = this.getNodeParameter('binaryPropertyName', i) as string;
          }

          const binaryData: IBinaryKeyData = {};
          binaryData[outBinProp] = await this.helpers.prepareBinaryData(outputBuffer, finalFileName);

          returnData.push({
            json: items[i].json,
            binary: binaryData,
          });
        }

        // Cleanup
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
