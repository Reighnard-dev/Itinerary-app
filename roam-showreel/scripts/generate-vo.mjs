import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const voiceDir = path.resolve(import.meta.dirname, '..', 'assets', 'audio', 'voice');
fs.mkdirSync(voiceDir, { recursive: true });
const ffmpegBin = 'C:\\Users\\MM\\AppData\\Local\\Programs\\HyperFrames\\resources\\app.asar.unpacked\\vendor\\ffmpeg\\win32-x64\\ffmpeg.exe';
const ffprobeBin = 'C:\\Users\\MM\\AppData\\Local\\Programs\\HyperFrames\\resources\\app.asar.unpacked\\vendor\\ffmpeg\\win32-x64\\ffprobe.exe';

const lines = [
  { id: 'vo-1', text: 'The world is everywhere.' },
  { id: 'vo-2', text: 'So why does planning still feel like chaos?' },
  { id: 'vo-3', text: 'Meet Roam.' },
  { id: 'vo-4', text: 'Pick any city in two hundred and fifty countries — iconic spots and hidden gems.' },
  { id: 'vo-5', text: 'Tap what calls to you. See your whole trip come together.' },
  { id: 'vo-6', text: 'Maps, timings, local transit, and one link to share.' },
  { id: 'vo-7', text: 'Discover it. Plan it. Roam it. A little less ordinary.' },
];

const tts = new MsEdgeTTS();
await tts.setMetadata('en-US-AvaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

const results = [];
for (const line of lines) {
  const rawPath = path.join(voiceDir, `${line.id}-raw.mp3`);
  const wavPath = path.join(voiceDir, `${line.id}.wav`);
  const { audioFilePath } = await tts.toFile(voiceDir, line.text, { rate: '+8%' });
  if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
  fs.renameSync(audioFilePath, rawPath);

  execFileSync(ffmpegBin, [
    '-y',
    '-i', rawPath,
    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,areverse,apad=pad_dur=0.05,loudnorm=I=-16:TP=-1.5:LRA=9',
    '-ar', '48000',
    '-ac', '1',
    '-c:a', 'pcm_s16le',
    wavPath,
  ], { stdio: 'pipe' });

  fs.unlinkSync(rawPath);
  const probe = execFileSync(ffprobeBin, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    wavPath,
  ], { encoding: 'utf8' }).trim();
  results.push({ id: line.id, duration_s: Number(probe), text: line.text });
}

console.log(JSON.stringify(results, null, 2));
