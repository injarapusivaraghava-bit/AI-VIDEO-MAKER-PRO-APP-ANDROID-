export function downloadBlobFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareMediaFile(params: {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
}): Promise<{ sharedNative: boolean; cancelled?: boolean; gestureExpired?: boolean }> {
  const { blob, fileName, title, text } = params;
  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return { sharedNative: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { sharedNative: false, cancelled: true };
      }
      // If async video rendering exceeded browser user-gesture activation window
      // or iframe policy blocked Web Share, fall back gracefully to file download.
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        downloadBlobFile(blob, fileName);
        return { sharedNative: false, gestureExpired: err?.name === 'NotAllowedError' };
      }
      throw err;
    }
  }

  // Fallback on desktop/unsupported browsers: download the file so user can attach to WhatsApp/Instagram
  downloadBlobFile(blob, fileName);
  return { sharedNative: false };
}

export function getWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function detectBestVideoExportCodec(): { mimeType: string; ext: 'mp4' | 'webm' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', ext: 'webm' };
  }
  const mp4Candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];
  for (const m of mp4Candidates) {
    if (MediaRecorder.isTypeSupported(m)) {
      return { mimeType: m, ext: 'mp4' };
    }
  }
  const webmCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of webmCandidates) {
    if (MediaRecorder.isTypeSupported(m)) {
      return { mimeType: m, ext: 'webm' };
    }
  }
  return { mimeType: 'video/webm', ext: 'webm' };
}
