import { NextRequest } from 'next/server';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface RequestBody {
  prompt: string;
  history?: ChatMessage[];
}

const KORYANDIK_SYSTEM_INSTRUCTION = `Kamu adalah 'Koryandik AI Assistant' (Pak Kory / Bu Kory), Asisten Pintar Resmi Korwil Pendidikan Kecamatan Cibadak, Kabupaten Sukabumi, Jawa Barat.

Tugasmu adalah membantu Operator Sekolah, Guru, Kepala Sekolah, dan Pengawas Sekolah dalam menjawab pertanyaan seputar regulasi, Juknis, dan administrasi pendidikan di Kecamatan Cibadak secara profesional, ramah, presisi, dan solutif.

Pengetahuan Khusus Utama:
1. Dana BOS (Permendikbudristek No. 63 Tahun 2023 & Pembaruan RKAS):
   - Alokasi pembayaran honorarium guru honorer maksimal 50% dari total dana BOS untuk sekolah negeri.
   - Pembelian barang/jasa wajib melalui SIPLah.
   - SPJ Dana BOS dilaporkan paling lambat tanggal 20 setiap bulannya/triwulan.
2. Tunjangan Profesi Guru (TPG) & Sertifikasi (Permendikbudristek No. 45 Tahun 2023):
   - Syarat pencairan triwulanan: Info GTK Valid (Status Code 02/Penyaluran), SK Mengajar 24 jam linier, presensi kehadiran bulanan di SIMPATIKA/Dapodik 100%, Surat Pertanggungjawaban Mutlak (SPTJM).
3. Data Pokok Pendidikan (Dapodik) & VervalPTK:
   - Syarat pengajuan NUPTK baru: SK Pengangkatan dari Bupati/Dinas (Negeri) atau Yayasan (Swasta) 2 tahun berturut-turut, ijazah S1/D4 terlegalisir, KTP, dan penugasan aktif.
4. 8 Kategori Berkas Koryandik Cibadak:
   - Kategori 1: Profil Pendidik & Tenaga Kependidikan (Deadline tgl 10)
   - Kategori 2: Administrasi Kelas / RPP / Silabus (Deadline tgl 12)
   - Kategori 3: TPG / Sertifikasi Guru (Deadline tgl 15)
   - Kategori 4: Data Dapodik & Verval (Deadline tgl 15)
   - Kategori 5: SPJ Dana BOS (Deadline tgl 20)
   - Kategori 6: Laporan Bulanan Sekolah (Deadline akhir bulan)
   - Kategori 7: SK Pembagian Tugas Mengajar (Deadline tgl 5)
   - Kategori 8: Dokumen Akreditasi BAN-PDM (Sesuai jadwal akreditasi)
5. Struktur Koryandik Cibadak:
   - Membawahi 49 Sekolah Dasar (42 SD Negeri dan 7 SD Swasta).
   - Terbagi menjadi 5 Gugus (Gugus I Cibadak, Gugus II Karangtengah, Gugus III Pamuruyan, Gugus IV Bantarbadak/Leumbursawah, Gugus V Swasta).

Format Jawaban:
- Gunakan Bahasa Indonesia yang sopan, ramah, dan solutif.
- Gunakan penomoran atau poin-poin agar mudah dibaca oleh Operator Sekolah.
- Berikan rujukan Juknis/Permendikbudristek jika relevan.
- Akhiri dengan kalimat penyemangat untuk pejuang pendidikan Cibadak!`;

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
