// Extract the 11-char video id from common YouTube URL shapes.
export function youtubeId(url: string): string | null {
  const m = url
    .trim()
    .match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
