/**
 * Photo Sharing Utility for Faizan Body Works
 * Shares ONLY the pure photo file (no extra text, no caption) directly to WhatsApp / Android share sheet.
 */

export async function sharePhoto({ photoUrl }) {
  if (!photoUrl) return { success: false, error: 'No photo URL' };

  const fileName = 'photo.jpg';

  // 1. Try Native Image File Share (Shares ONLY the pure photo file, no text message!)
  try {
    const response = await fetch(photoUrl, { mode: 'cors', cache: 'no-cache' });
    if (response.ok) {
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        return { success: true, method: 'native_file' };
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    console.warn('Native image file share failed:', err);
  }

  // 2. Fallback: Native URL share (only URL, no text)
  if (navigator.share) {
    try {
      await navigator.share({
        url: photoUrl,
      });
      return { success: true, method: 'native_url' };
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
    }
  }

  // 3. Fallback: Direct download
  const a = document.createElement('a');
  a.href = photoUrl;
  a.download = fileName;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return { success: true, method: 'download' };
}
