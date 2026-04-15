import fs from 'fs';
import pdfParse from 'pdf-parse';
import { RawTableData } from './types';
import { cleanCellValue } from './utils';

/**
 * Intelligently detect and split columns from a text line
 * Handles multiple delimiters: tabs, multiple spaces, comma
 * Uses adaptive detection based on content
 */
function splitLineToCells(line: string): string[] {
  if (!line || line.trim().length === 0) {
    return [];
  }

  // First try tab-delimited
  if (line.includes('\t')) {
    const cells = line.split('\t').map((cell: string) => cleanCellValue(cell));
    if (cells.length > 1 && cells.some((c) => c.length > 0)) {
      return cells;
    }
  }

  // Try comma-delimited
  if (line.includes(',')) {
    const cells = line.split(',').map((cell: string) => cleanCellValue(cell));
    if (cells.length > 1 && cells.some((c) => c.length > 0)) {
      return cells;
    }
  }

  // For space-delimited content, be more careful
  // Split on 2+ consecutive spaces (typical table separator)
  const hasMultipleSpaces = /  {2,}/.test(line);
  if (hasMultipleSpaces) {
    const cells = line
      .split(/  {2,}/)
      .map((cell: string) => cleanCellValue(cell))
      .filter((cell: string) => cell.length > 0);
    if (cells.length > 1) {
      return cells;
    }
  }

  // As last resort, if line looks like a single value, return as-is
  return [cleanCellValue(line)];
}

/**
 * Detects if a row is likely a header row vs data row
 * Headers typically have shorter values, often text only
 */
function isLikelyHeader(row: string[]): boolean {
  if (row.length === 0) return false;

  // If first column is empty/short and others follow, likely data not header
  const avgLength = row.reduce((sum, cell) => sum + cell.length, 0) / row.length;

  // Headers usually have consistent, moderate length
  // Data rows might be very long (large numbers) or very short (empty)
  return avgLength > 2 && avgLength < 50;
}

export async function convertPDFToTables(
  filePath: string,
): Promise<RawTableData[]> {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = (await pdfParse(buffer)) as any;
    const rawText = data.text || '';

    if (!rawText || rawText.trim().length === 0) {
      console.warn(`No text extracted from PDF: ${filePath}`);
      return [];
    }

    const pages = rawText.split(/\f/);
    const rawTables: RawTableData[] = [];

    pages.forEach((pageText: string, pageIndex: number) => {
      const lines = pageText
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      if (lines.length === 0) {
        return;
      }

      // Parse rows with better column detection
      const rows = lines
        .map(splitLineToCells)
        .filter((row: string[]) => row.length > 0);

      if (rows.length === 0) {
        return;
      }

      // Try to identify header row (typically first row with reasonable length values)
      let headerIndex = 0;
      for (let i = 0; i < Math.min(rows.length, 3); i++) {
        if (
          rows[i].length > 1 &&
          isLikelyHeader(rows[i]) &&
          rows[i].some((cell) => /[a-zA-Z]/.test(cell))
        ) {
          headerIndex = i;
          break;
        }
      }

      const headers = rows[headerIndex];
      const dataRows = rows.slice(headerIndex + 1);

      if (dataRows.length > 0) {
        rawTables.push({
          filePath,
          page: pageIndex + 1,
          headers,
          rows: [headers, ...dataRows],
        });
      }
    });

    return rawTables;
  } catch (error) {
    console.error(
      `Error parsing PDF ${filePath}: ${(error as Error).message}`,
    );
    throw error;
  }
}
