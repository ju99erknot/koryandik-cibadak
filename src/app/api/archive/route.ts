// ============================================================
// Koryandik Cibadak — Google Drive Archive Proxy API Route
// Proxies archive requests to APIKORYANDIK Google Apps Script Web App
// ============================================================

import { NextRequest } from 'next/server';

interface ArchiveRequestBody {
  fileId: string;
  fileName: string;
  gugus: string;
  school: string;
  category: string;
}

interface GASResponse {
  status: 'success' | 'error';
  copiedFileId?: string;
  url?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate GAS URL is configured
    const gasUrl = process.env.GAS_ARCHIVE_URL;
    if (!gasUrl) {
      return Response.json(
        { status: 'error', message: 'GAS_ARCHIVE_URL belum dikonfigurasi di .env.local' },
        { status: 500 }
      );
    }

    // 2. Parse & validate request body
    const body: ArchiveRequestBody = await request.json();

    if (!body.fileId || !body.fileName || !body.gugus || !body.school || !body.category) {
      return Response.json(
        {
          status: 'error',
          message: 'Parameter tidak lengkap. Diperlukan: fileId, fileName, gugus, school, category',
        },
        { status: 400 }
      );
    }

    // 3. Forward request to Google Apps Script Web App
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const gasResponse = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: body.fileId,
        fileName: body.fileName,
        gugus: body.gugus,
        school: body.school,
        category: body.category,
      }),
      signal: controller.signal,
      redirect: 'follow', // GAS redirects to googleusercontent.com
    });

    clearTimeout(timeout);

    // 4. Parse GAS response
    const gasData: GASResponse = await gasResponse.json();

    if (gasData.status === 'success') {
      return Response.json({
        status: 'success',
        copiedFileId: gasData.copiedFileId,
        archiveUrl: gasData.url,
        message: `Berkas berhasil diarsipkan ke Google Drive Koryandik Pusat`,
      });
    } else {
      return Response.json(
        {
          status: 'error',
          message: gasData.message || 'Gagal mengarsipkan berkas ke Google Drive',
        },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    // Handle abort/timeout
    if (errMsg === 'This operation was aborted') {
      return Response.json(
        { status: 'error', message: 'Timeout: Google Apps Script tidak merespon dalam 30 detik' },
        { status: 504 }
      );
    }

    console.error('[API/Archive] Error:', errMsg);
    return Response.json(
      { status: 'error', message: `Server error: ${errMsg}` },
      { status: 500 }
    );
  }
}
