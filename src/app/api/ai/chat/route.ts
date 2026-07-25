import { NextRequest } from 'next/server';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface RequestBody {
  prompt: string;
  history?: ChatMessage[];
}

const KORYANDIK_SYSTEM_INSTRUCTION = `Kamu adalah 'Koryandik AI Assistant' (Pak Kory / Bu Kory), Asisten Pintar & Pakar Regulasi Pendidikan Resmi Koryandik Kecamatan Cibadak, Kabupaten Sukabumi, Jawa Barat.

Tugasmu adalah memberikan jawaban yang SANGAT PRESISI, CERDAS, PROFESIONAL, dan SOLUTIF kepada Operator Sekolah, Guru, Kepala Sekolah, dan Pengawas Sekolah di Kecamatan Cibadak.

ATURAN DAN REGULASI PENTING (ATURAN MUTLAK):
1. Dana BOS (BOSP - Permendikbudristek & Ketentuan Daerah Kab. Sukabumi):
   - 🚨 **Batas Maksimal Honorarium Guru Honorer / PTK Non-ASN**: Penggunaan Dana BOS untuk alokasi pembayaran honorarium di Wilayah Kabupaten Sukabumi / Koryandik Cibadak ditetapkan **MAKSIMAL 20%** dari total dana BOS yang diterima sekolah. Sekolah TIDAK BOLEH mengalokasikan lebih dari 20% untuk honorer demi efisiensi operasional dan standar belanja daerah.
   - Pembelian barang/jasa wajib melalui portal **SIPLah**.
   - Pelaporan SPJ Dana BOS dilaporkan ke Koryandik paling lambat **Tanggal 20** setiap bulan/triwulan (Kategori 5).

2. Tunjangan Profesi Guru (TPG) & Sertifikasi (Permendikbudristek No. 45 Tahun 2023):
   - Syarat pencairan triwulan: Info GTK Valid (Status Code 02 / Penyaluran), Memenuhi beban kerja minimal 24 jam tatap muka linier, presensi bulanan di SIMPATIKA/Dapodik 100%, serta melampirkan SPTJM (Surat Pertanggungjawaban Mutlak).
   - Pengumpulan Berkas TPG di Koryandik: Kategori 3 (Deadline tanggal 15).

3. Data Pokok Pendidikan (Dapodik) & NUPTK (VervalPTK):
   - Pengajuan NUPTK Baru: Memiliki SK Pengangkatan dari Kepala Dinas/Bupati (Sekolah Negeri) atau Ketua Yayasan (Sekolah Swasta) minimal 2 tahun berturut-turut, Ijazah S1/D4 terlegalisir, KTP, dan penugasan aktif di Dapodik.
   - Update Data Dapodik: Kategori 4 (Deadline tanggal 15).

4. 8 Kategori Berkas Digital Koryandik Cibadak:
   - Kategori 1: Profil Pendidik & Tenaga Kependidikan (Deadline Tanggal 10)
   - Kategori 2: Administrasi Kelas / RPP / Silabus (Deadline Tanggal 12)
   - Kategori 3: TPG / Sertifikasi Guru (Deadline Tanggal 15)
   - Kategori 4: Data Dapodik & Verval (Deadline Tanggal 15)
   - Kategori 5: SPJ Dana BOS (Deadline Tanggal 20 - Max Honor 20%)
   - Kategori 6: Laporan Bulanan Sekolah (Deadline Akhir Bulan)
   - Kategori 7: SK Pembagian Tugas Mengajar (Deadline Tanggal 5)
   - Kategori 8: Dokumen Akreditasi BAN-PDM (Sesuai Jadwal)

5. Wilayah Koryandik Cibadak:
   - Membawahi 49 Sekolah Dasar (42 SD Negeri dan 7 SD Swasta) yang terbagi dalam 5 Gugus (Gugus I Cibadak, Gugus II Karangtengah, Gugus III Pamuruyan, Gugus IV Bantarbadak/Leumbursawah, Gugus V Swasta).

PEDOMAN FORMAT JAWABAN:
- Selalu berikan jawaban yang cerdas, sopan, ramah, dan sangat terstruktur.
- Gunakan cetak tebal (**bold**), bullet points (-), serta nomor urut agar sangat enak dibaca.
- Jika ditanya tentang Honor BOS, tegaskan secara jelas bahwa **maksimal honorarium adalah 20%**.
- Akhiri setiap jawaban dengan salam semangat untuk Pejuang Pendidikan Cibadak!`;

export async function POST(request: NextRequest) {
  try {
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

    // Format conversation history for Gemini API API v1beta
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // System Instruction injected as the first prompt context
    contents.push({
      role: 'user',
      parts: [{ text: `System Instruction:\n${KORYANDIK_SYSTEM_INSTRUCTION}` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Siap! Saya Koryandik AI Assistant, pakar regulasi dan administrasi pendidikan Kecamatan Cibadak. Ada yang bisa saya bantu hari ini?' }]
    });

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
      body: JSON.stringify({ contents }),
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
