import * as XLSX from 'xlsx';
import type { LkBospBreakdown, LkBospBhpItem, LkBospKibItem, LkBospMaintenanceItem } from './types';

export interface ParsedLkBospResult {
  schoolName?: string;
  npsn?: string;
  gugus?: string;
  periodYear: number;
  triwulan: 1 | 2 | 3 | 4;
  saldoAwal: number;
  totalPenerimaan: number;
  totalRealisasi: number;
  sisaSaldo: number;
  breakdown: LkBospBreakdown;
}

export function parseLkBospExcel(arrayBuffer: ArrayBuffer, npsnTarget?: string): ParsedLkBospResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

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

  // 1. Parse 'Realisasi BOS - BPK Format' Sheet
  const masterSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('realisasi bos'));
  if (masterSheetName) {
    const sheet = workbook.Sheets[masterSheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Search for target row by NPSN or school name, or first data row
    let targetRow: (string | number | null)[] | null = null;
    for (let r = 8; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;
      const rNpsn = String(row[2] || '').trim();
      const rName = String(row[1] || row[3] || '').trim();

      if (npsnTarget && (rNpsn === npsnTarget || rNpsn.includes(npsnTarget))) {
        targetRow = row;
        schoolName = rName || schoolName;
        npsn = rNpsn;
        break;
      }
      if (!targetRow && rNpsn && rNpsn.length >= 7 && !rNpsn.toLowerCase().includes('npsn')) {
        targetRow = row;
        schoolName = rName;
        npsn = rNpsn;
      }
    }

    if (targetRow) {
      saldoAwal = Number(targetRow[5]) || 0;
      totalPenerimaan = Number(targetRow[6]) || 0;
      breakdown.bhp = Number(targetRow[7]) || 0;
      breakdown.honor = Number(targetRow[8]) || 0;
      breakdown.dayaJasa = Number(targetRow[9]) || 0;
      breakdown.pemeliharaan = Number(targetRow[10]) || 0;
      breakdown.upahPemeliharaan = Number(targetRow[11]) || 0;
      breakdown.lombaBimtek = Number(targetRow[12]) || 0;
      breakdown.honorKegiatan = Number(targetRow[13]) || 0;
      breakdown.makanMinum = Number(targetRow[14]) || 0;
      breakdown.perdin = Number(targetRow[15]) || 0;
      breakdown.totalBarangJasa = Number(targetRow[16]) || (
        breakdown.bhp + breakdown.honor + breakdown.dayaJasa + breakdown.pemeliharaan +
        breakdown.upahPemeliharaan + breakdown.lombaBimtek + breakdown.honorKegiatan +
        breakdown.makanMinum + breakdown.perdin
      );
      breakdown.kibB = Number(targetRow[17]) || 0;
      breakdown.kibE = Number(targetRow[18]) || 0;
      breakdown.totalModal = Number(targetRow[19]) || (breakdown.kibB + breakdown.kibE);
      totalRealisasi = Number(targetRow[20] || targetRow[21]) || (breakdown.totalBarangJasa + breakdown.totalModal);
      sisaSaldo = Number(targetRow[22] || targetRow[23]) || (saldoAwal + totalPenerimaan - totalRealisasi);
    }
  }

  // 2. Parse 'BHP' Sheet
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
  }

  // 3. Parse KIB B Sheet
  const kibBSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('peralatan') || s.toLowerCase().includes('kib b'));
  if (kibBSheetName) {
    const sheet = workbook.Sheets[kibBSheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const items: LkBospKibItem[] = [];
    let sumKibB = 0;

    for (let r = 5; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 5) continue;
      const namaBarang = String(row[32] || row[18] || row[4] || '').trim();
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

  // 4. Parse KIB E Sheet
  const kibESheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('asset tet') || s.toLowerCase().includes('kib e'));
  if (kibESheetName) {
    const sheet = workbook.Sheets[kibESheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const items: LkBospKibItem[] = [];
    let sumKibE = 0;

    for (let r = 5; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 5) continue;
      const spesifikasiJudul = String(row[33] || row[18] || row[4] || '').trim();
      const namaBarang = String(row[32] || row[17] || spesifikasiJudul || '').trim();
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

  // 5. Parse Rincian Pemeliharaan Sheet
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
    breakdown.upahPemeliharaan + breakdown.lombaBimtek + breakdown.honorKegiatan + breakdown.makanMinum + breakdown.perdin;
  breakdown.totalModal = breakdown.kibB + breakdown.kibE;
  if (totalRealisasi === 0) totalRealisasi = breakdown.totalBarangJasa + breakdown.totalModal;

  return {
    schoolName,
    npsn,
    gugus,
    periodYear,
    triwulan,
    saldoAwal,
    totalPenerimaan,
    totalRealisasi,
    sisaSaldo,
    breakdown,
  };
}
