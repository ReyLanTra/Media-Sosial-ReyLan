/**
 * Utilitas untuk menangani upload file ke Supabase Storage melalui API Route internal.
 * Hal ini memastikan upload dilakukan dengan aman dan mengikuti aturan penamaan file.
 */
export async function handleUpload(file: File, bucket: string, customId?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  if (customId) {
    formData.append('customId', customId);
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Gagal mengunggah file.';
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Gagal parse JSON meskipun header-nya JSON
      }
    } else {
      // Jika bukan JSON (misal teks "Request Entity Too Large" atau HTML error)
      const textError = await response.text();
      if (response.status === 413 || textError.includes('Too Large')) {
        errorMessage = 'Ukuran file terlalu besar. Silakan kompres file atau gunakan file yang lebih kecil.';
      } else if (textError.length < 100) {
        errorMessage = textError || errorMessage;
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal mengunggah file.');
  }

  return data.url;
}
