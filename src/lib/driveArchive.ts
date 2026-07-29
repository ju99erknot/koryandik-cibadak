// ============================================================
// Koryandik Cibadak — Google Drive Archive Helper (Client-Side)
// Calls /api/archive which proxies to APIKORYANDIK GAS Web App
// ============================================================

export interface ArchiveParams {
  driveLink: string;   // Google Drive URL of the submitted file
  fileName: string;    // Display name for the archived copy
  gugusName: string;   // e.g. "Gugus I"
  schoolName: string;  // e.g. "SDN 01 Cibadak"
  categoryName: string; // e.g. "SPJ Dana BOS"
}

export interface ArchiveResult {
  success: boolean;
  copiedFileId?: string;
  archiveUrl?: string;
  message: string;
}

/**
 * Extracts Google Drive File ID from various URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://docs.google.com/document/d/FILE_ID/edit
 * - https://docs.google.com/spreadsheets/d/FILE_ID/edit
 * - Direct FILE_ID string
 */
export function extractDriveFileId(driveLink: string): string | null {
  if (!driveLink) return null;

  // Pattern 1: /d/FILE_ID/ or /d/FILE_ID (end of string)
  const matchD = driveLink.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (matchD) return matchD[1];

  // Pattern 2: ?id=FILE_ID or &id=FILE_ID
  const matchId = driveLink.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (matchId) return matchId[1];

  // Pattern 3: Already a raw File ID (no slashes, no dots, 10+ chars)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(driveLink)) return driveLink;

  return null;
}

/**
 * Archives a submission file to the Koryandik Pusat Shared Google Drive.
 * 
 * This function is called after a pengawas/admin approves a submission.
 * It sends the file info to our Next.js API route (/api/archive), which
 * then forwards it to the APIKORYANDIK Google Apps Script Web App to
 * copy the file into the organized folder hierarchy:
 * 
 *   Main Folder → Gugus → School → Category
 * 
 * @returns ArchiveResult with success status and archived file URL
 */
export async function archiveSubmissionToDrive(params: ArchiveParams): Promise<ArchiveResult> {
  try {
    // 1. Extract File ID from the Drive Link
    const fileId = extractDriveFileId(params.driveLink);
    if (!fileId) {
      return {
        success: false,
        message: `Tidak dapat mengekstrak File ID dari tautan: ${params.driveLink}`,
      };
    }

    // 2. Call our proxy API route
    const response = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        fileName: params.fileName,
        gugus: params.gugusName,
        school: params.schoolName,
        category: params.categoryName,
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      return {
        success: true,
        copiedFileId: data.copiedFileId,
        archiveUrl: data.archiveUrl,
        message: data.message || 'Berkas berhasil diarsipkan ke Google Drive Koryandik Pusat',
      };
    } else {
      return {
        success: false,
        message: data.message || `Gagal mengarsipkan berkas (HTTP ${response.status})`,
      };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Network error';
    console.error('[DriveArchive] Error:', errMsg);
    return {
      success: false,
      message: `Gagal terhubung ke server arsip: ${errMsg}`,
    };
  }
}
