import type { Logger as WinstonLogger } from 'winston';

export interface PipelineConfig {
  requiredHeaders: string[];
  requiredFields: string[];
  dateFields: string[];
  numericFields: Record<
    string,
    {
      min?: number;
      max?: number;
      allowNegative?: boolean;
    }
  >;
  rowLength: number;
  maxEmptyCellsPercent: number;
  duplicateCheckFields: string[];
  anomalyRules: {
    emptyCellThreshold: number;
    duplicateRowThreshold: number;
  };
  batchSize: number;
  concurrency: number;
  outputDelimiter: string;
  sampleVerification: {
    enabled: boolean;
    randomSamplePercent: number;
  };
}

export interface RawTableData {
  filePath: string;
  page: number;
  headers: string[];
  rows: string[][];
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  rowIndex?: number;
  columnIndex?: number;
  field?: string;
  value?: string;
}

export interface ValidationResult {
  pass: boolean;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
  summary: string;
}

export interface ConverterResult {
  filePath: string;
  tables: RawTableData[];
}

export interface BatchOptions {
  inputDir: string;
  outputDir: string;
  config: PipelineConfig;
  concurrency: number;
  batchSize: number;
  resume: boolean;
  dryRun: boolean;
  logger: WinstonLogger;
}

export type Logger = WinstonLogger;
