import * as XLSX from 'xlsx';
import type { LkBospBreakdown, LkBospBhpItem, LkBospKibItem, LkBospMaintenanceItem } from './types';
import { schoolsData } from './schoolsData';

export interface ParsedLkBospResult {
  schoolName: string;
  npsn: string;
  gugus: string;
  periodYear: number;
  triwulan: 1 | 2 | 3 | 4;
  saldoAwal: number;
  totalPenerimaan: number;
  totalRealisasi: number;
  sisaSaldo: number;
  saldoRekening: number;
  saldoKasTunai: number;
  breakdown: LkBospBreakdown;
  validationWarnings?: string[];
}

/**
 * Single Source of Truth Parser for LK BOSP Excel Workbooks.
 * Primary Master Sheet: 'Realisasi BOS - BPK Format'
 * Exact Verified Column Mappings:
 * - Col B: Nama Sekolah
 * - Col C: NPSN
 * - Col D: Kecamatan
 * - Col F: Saldo Awal
 * - Col G: Total Penerimaan
 * - Col H: Belanja Barang Pakai Habis (BHP)
 * - Col J: Jasa Tenaga Pendidik dan Kependidikan (Honor)
 * - Col K: Daya dan Jasa
 * - Col L: Pemeliharaan (Bahan Pemeliharaan)
 * - Col M: Upah Pemeliharaan (Jasa Tukang)
 * - Col N: Biaya Pendaftaran Lomba/Bimtek/Workshop
 * - Col O: Honor Kegiatan
 * - Col P: Makan Minum / Perjalanan Dinas
 * - Col Q: TOTAL BELANJA BARANG DAN JASA (Sum H + J + K + L + M + N + O + P)
 * - Col R: Peralatan dan Mesin (KIB B)
 * - Col S: Aset Tetap Lainnya (KIB E)
 * - Col T: TOTAL BELANJA MODAL (Sum R + S)
 * - Col U: TOTAL REALISASI DANA BOS (Sum Q + T)
 * - Col V: SISA DANA BOS (G - U)
 * - Col W: Saldo Rekening
 * - Col X: Saldo Kas Tunai
 */
