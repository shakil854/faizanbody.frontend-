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
 * Fetch an image blob safely with CORS and cache-busting (Web fallback)
 */
async function fetchPhotoBlob(url) {
  if (!url) return null;
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
 * Format a photo timestamp into a clean readable date & time string
 * e.g. "18 Oct 2026, 05:48 am"
 */
export function formatPhotoDateTime(createdAt) {
  if (!createdAt) {
    const now = new Date();
    return now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  try {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch {}

  const match = String(createdAt).match(/(\d{10,13})/);
  if (match) {
    try {
      const d = new Date(Number(match[1]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch {}
  }

  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Draws clean, transparent corner badges onto Canvas (NO big black bar covering the truck!)
 * - Bottom-Left: 🚚 FAIZAN BODY & Truck Number
 * - Bottom-Right: 📅 Date & Time
 */
function watermarkImageElement(img, { brandName = 'FAIZAN BODY', dateStr = '', truckNo = '', truck_chassis_no = '' }) {
  const origW = img.naturalWidth || img.width || 1200;
  const origH = img.naturalHeight || img.height || 800;

  // Downscale large camera photos to max 1600px for lightning-fast batch processing without memory exhaustion
  const MAX_DIM = 1600;
  let w = origW;
  let h = origH;
  if (w > MAX_DIM || h > MAX_DIM) {
    if (w > h) {
      h = Math.round((h * MAX_DIM) / w);
      w = MAX_DIM;
    } else {
      w = Math.round((w * MAX_DIM) / h);
      h = MAX_DIM;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1. Draw original photo clean - NO full black bar covering the truck!
  ctx.drawImage(img, 0, 0, w, h);

  // 2. Responsive scaling based on width
  const scale = Math.max(w / 1200, 0.7);
  const margin = Math.round(24 * scale);
  const strokeW = Math.max(2, Math.round(3 * scale));

  // Compute date width on the right first to know exact space available on the left
  const dateFontSize = Math.round(19 * scale);
  let dateWidth = 0;
  if (dateStr) {
    ctx.save();
    ctx.font = `700 ${dateFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    dateWidth = ctx.measureText(dateStr).width;
    ctx.restore();
  }

  // ==========================================
  // LEFT: FAIZAN BODY & Truck / Chassis No
  // ==========================================
  const brandText = (brandName || 'FAIZAN BODY').trim();
  const cleanTruck = String(truckNo || truck_chassis_no || '').trim();

  ctx.save();
  let brandFontSize = Math.round(26 * scale);
  ctx.font = `900 ${brandFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';

  const brandX = margin;
  const brandY = h - margin;

  const leftText = cleanTruck ? `${brandText} • ${cleanTruck}` : brandText;
  const maxLeftWidth = w - dateWidth - margin * 3;
  const leftWidth = ctx.measureText(leftText).width;

  if (leftWidth > maxLeftWidth && cleanTruck) {
    const fitRatio = maxLeftWidth / leftWidth;
    if (fitRatio >= 0.72) {
      // Scale down slightly to fit on the clean single bottom line
      brandFontSize = Math.round(brandFontSize * fitRatio);
      ctx.font = `900 ${brandFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(leftText, brandX, brandY);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.round(4 * scale);
      ctx.shadowOffsetX = Math.round(1.5 * scale);
      ctx.shadowOffsetY = Math.round(1.5 * scale);
      ctx.fillText(leftText, brandX, brandY);
    } else {
      // Narrow portrait or long truck name: 2 stacked lines
      const lineSpacing = Math.round(brandFontSize * 1.15);
      const truckY = brandY - lineSpacing;

      // Line 1 (Upper): Truck / Chassis Number
      ctx.font = `800 ${Math.round(brandFontSize * 0.88)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(cleanTruck, brandX, truckY);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.round(4 * scale);
      ctx.shadowOffsetX = Math.round(1.5 * scale);
      ctx.shadowOffsetY = Math.round(1.5 * scale);
      ctx.fillText(cleanTruck, brandX, truckY);

      // Line 2 (Bottom): FAIZAN BODY
      ctx.font = `900 ${brandFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.strokeText(brandText, brandX, brandY);
      ctx.fillText(brandText, brandX, brandY);
    }
  } else {
    // Standard single line: "FAIZAN BODY • MB1NFCHD2TRHZ0880"
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.lineWidth = strokeW;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(leftText, brandX, brandY);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = Math.round(4 * scale);
    ctx.shadowOffsetX = Math.round(1.5 * scale);
    ctx.shadowOffsetY = Math.round(1.5 * scale);
    ctx.fillText(leftText, brandX, brandY);
  }
  ctx.restore();

  // ==========================================
  // RIGHT: Date & Time (Pure transparent text, NO box)
  // ==========================================
  if (dateStr) {
    ctx.save();
    ctx.font = `700 ${dateFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const dateX = w - margin;
    const dateY = h - margin;

    // Dark outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.lineWidth = strokeW;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(dateStr, dateX, dateY);

    // Warm gold text fill with drop shadow
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = Math.round(4 * scale);
    ctx.shadowOffsetX = Math.round(1.5 * scale);
    ctx.shadowOffsetY = Math.round(1.5 * scale);
    ctx.fillText(dateStr, dateX, dateY);
    ctx.restore();
  }

  return canvas;
}

/**
 * Stamps watermark onto a Base64 image string with automatic memory cleanup
 */
function watermarkBase64(base64Str, meta) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = watermarkImageElement(img, meta);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
          const commaIdx = dataUrl.indexOf(',');
          const result = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;

          // Free canvas and image bitmap memory immediately
          canvas.width = 1;
          canvas.height = 1;
          img.src = '';
          resolve(result);
        } catch (e) {
          console.warn('Canvas watermarking error:', e);
          resolve(base64Str);
        }
      };
      img.onerror = (e) => {
        console.warn('Image load error for watermarking:', e);
        resolve(base64Str);
      };
      const prefix = base64Str.startsWith('data:') ? '' : 'data:image/jpeg;base64,';
      img.src = prefix + base64Str;
    } catch (err) {
      console.warn('watermarkBase64 failed:', err);
      resolve(base64Str);
    }
  });
}

/**
 * Stamps watermark onto a Blob (used for Web share flow)
 */
export async function stampWatermarkOnPhotoBlob(blob, meta) {
  if (!blob) return null;
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = watermarkImageElement(img, meta);
          canvas.toBlob(
            (resBlob) => {
              URL.revokeObjectURL(objectUrl);
              canvas.width = 1;
              canvas.height = 1;
              img.src = '';
              resolve(resBlob || blob);
            },
            'image/jpeg',
            0.90
          );
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(blob);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(blob);
      };
      img.src = objectUrl;
    } catch {
      resolve(blob);
    }
  });
}

/**
 * Shares multiple or single photos directly to WhatsApp / Android share sheet.
 * Stamps clean corner badges on ALL photos reliably without memory exhaustion.
 */
export async function sharePhotos({
  photos = [],
  truckNo = '',
  ownerName = '',
  onProgress = null,
}) {
  if (!photos || photos.length === 0) {
    return { success: false, error: 'No photos selected to share' };
  }

  const total = photos.length;

  // =========================================================================
  // 1. CAPACITOR NATIVE ANDROID / IOS SHARING (Direct WhatsApp launch)
  // =========================================================================
  if (Capacitor.isNativePlatform()) {
    try {
      const cachedUris = [];

      for (let i = 0; i < total; i++) {
        const item = photos[i];
        const url = typeof item === 'string' ? item : (item.url || item.photoUrl);
        if (!url) continue;

        if (onProgress) {
          onProgress(i + 1, total, `Processing photo ${i + 1}/${total}...`);
        }

        const dateStr = formatPhotoDateTime(item.createdAt || item.created_at);
        const itemTruckNo = item.truckNo || truckNo || '';
        const itemOwner = item.ownerName || ownerName || '';

        const tempDlName = `orig_${Date.now()}_${i}.jpg`;
        const watermarkedName = `faizan_${Date.now()}_${i + 1}.jpg`;

        let uriForSharing = null;

        // Step 1a: Download via native Filesystem (bypasses CORS completely on Android)
        try {
          const dlRes = await Filesystem.downloadFile({
            url,
            path: tempDlName,
            directory: Directory.Cache,
          });

          if (dlRes && dlRes.path) {
            // Step 1b: Read as base64 and stamp clean corner watermark
            try {
              const readRes = await Filesystem.readFile({
                path: tempDlName,
                directory: Directory.Cache,
              });
              const rawBase64 = readRes?.data;

              if (rawBase64) {
                const stampedBase64 = await watermarkBase64(rawBase64, {
                  brandName: 'FAIZAN BODY',
                  dateStr,
                  truckNo: itemTruckNo,
                  ownerName: itemOwner,
                });

                await Filesystem.writeFile({
                  path: watermarkedName,
                  data: stampedBase64,
                  directory: Directory.Cache,
                });

                const uriRes = await Filesystem.getUri({
                  path: watermarkedName,
                  directory: Directory.Cache,
                });
                uriForSharing = uriRes?.uri;

                // Cleanup temp original
                try {
                  await Filesystem.deleteFile({ path: tempDlName, directory: Directory.Cache });
                } catch {}
              }
            } catch (wErr) {
              console.warn('Watermark on native failed for item', i, wErr);
            }

            // Fallback to original download if watermarking had any issue
            if (!uriForSharing) {
              const origUriRes = await Filesystem.getUri({
                path: tempDlName,
                directory: Directory.Cache,
              });
              uriForSharing = origUriRes?.uri || dlRes.path;
            }
          }
        } catch (dlErr) {
          console.warn('Filesystem.downloadFile failed on item', i, dlErr);
        }

        if (uriForSharing) {
          cachedUris.push(uriForSharing);
        }

        // Small pause between photos to let Android garbage collector clean up memory
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      // CRITICAL: Pure photo files ONLY (NO text, NO title) so WhatsApp directly launches!
      if (cachedUris.length > 0) {
        await Share.share({
          files: cachedUris,
        });
        return { success: true, count: cachedUris.length, method: 'capacitor_files' };
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
  // 2. WEB BROWSER / CHROME NATIVE FILE SHARE (Pure files ONLY)
  // =========================================================================
  try {
    const fileList = [];
    for (let i = 0; i < total; i++) {
      const item = photos[i];
      const url = typeof item === 'string' ? item : (item.url || item.photoUrl);
      if (!url) continue;

      const blob = await fetchPhotoBlob(url);
      if (blob) {
        const dateStr = formatPhotoDateTime(item.createdAt || item.created_at);
        const stampedBlob = await stampWatermarkOnPhotoBlob(blob, {
          brandName: 'FAIZAN BODY',
          dateStr,
          truckNo: item.truckNo || truckNo || '',
          ownerName: item.ownerName || ownerName || '',
        });
        const finalBlob = stampedBlob || blob;
        fileList.push(
          new File([finalBlob], `faizan_body_${Date.now()}_${i + 1}.jpg`, { type: 'image/jpeg' })
        );
      }
    }

    if (fileList.length > 0 && navigator.canShare && navigator.canShare({ files: fileList })) {
      await navigator.share({
        files: fileList,
      });
      return { success: true, count: fileList.length, method: 'navigator_files' };
    }
  } catch (webShareErr) {
    if (webShareErr?.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    console.warn('Web file share failed:', webShareErr);
  }

  // =========================================================================
  // 3. FALLBACK: Direct Download
  // =========================================================================
  try {
    for (let i = 0; i < total; i++) {
      const item = photos[i];
      const url = typeof item === 'string' ? item : (item.url || item.photoUrl);
      if (!url) continue;

      const blob = await fetchPhotoBlob(url);
      if (blob) {
        const dateStr = formatPhotoDateTime(item.createdAt || item.created_at);
        const stampedBlob = await stampWatermarkOnPhotoBlob(blob, {
          brandName: 'FAIZAN BODY',
          dateStr,
          truckNo: item.truckNo || truckNo || '',
          ownerName: item.ownerName || ownerName || '',
        });
        const finalBlob = stampedBlob || blob;
        const objectUrl = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `faizan_body_${Date.now()}_${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      }
    }
    return { success: true, count: total, method: 'download' };
  } catch (err) {
    console.error('All photo share methods failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Backward compatible single photo share function
 */
export async function sharePhoto({ photoUrl, photo, truckNo, ownerName, shadeNo }) {
  const photoObj = photo ? { ...photo } : { url: photoUrl };
  if (!photoObj.url) photoObj.url = photoUrl;
  if (truckNo && !photoObj.truckNo) photoObj.truckNo = truckNo;
  if (ownerName && !photoObj.ownerName) photoObj.ownerName = ownerName;
  return sharePhotos({
    photos: [photoObj],
    truckNo,
    ownerName,
  });
}

export default {
  sharePhoto,
  sharePhotos,
  stampWatermarkOnPhotoBlob,
  formatPhotoDateTime,
};
