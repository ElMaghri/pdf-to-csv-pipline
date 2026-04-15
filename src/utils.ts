import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import { RawTableData } from './types';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

export function parseNumberSafe(value: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = value
    .toString()
    .replace(/[^0-9.\-\+]/g, '')
    .trim();
  if (cleaned.length === 0) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidDate(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function listPdfFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .map((name) => path.join(directory, name));
}

export function removeCsvExtension(fileName: string): string {
  return fileName.replace(/\.csv$/i, '');
}

export function writeCsv(
  rows: string[][],
  destination: string,
  delimiter = ',',
): void {
  const csv = stringify(rows, { header: false, delimiter });
  fs.writeFileSync(destination, csv, 'utf8');
}

export function parseCsvText(csvText: string): string[][] {
  return csvText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const row = line
        .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
        .map((cell) => cell.trim().replace(/^"|"$/g, ''));
      return row;
    });
}

export function csvRowsEqual(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].length !== b[i].length) {
      return false;
    }
    for (let j = 0; j < a[i].length; j += 1) {
      if (a[i][j].trim() !== b[i][j].trim()) {
        return false;
      }
    }
  }
  return true;
}

export function getOutputCsvName(baseName: string, page: number): string {
  return page > 1 ? `${baseName}_page-${page}.csv` : `${baseName}.csv`;
}

export function getValidationSidecarName(
  baseName: string,
  page: number,
): string {
  return page > 1
    ? `${baseName}_page-${page}.validation.json`
    : `${baseName}.validation.json`;
}

export function getExpectedCsvName(baseName: string): string {
  return `${baseName}.csv`;
}

export function cleanCellValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildHeaderIndex(headers: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  headers.forEach((header, idx) => {
    index[normalizeHeader(header)] = idx;
  });
  return index;
}

export function writeJson(destination: string, payload: unknown): void {
  fs.writeFileSync(destination, JSON.stringify(payload, null, 2), 'utf8');
}

export function loadJson<T>(source: string): T {
  return JSON.parse(fs.readFileSync(source, 'utf8')) as T;
}
