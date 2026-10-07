import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToStorage } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 1. Validasi Autentikasi Admin
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' },
        { status: 401 }
      );
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string | null;
    const customId = formData.get('customId') as string | null;

    if (!file || !bucket) {
      return NextResponse.json(
        { success: false, error: 'File dan nama bucket wajib disertakan.' },
        { status: 400 }
      );
    }

    // Validasi batas ukuran file (Maksimal 50MB = 52.428.800 bytes)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file melebihi batas maksimal 50MB. Silakan kompres file Anda.' },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Simpan ke Supabase Storage murni (menggunakan service_role bypass RLS)
    const publicUrl = await uploadFileToStorage(
      bucket,
      buffer,
      file.name,
      customId || undefined
    );

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('API Upload error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Terjadi kesalahan internal server saat upload.' },
      { status: 500 }
    );
  }
}