export function parseLkBospExcel(arrayBuffer: ArrayBuffer, npsnTarget?: string, customSchools?: any[]): ParsedLkBospResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const validationWarnings: string[] = [];

  // Default empty breakdown
  const breakdown: LkBospBreakdown = {
    bhp: 0,
    honor: 0,
    dayaJasa: 0,
    pemeliharaan: 0,
    upahPemeliharaan: 0,
    lombaBimtek: 0,
    honorKegiatan: 0,
    makanMinum: 0,
    perdin: 0,
    kibB: 0,
    kibE: 0,
    totalBarangJasa: 0,
    totalModal: 0,
    itemsBhp: [],
    itemsKibB: [],
    itemsKibE: [],
    itemsPemeliharaan: [],
  };

  let schoolName = '';
  let npsn = npsnTarget || '';
  const gugus = '';
  const periodYear = 2026;
  const triwulan: 1 | 2 | 3 | 4 = 1;
  let saldoAwal = 0;
  let totalPenerimaan = 0;
  let totalRealisasi = 0;
  let sisaSaldo = 0;
  let saldoRekening = 0;
  let saldoKasTunai = 0;

  // ============================================================
  // STEP 1: PARSE MASTER SHEET 'Realisasi BOS - BPK Format' (UTAMA)
  // ============================================================
  const masterSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('realisasi bos'));
  if (masterSheetName) {
    const sheet = workbook.Sheets[masterSheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z500');

    // Helper to get cell value by column letter and row number (1-based)
    const getCell = (colLetter: string, rowNum: number): string | number | null => {
      const cellAddress = `${colLetter}${rowNum}`;
      const cell = sheet[cellAddress];
      if (!cell || cell.v === undefined || cell.v === null) return null;
      return cell.v;
    };

    let targetRowIndex = -1;

    // Scan data rows (starting row 8 up to max row)
    for (let r = 8; r <= range.e.r + 1; r++) {
      const rowNpsn = String(getCell('C', r) || '').trim();
      const rowName = String(getCell('B', r) || getCell('D', r) || '').trim();

      if (!rowName || rowName.toLowerCase().includes('jumlah') || rowName.toLowerCase().includes('total')) continue;

      if (npsnTarget && (rowNpsn === npsnTarget || rowNpsn.includes(npsnTarget))) {
        targetRowIndex = r;
        schoolName = rowName;
        npsn = rowNpsn;
        break;
      }

      // If no npsnTarget specified, grab the first valid school row that has non-zero values
      if (!targetRowIndex && rowNpsn && rowNpsn.length >= 7 && !rowNpsn.toLowerCase().includes('npsn')) {
        const valU = Number(getCell('U', r)) || 0;
        const valH = Number(getCell('H', r)) || 0;
        if (valU > 0 || valH > 0 || !npsnTarget) {
          targetRowIndex = r;
          schoolName = rowName;
          npsn = rowNpsn;
        }
      }
    }

    // Fallback: search by school name if NPSN match failed
    if (targetRowIndex === -1) {
      for (let r = 8; r <= range.e.r + 1; r++) {
        const rowName = String(getCell('B', r) || '').trim();
        const valH = Number(getCell('H', r)) || 0;
        const valU = Number(getCell('U', r)) || 0;
        if (rowName && (valH > 0 || valU > 0)) {
          targetRowIndex = r;
          schoolName = rowName;
          npsn = String(getCell('C', r) || npsnTarget || '');
          break;
        }
      }
    }

    if (targetRowIndex !== -1) {
      const r = targetRowIndex;

      // Extract EXACT verified BPK columns:
      saldoAwal = Number(getCell('F', r)) || 0;
      totalPenerimaan = Number(getCell('G', r)) || saldoAwal;

      breakdown.bhp = Number(getCell('H', r)) || 0;
      breakdown.honor = Number(getCell('J', r)) || 0;
      breakdown.dayaJasa = Number(getCell('K', r)) || 0;
      breakdown.pemeliharaan = Number(getCell('L', r)) || 0;
      breakdown.upahPemeliharaan = Number(getCell('M', r)) || 0;
      breakdown.lombaBimtek = Number(getCell('N', r)) || 0;
      breakdown.honorKegiatan = Number(getCell('O', r)) || 0;
      breakdown.makanMinum = Number(getCell('P', r)) || 0;
      breakdown.perdin = 0; // Perdin/MakanMinum in Col P

      // Col Q: Total Belanja Barang dan Jasa (Sum H+J+K+L+M+N+O+P)
      breakdown.totalBarangJasa = Number(getCell('Q', r)) || (
        breakdown.bhp + breakdown.honor + breakdown.dayaJasa + breakdown.pemeliharaan +
        breakdown.upahPemeliharaan + breakdown.lombaBimtek + breakdown.honorKegiatan +
        breakdown.makanMinum
      );

      // Col R: Peralatan dan Mesin (KIB B)
      breakdown.kibB = Number(getCell('R', r)) || 0;
      // Col S: Aset Tetap Lainnya (KIB E)
      breakdown.kibE = Number(getCell('S', r)) || 0;
      // Col T: Total Belanja Modal (Sum R+S)
      breakdown.totalModal = Number(getCell('T', r)) || (breakdown.kibB + breakdown.kibE);

      // Col U: Total Realisasi Dana BOS (Sum Q+T)
      totalRealisasi = Number(getCell('U', r)) || (breakdown.totalBarangJasa + breakdown.totalModal);
      // Col V: Sisa Dana BOS (G - U)
      sisaSaldo = Number(getCell('V', r)) || (totalPenerimaan - totalRealisasi);
      // Col W: Saldo Rekening
      saldoRekening = Number(getCell('W', r)) || sisaSaldo;
      // Col X: Saldo Kas Tunai
      saldoKasTunai = Number(getCell('X', r)) || 0;
    }
  }

  // ============================================================
  // STEP 2: PARSE SUB-SHEETS FOR ITEMIZED LINE BREAKDOWN
  // ============================================================

  // 2a. Sheet 'BHP'
  const bhpSheetName = workbook.SheetNames.find(s => s.toLowerCase() === 'bhp' || s.toLowerCase().includes('barang habis pakai'));
  if (bhpSheetName) {
    const sheet = workbook.Sheets[bhpSheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const items: LkBospBhpItem[] = [];
    let sumBhp = 0;

    for (let r = 5; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 5) continue;
      const namaBarang = String(row[5] || row[4] || '').trim();
      if (!namaBarang || namaBarang.toLowerCase().includes('total') || namaBarang.toLowerCase().includes('jumlah')) continue;

      const satuan = String(row[9] || row[7] || '').trim();
      const kuantitasMasuk = Number(row[10] || row[8]) || 0;
      const hargaMasuk = Number(row[11] || row[9]) || 0;
      const totalMasuk = Number(row[12] || row[10]) || (kuantitasMasuk * hargaMasuk);
      const kuantitasKeluar = Number(row[12] || row[11]) || 0;
      const hargaKeluar = Number(row[13] || row[12]) || 0;
      const totalKeluar = Number(row[14] || row[13]) || (kuantitasKeluar * hargaKeluar);
      const bastOrInvoice = String(row[15] || row[14] || '').trim();

      if (namaBarang && (totalMasuk > 0 || totalKeluar > 0)) {
        items.push({
          no: items.length + 1,
          namaBarang,
          satuan,
          kuantitasMasuk,
          hargaMasuk,
          totalMasuk,
          kuantitasKeluar,
          hargaKeluar,
          totalKeluar,
          bastOrInvoice,
        });
        sumBhp += (totalKeluar || totalMasuk);
      }
    }
    breakdown.itemsBhp = items;
    if (breakdown.bhp === 0 && sumBhp > 0) breakdown.bhp = sumBhp;

    if (breakdown.bhp > 0 && sumBhp > 0 && Math.abs(breakdown.bhp - sumBhp) > 100) {
      validationWarnings.push(`Selisih BHP: Total Master (${breakdown.bhp.toLocaleString('id-ID')}) != Sum Sheet BHP (${sumBhp.toLocaleString('id-ID')})`);
    }
  }

  // 2b. Sheet 'peralatan dan Mesin (B)' (KIB B)
  const kibBSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('peralatan') || s.toLowerCase().includes('kib b'));
  if (kibBSheetName) {
    const sheet = workbook.Sheets[kibBSheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const items: LkBospKibItem[] = [];
    let sumKibB = 0;

    for (let r = 5; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 5) continue;
      const namaBarang = String(row[23] || row[18] || row[4] || '').trim();
      if (!namaBarang || namaBarang.toLowerCase().includes('total')) continue;

      const volume = Number(row[20] || row[6]) || 0;
      const hargaSatuan = Number(row[22] || row[7]) || 0;
      const totalHarga = Number(row[23] || row[8]) || (volume * hargaSatuan);

      if (totalHarga > 0) {
        items.push({
          no: items.length + 1,
          namaBarang,
          kategori: 'KIB B',
          bentukKontrak: String(row[11] || '').trim(),
          program: String(row[6] || '').trim(),
          kegiatan: String(row[7] || '').trim(),
          kodeRekening108: String(row[16] || row[19] || '').trim(),
          volume,
          hargaSatuan,
          totalHarga,
          bastOrInvoice: String(row[26] || row[14] || '').trim(),
          pengurusBarang: String(row[30] || '').trim(),
        });
        sumKibB += totalHarga;
      }
    }
    breakdown.itemsKibB = items;
    if (breakdown.kibB === 0 && sumKibB > 0) breakdown.kibB = sumKibB;
  }

  // 2c. Sheet 'Asset Tetap Lainnya (E)' (KIB E)
  const kibESheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('asset tet') || s.toLowerCase().includes('kib e'));
  if (kibESheetName) {
    const sheet = workbook.Sheets[kibESheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const items: LkBospKibItem[] = [];
    let sumKibE = 0;

    for (let r = 5; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 5) continue;
      const spesifikasiJudul = String(row[23] || row[18] || row[4] || '').trim();
      const namaBarang = String(row[22] || row[17] || spesifikasiJudul || '').trim();
      if (!namaBarang || namaBarang.toLowerCase().includes('total')) continue;

      const volume = Number(row[20] || row[6]) || 0;
      const hargaSatuan = Number(row[22] || row[7]) || 0;
      const totalHarga = Number(row[23] || row[8]) || (volume * hargaSatuan);

      if (totalHarga > 0) {
        items.push({
          no: items.length + 1,
          namaBarang,
          kategori: 'KIB E',
          spesifikasiJudul,
          bentukKontrak: String(row[11] || '').trim(),
          kodeRekening108: String(row[16] || row[19] || '').trim(),
          volume,
          hargaSatuan,
          totalHarga,
          bastOrInvoice: String(row[26] || row[14] || '').trim(),
          pengurusBarang: String(row[30] || '').trim(),
        });
        sumKibE += totalHarga;
      }
    }
    breakdown.itemsKibE = items;
    if (breakdown.kibE === 0 && sumKibE > 0) breakdown.kibE = sumKibE;
  }

  // 2d. Sheet 'Rincian pemelihraan' & 'Rincian Jasa Upah Pemelihraan'
  const maintSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('rincian pemelihraan'));
  if (maintSheetName) {
    const sheet = workbook.Sheets[maintSheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const items: LkBospMaintenanceItem[] = [];
    let sumMaint = 0;

    for (let r = 7; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 5) continue;
      const uraian = String(row[4] || row[5] || '').trim();
      if (!uraian || uraian.toLowerCase().includes('total')) continue;

      const volume = Number(row[5] || row[6]) || 0;
      const satuan = String(row[6] || row[7] || 'unit').trim();
      const hargaSatuan = Number(row[7] || row[8]) || 0;
      const totalHarga = Number(row[8] || row[9]) || (volume * hargaSatuan);

      if (totalHarga > 0) {
        items.push({
          no: items.length + 1,
          jenis: 'Bahan',
          uraian,
          volume,
          satuan,
          hargaSatuan,
          totalHarga,
        });
        sumMaint += totalHarga;
      }
    }
    breakdown.itemsPemeliharaan = items;
    if (breakdown.pemeliharaan === 0 && sumMaint > 0) breakdown.pemeliharaan = sumMaint;
  }

  // Recalculate totals
  breakdown.totalBarangJasa = breakdown.bhp + breakdown.honor + breakdown.dayaJasa + breakdown.pemeliharaan +
    breakdown.upahPemeliharaan + breakdown.lombaBimtek + breakdown.honorKegiatan + breakdown.makanMinum;
  breakdown.totalModal = breakdown.kibB + breakdown.kibE;
  if (totalRealisasi === 0) totalRealisasi = breakdown.totalBarangJasa + breakdown.totalModal;
  if (sisaSaldo === 0) sisaSaldo = totalPenerimaan - totalRealisasi;

  // Auto lookup official Gugus and canonical School Name / NPSN from dynamic schools DB / schoolsData
  const schoolList = (customSchools && customSchools.length > 0) ? customSchools : schoolsData;
  const matchedSchool = schoolList.find(s => s.npsn === npsn || s.name.toLowerCase() === schoolName.toLowerCase() || s.name.toLowerCase().includes(schoolName.toLowerCase()));
  let gugusVal = gugus;
  if (matchedSchool) {
    npsn = matchedSchool.npsn;
    schoolName = matchedSchool.name;
    gugusVal = matchedSchool.gugus;
  }

  return {
    schoolName,
    npsn,
    gugus: gugusVal,
    periodYear,
    triwulan,
    saldoAwal,
    totalPenerimaan,
    totalRealisasi,
    sisaSaldo,
    saldoRekening,
    saldoKasTunai,
    breakdown,
    validationWarnings,
  };
}

