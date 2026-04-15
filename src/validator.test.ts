import { validateTableData } from './validator';
import { PipelineConfig, RawTableData } from './types';

const config: PipelineConfig = {
  requiredHeaders: ['Date', 'Description', 'Amount', 'Category'],
  requiredFields: ['Date', 'Description', 'Amount'],
  dateFields: ['Date'],
  numericFields: { Amount: { min: -1000, max: 1000, allowNegative: true } },
  rowLength: 4,
  maxEmptyCellsPercent: 20,
  duplicateCheckFields: ['Date', 'Description', 'Amount'],
  anomalyRules: {
    emptyCellThreshold: 1,
    duplicateRowThreshold: 1,
  },
  batchSize: 50,
  concurrency: 4,
  outputDelimiter: ',',
  sampleVerification: {
    enabled: true,
    randomSamplePercent: 5,
  },
};

describe('validateTableData', () => {
  it('passes valid rows', () => {
    const table: RawTableData = {
      filePath: 'test.pdf',
      page: 1,
      headers: ['Date', 'Description', 'Amount', 'Category'],
      rows: [
        ['Date', 'Description', 'Amount', 'Category'],
        ['2025-01-01', 'Sample entry', '100', 'Sales'],
      ],
    };

    const result = validateTableData(table, config);
    expect(result.pass).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when required field is missing', () => {
    const table: RawTableData = {
      filePath: 'test.pdf',
      page: 1,
      headers: ['Date', 'Description', 'Amount', 'Category'],
      rows: [
        ['Date', 'Description', 'Amount', 'Category'],
        ['', 'Missing date', '50', 'Sales'],
      ],
    };

    const result = validateTableData(table, config);
    expect(result.pass).toBe(false);
    expect(
      result.errors.some((issue) => issue.code === 'missing-required-field'),
    ).toBe(true);
  });

  it('warns for duplicate rows', () => {
    const table: RawTableData = {
      filePath: 'test.pdf',
      page: 1,
      headers: ['Date', 'Description', 'Amount', 'Category'],
      rows: [
        ['Date', 'Description', 'Amount', 'Category'],
        ['2025-01-01', 'Duplicate', '10', 'Misc'],
        ['2025-01-01', 'Duplicate', '10', 'Misc'],
      ],
    };

    const result = validateTableData(table, config);
    expect(result.pass).toBe(true);
    expect(
      result.warnings.some((issue) => issue.code === 'duplicate-row'),
    ).toBe(true);
  });
});
