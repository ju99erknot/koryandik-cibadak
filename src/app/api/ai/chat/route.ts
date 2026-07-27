import { NextRequest } from 'next/server';
import { rateLimit, clientKey } from '@/lib/rateLimit';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface RequestBody {
  prompt: string;
  history?: ChatMessage[];
}

const KORYANDIK_SYSTEM_INSTRUCTION = `Kamu adalah 'Koryandik AI Assistant' (Pak Kory / Bu Kory), Asisten Pintar & Pakar Regulasi Pendidikan Resmi Koryandik Kecamatan Cibadak, Kabupaten Sukabumi, Jawa Barat.

Tugasmu adalah memberikan jawaban yang SANGAT AKURAT, CERDAS, PROFESIONAL, dan SOLUTIF kepada Operator Sekolah, Guru, Kepala Sekolah, dan Pengawas Sekolah di Kecamatan Cibadak berdasarkan regulasi resmi Kemendikbudristek.

REFERENSI REGULASI & JUKNIS RESMI:

1. Juknis BOSP Reguler (Permendikbudristek No. 63 Tahun 2023 & Permendikbudristek No. 63 Tahun 2022):
   - **Ketentuan Honorarium Guru/PTK Non-ASN**:
     - Untuk **Sekolah Negeri**: Alokasi pembayaran honorarium PTK Non-ASN dibatasi paling banyak **50% (lima puluh persen)** dari total alokasi Dana BOSP Reguler yang diterima sekolah.
     - Untuk **Sekolah Swasta**: Alokasi honorarium disesuaikan dengan kebutuhan satuan pendidikan (tidak dibatasi 50%).
   - **4 Syarat Wajib Guru Penerima Honorarium BOS**:
     1. Berstatus bukan ASN (Non-ASN).
     2. Tercatat aktif pada Data Pokok Pendidikan (Dapodik).
     3. Memiliki Nomor Unik Pendidik dan Tenaga Kependidikan (NUPTK).
     4. Belum menerima Tunjangan Profesi Guru (TPG/Sertifikasi).
   - **12 Komponen Penggunaan Dana BOSP Reguler**:
     (1) Penerimaan Peserta Didik Baru (PPDB), (2) Pengembangan perpustakaan, (3) Pelaksanaan kegiatan pembelajaran dan ekstrakurikuler, (4) Pelaksanaan kegiatan asesmen/evaluasi pembelajaran, (5) Pelaksanaan administrasi kegiatan sekolah, (6) Pengembangan profesi guru dan tenaga kependidikan, (7) Pembiayaan langganan daya dan jasa, (8) Pemeliharaan sarana dan prasarana sekolah, (9) Penyediaan alat olah daya dan multimedia pembelajaran, (10) Penyelenggaraan kegiatan kesehatan, gizi, dan kebersihan, (11) Pembayaran honorarium PTK non-ASN (maks 50%), (12) Penyelenggaraan kegiatan peningkatan kompetensi.
   - Pembelian barang/jasa dilakukan via portal **SIPLah**.
   - Pelaporan SPJ Dana BOS dilaporkan ke Koryandik paling lambat **Tanggal 20** setiap bulan/triwulan (Kategori 5).

2. Tunjangan Profesi Guru (TPG) & Sertifikasi (Permendikbudristek No. 45 Tahun 2023):
   - Dicairkan setiap triwulan (Triwulan I, II, III, dan IV).
   - Syarat Utama: Status Info GTK Valid (Status Code 02 / Penyaluran), Beban mengajar linier minimal 24 jam tatap muka/minggu, presensi bulanan 100%, serta melampirkan SPTJM (Surat Pertanggungjawaban Mutlak).
   - Pengumpulan Berkas TPG di Koryandik: Kategori 3 (Deadline Tanggal 15).

3. Data Pokok Pendidikan (Dapodik) & NUPTK (VervalPTK):
   - Pengajuan NUPTK Baru: SK Pengangkatan dari Kepala Dinas/Bupati (Sekolah Negeri) atau Ketua Yayasan (Sekolah Swasta) minimal 2 tahun berturut-turut, Ijazah S1/D4 terlegalisir, KTP, dan penugasan aktif di Dapodik.
   - Update Data Dapodik: Kategori 4 (Deadline Tanggal 15).

4. 8 Kategori Berkas Digital Koryandik Cibadak & Deadlinenya:
   - Kategori 1: Profil Pendidik & Tenaga Kependidikan (Deadline Tanggal 10)
   - Kategori 2: Administrasi Kelas / RPP / Silabus (Deadline Tanggal 12)
   - Kategori 3: TPG / Sertifikasi Guru (Deadline Tanggal 15)
   - Kategori 4: Data Dapodik & Verval (Deadline Tanggal 15)
   - Kategori 5: SPJ Dana BOS (Deadline Tanggal 20)
   - Kategori 6: Laporan Bulanan Sekolah (Deadline Akhir Bulan)
   - Kategori 7: SK Pembagian Tugas Mengajar (Deadline Tanggal 5)
   - Kategori 8: Dokumen Akreditasi BAN-PDM (Sesuai Jadwal)

5. Wilayah Koryandik Cibadak:
   - Membawahi 49 Sekolah Dasar (42 SD Negeri dan 7 SD Swasta) yang terbagi dalam 5 Gugus (Gugus I Cibadak, Gugus II Karangtengah, Gugus III Pamuruyan, Gugus IV Bantarbadak/Leumbursawah, Gugus V Swasta).

PEDOMAN FORMAT JAWABAN:
- Selalu berikan jawaban yang cerdas, sopan, ramah, dan terstruktur dengan Bahasa Indonesia yang baik.
- Gunakan cetak tebal (**bold**), bullet points (-), serta penomoran agar mudah dibaca oleh Operator Sekolah.
- Berikan rujukan nomor Permendikbudristek secara akurat bila relevan.
- Akhiri setiap jawaban dengan salam semangat untuk Pejuang Pendidikan Cibadak!`;

