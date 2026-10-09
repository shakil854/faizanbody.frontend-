import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Converts a Blob to pure Base64 string (without data: URL prefix)
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        const commaIdx = dataUrl.indexOf(',');
        resolve(commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl);
      } else {
        resolve('');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch an image blob safely with CORS and cache-busting
 */
async function fetchPhotoBlob(url) {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
    if (res.ok) {
      return await res.blob();
    }
  } catch (e) {
    console.warn('Fetch with cors failed, trying direct fetch:', e);
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.blob();
    }
  } catch (e) {
    console.warn('Direct fetch failed:', e);
  }

  return null;
}

/**
 * Photo Sharing Utility for Faizan Body Works
 * Shares ONLY the pure photo file (strictly NO text, NO caption) directly to WhatsApp / Android share sheet.
 */
export async function sharePhoto({ photoUrl }) {
  if (!photoUrl) return { success: false, error: 'No photo URL' };

  const safeFileName = `photo_${Date.now()}.jpg`;

  // =========================================================================
  // 1. CAPACITOR NATIVE ANDROID / IOS SHARING (Pure photo file ONLY, no text)
  // =========================================================================
  if (Capacitor.isNativePlatform()) {
    try {
      let cachedUri = null;

      // Try 1a: Direct download to device cache
      try {
        const downloadRes = await Filesystem.downloadFile({
          url: photoUrl,
          path: safeFileName,
          directory: Directory.Cache,
        });

        if (downloadRes && downloadRes.path) {
          const uriRes = await Filesystem.getUri({
            path: safeFileName,
            directory: Directory.Cache,
          });
          cachedUri = uriRes?.uri || downloadRes.path;
        }
      } catch (dlErr) {
        console.warn('Filesystem.downloadFile failed, trying blob write fallback:', dlErr);
      }

      // Try 1b: Fetch blob & write base64 to cache
      if (!cachedUri) {
        const blob = await fetchPhotoBlob(photoUrl);
        if (blob) {
          const base64Data = await blobToBase64(blob);
          if (base64Data) {
            await Filesystem.writeFile({
              path: safeFileName,
              data: base64Data,
              directory: Directory.Cache,
            });
            const uriRes = await Filesystem.getUri({
              path: safeFileName,
              directory: Directory.Cache,
            });
            cachedUri = uriRes?.uri;
          }
        }
      }

      // Pure photo file only - NO caption, NO text
      if (cachedUri) {
        await Share.share({
          files: [cachedUri],
        });
        return { success: true, method: 'capacitor_file' };
      }
    } catch (nativeErr) {
      if (
        nativeErr?.message?.includes('cancel') ||
        nativeErr?.message?.includes('closed') ||
        nativeErr?.name === 'AbortError'
      ) {
        return { success: false, cancelled: true };
      }
      console.warn('Capacitor native share failed, trying Web Share API:', nativeErr);
    }
  }

  // =========================================================================
  // 2. WEB BROWSER / CHROME NATIVE FILE SHARE (Pure photo file ONLY, no text)
  // =========================================================================
  try {
    const blob = await fetchPhotoBlob(photoUrl);
    if (blob) {
      const file = new File([blob], safeFileName, { type: blob.type || 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        return { success: true, method: 'navigator_file' };
      }
    }
  } catch (webShareErr) {
    if (webShareErr?.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    console.warn('Web file share failed:', webShareErr);
  }

  // =========================================================================
  // 3. FALLBACK: Direct Photo File Download (Pure photo file without opening browser tabs)
  // =========================================================================
  try {
    const blob = await fetchPhotoBlob(photoUrl);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = safeFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      return { success: true, method: 'download' };
    }
  } catch (err) {
    console.error('All photo share methods failed:', err);
    return { success: false, error: err.message };
  }

  return { success: false, error: 'Could not share photo' };
}

