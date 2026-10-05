import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Capture photo directly from native Android camera or fallback
 */
export async function capturePhotoFromCamera() {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: false,
    });

    if (!image || !image.webPath) return null;

    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const filename = `truck_camera_${Date.now()}.${image.format || 'jpg'}`;
    const file = new File([blob], filename, { type: `image/${image.format || 'jpeg'}` });
    return [file];
  } catch (err) {
    // If user cancelled, don't throw an error
    if (err.message && (err.message.includes('cancelled') || err.message.includes('canceled'))) {
      return null;
    }
    console.warn('Native camera error, fallback needed:', err);
    throw err;
  }
}

/**
 * Pick photos from native Android gallery or fallback
 */
export async function pickPhotosFromGallery() {
  try {
    // Use multi-image picker if supported
    if (typeof Camera.pickImages === 'function') {
      const result = await Camera.pickImages({
        quality: 85,
        limit: 10,
      });

      if (result && result.photos && result.photos.length > 0) {
        const files = await Promise.all(
          result.photos.map(async (p, idx) => {
            const resp = await fetch(p.webPath);
            const blob = await resp.blob();
            const filename = `truck_gallery_${Date.now()}_${idx}.${p.format || 'jpg'}`;
            return new File([blob], filename, { type: `image/${p.format || 'jpeg'}` });
          })
        );
        return files;
      }
    }

    // Single photo fallback
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });

    if (!image || !image.webPath) return null;

    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const filename = `truck_gallery_${Date.now()}.${image.format || 'jpg'}`;
    const file = new File([blob], filename, { type: `image/${image.format || 'jpeg'}` });
    return [file];
  } catch (err) {
    if (err.message && (err.message.includes('cancelled') || err.message.includes('canceled'))) {
      return null;
    }
    console.warn('Native gallery error, fallback needed:', err);
    throw err;
  }
}