/**
 * Bulk Extractor for Admin to import all 49 schools from Master Excel file at once.
 */
export function parseAllSchoolsFromMasterExcel(arrayBuffer: ArrayBuffer): ParsedLkBospResult[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const results: ParsedLkBospResult[] = [];

  const masterSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('realisasi bos'));
  if (!masterSheetName) return results;

  const sheet = workbook.Sheets[masterSheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z500');

  const getCell = (colLetter: string, rowNum: number): string | number | null => {
    const cellAddress = `${colLetter}${rowNum}`;
    const cell = sheet[cellAddress];
    if (!cell || cell.v === undefined || cell.v === null) return null;
    return cell.v;
  };

  for (let r = 8; r <= range.e.r + 1; r++) {
    const npsn = String(getCell('C', r) || '').trim();
    const schoolName = String(getCell('B', r) || getCell('D', r) || '').trim();

    if (!schoolName || schoolName.toLowerCase().includes('jumlah') || schoolName.toLowerCase().includes('total')) continue;
    if (!npsn || npsn.length < 7 || npsn.toLowerCase().includes('npsn')) continue;

    const saldoAwal = Number(getCell('F', r)) || 0;
    const totalPenerimaan = Number(getCell('G', r)) || saldoAwal;

    const breakdown: LkBospBreakdown = {
      bhp: Number(getCell('H', r)) || 0,
      honor: Number(getCell('J', r)) || 0,
      dayaJasa: Number(getCell('K', r)) || 0,
      pemeliharaan: Number(getCell('L', r)) || 0,
      upahPemeliharaan: Number(getCell('M', r)) || 0,
      lombaBimtek: Number(getCell('N', r)) || 0,
      honorKegiatan: Number(getCell('O', r)) || 0,
      makanMinum: Number(getCell('P', r)) || 0,
      perdin: 0,
      totalBarangJasa: Number(getCell('Q', r)) || 0,
      kibB: Number(getCell('R', r)) || 0,
      kibE: Number(getCell('S', r)) || 0,
      totalModal: Number(getCell('T', r)) || 0,
    };

    breakdown.totalBarangJasa = breakdown.bhp + breakdown.honor + breakdown.dayaJasa + breakdown.pemeliharaan +
      breakdown.upahPemeliharaan + breakdown.lombaBimtek + breakdown.honorKegiatan + breakdown.makanMinum;
    breakdown.totalModal = breakdown.kibB + breakdown.kibE;

    const totalRealisasi = Number(getCell('U', r)) || (breakdown.totalBarangJasa + breakdown.totalModal);
    const sisaSaldo = Number(getCell('V', r)) || (totalPenerimaan - totalRealisasi);
    const saldoRekening = Number(getCell('W', r)) || sisaSaldo;
    const saldoKasTunai = Number(getCell('X', r)) || 0;

    results.push({
      schoolName,
      npsn,
      gugus: '',
      periodYear: 2026,
      triwulan: 1,
      saldoAwal,
      totalPenerimaan,
      totalRealisasi,
      sisaSaldo,
      saldoRekening,
      saldoKasTunai,
      breakdown,
    });
  }

  return results;
}
