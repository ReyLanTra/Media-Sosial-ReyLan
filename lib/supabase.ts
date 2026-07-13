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
    const error = await response.json();
    throw new Error(error.error || 'Gagal mengunggah file.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal mengunggah file.');
  }

  return data.url;
}
