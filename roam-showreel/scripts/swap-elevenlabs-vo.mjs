import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('Set ELEVENLABS_API_KEY in your environment before running this script.');
  process.exit(1);
}

// Default: Rachel (21m00Tcm4TlvDq8ikWAM) or Bella/Aria — override via ELEVENLABS_VOICE_ID
const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const voiceDir = path.resolve(import.meta.dirname, '..', 'assets', 'audio', 'voice');
const ffmpegBin = process.env.FFMPEG_PATH || 'C:\\Users\\MM\\AppData\\Local\\Programs\\HyperFrames\\resources\\app.asar.unpacked\\vendor\\ffmpeg\\win32-x64\\ffmpeg.exe';

const lines = [
  { id: 'vo-1', text: 'The world is everywhere.' },
  { id: 'vo-2', text: 'So why does planning still feel like chaos?' },
  { id: 'vo-3', text: 'Meet Roam.' },
  { id: 'vo-4', text: 'Pick any city in two hundred and fifty countries — iconic spots and hidden gems.' },
  { id: 'vo-5', text: 'Tap what calls to you. See your whole trip come together.' },
  { id: 'vo-6', text: 'Maps, timings, local transit, and one link to share.' },
  { id: 'vo-7', text: 'Discover it. Plan it. Roam it. A little less ordinary.' },
];

fs.mkdirSync(voiceDir, { recursive: true });

for (const line of lines) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: line.text,
      model_id: modelId,
      voice_settings: { stability: 0.45, similarity_boost: 0.78, style: 0.25 },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs failed for ${line.id}: ${res.status} ${await res.text()}`);
  }
  const rawPath = path.join(voiceDir, `${line.id}-el.mp3`);
  const wavPath = path.join(voiceDir, `${line.id}.wav`);
  fs.writeFileSync(rawPath, Buffer.from(await res.arrayBuffer()));
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
  console.log(`Updated ${line.id}.wav from ElevenLabs`);
}