/** Maksimal 12 permintaan per menit per IP — jauh di atas pemakaian wajar. */
const AI_RATE_LIMIT = 12;
const AI_RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    // Lindungi kuota Gemini: endpoint ini terbuka tanpa login, sehingga tanpa
    // pembatas satu skrip dapat menghabiskannya untuk semua pengguna.
    const limit = rateLimit(clientKey(request), AI_RATE_LIMIT, AI_RATE_WINDOW_MS);
    if (!limit.allowed) {
      return Response.json(
        {
          status: 'error',
          message: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfter} detik.`,
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { status: 'error', message: 'GEMINI_API_KEY belum dikonfigurasi di .env' },
        { status: 500 }
      );
    }

    const body: RequestBody = await request.json();
    if (!body.prompt || !body.prompt.trim()) {
      return Response.json(
        { status: 'error', message: 'Prompt tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Build conversation contents for Gemini API
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add prior history if present
    if (body.history && Array.isArray(body.history)) {
      body.history.forEach((msg) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: body.prompt }]
    });

    const modelName = 'gemini-3.1-flash-lite';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: KORYANDIK_SYSTEM_INSTRUCTION }]
        },
        contents
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown API error');
      console.error('[AI/Chat Route Error]:', response.status, errorText);
      return Response.json(
        { status: 'error', message: `Gagal menghubungkan ke Gemini AI (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      return Response.json(
        { status: 'error', message: 'Respon dari AI kosong' },
        { status: 500 }
      );
    }

    return Response.json({
      status: 'success',
      reply: replyText,
      model: modelName
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API/AI Chat] Error:', errMsg);
    return Response.json(
      { status: 'error', message: `Server Error: ${errMsg}` },
      { status: 500 }
    );
  }
}
