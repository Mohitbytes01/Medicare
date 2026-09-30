/**
 * Normalizes and resizes uploaded prescription images so large camera photos (e.g. 10MB+)
 * or non-standard image MIME types are converted into clean, fast-uploading JPEG base64 data.
 */
export async function normalizeUploadedPrescriptionFile(
  file: File
): Promise<{ dataUrl: string; mimeType: string }> {
  // If PDF, read directly as application/pdf
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: String(reader.result || ''),
          mimeType: 'application/pdf',
        });
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsDataURL(file);
    });
  }

  // Otherwise load into an Image and render onto an HTML5 Canvas (max 1600px)
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_DIM = 800;
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 1000;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg',
          });
          return;
        }

        // Fill white background in case of transparent PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve({
          dataUrl: compressedDataUrl,
          mimeType: 'image/jpeg',
        });
      } catch {
        resolve({
          dataUrl: rawDataUrl,
          mimeType: file.type || 'image/jpeg',
        });
      }
    };
    img.onerror = () => {
      resolve({
        dataUrl: rawDataUrl,
        mimeType: file.type || 'image/jpeg',
      });
    };
    img.src = rawDataUrl;
  });
}
