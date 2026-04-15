#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { loadConfig } from './config';
import { createLogger } from './logger';
import { processBatch } from './batchProcessor';
import { convertPDFToTables } from './converter';
import { PipelineConfig } from './types';
import {
  listPdfFiles,
  parseCsvText,
  csvRowsEqual,
  getExpectedCsvName,
} from './utils';

dotenv.config();

interface VerifyResult {
  filePath: string;
  passed: boolean;
  details: string;
}

function parseExpectedCsv(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseCsvText(content);
}

async function verifySamples(
  sampleDir: string,
  config: PipelineConfig,
  logger: ReturnType<typeof createLogger>,
): Promise<VerifyResult[]> {
  const results: VerifyResult[] = [];
  const sampleFiles = listPdfFiles(sampleDir);

  for (const pdfPath of sampleFiles) {
    const baseName = path.basename(pdfPath, '.pdf');
    const expectedCsvPath = path.join(sampleDir, getExpectedCsvName(baseName));
    if (!fs.existsSync(expectedCsvPath)) {
      results.push({
        filePath: pdfPath,
        passed: false,
        details: 'Missing expected CSV for sample.',
      });
      continue;
    }

    try {
      const expectedRows = parseExpectedCsv(expectedCsvPath);
      const tables = await convertPDFToTables(pdfPath);
      if (tables.length === 0) {
        results.push({
          filePath: pdfPath,
          passed: false,
          details: 'Unable to extract table from sample PDF.',
        });
        continue;
      }

      const actualRows = tables[0].rows;
      const passed = csvRowsEqual(actualRows, expectedRows);
      results.push({
        filePath: pdfPath,
        passed,
        details: passed
          ? 'Sample matches expected output.'
          : 'Sample verification failed.',
      });
    } catch (error) {
      logger.error(
        `Sample verification error for ${baseName}: ${(error as Error).message}`,
      );
      results.push({
        filePath: pdfPath,
        passed: false,
        details: `Sample verification error: ${(error as Error).message}`,
      });
    }
  }

  return results;
}

async function main() {
  const program = new Command();

  program
    .name('pdf-to-csv-pipeline')
    .description('Batch PDF to CSV pipeline with validation and verification.')
    .option(
      '--input <dir>',
      'Input directory with PDFs',
      process.env.INPUT_DIR || 'input',
    )
    .option(
      '--output <dir>',
      'Output directory for CSV files',
      process.env.OUTPUT_DIR || 'output',
    )
    .option(
      '--batch-size <number>',
      'Batch size for processing',
      process.env.BATCH_SIZE || '50',
    )
    .option(
      '--concurrency <number>',
      'Parallel file concurrency',
      process.env.CONCURRENCY || '8',
    )
    .option(
      '--config <file>',
      'Path to config.json',
      process.env.CONFIG_PATH || 'config.json',
    )
    .option('--verify-samples', 'Run verification against samples', false)
    .option('--resume', 'Skip files that are already processed', false)
    .option('--verbose', 'Enable verbose logging', false)
    .option('--dry-run', 'Run without writing outputs', false)
    .option('--samples <dir>', 'Samples directory', 'samples')
    .parse(process.argv);

  const options = program.opts();
  const logger = createLogger(path.resolve('logs'), options.verbose);
  const config = loadConfig(options.config);

  logger.info('Starting PDF-to-CSV pipeline.');
  logger.debug(`CLI options: ${JSON.stringify(options)}`);

  const summary = await processBatch({
    inputDir: options.input,
    outputDir: options.output,
    config,
    concurrency: Number(options.concurrency),
    batchSize: Number(options.batchSize),
    resume: options.resume,
    dryRun: options.dryRun,
    logger,
  });

  logger.info('Pipeline finished.');
  logger.info(
    `Processed ${summary.processed} files. Passed=${summary.passed}, Failed=${summary.failed}, Skipped=${summary.skipped}.`,
  );

  if (options.verifySamples) {
    logger.info('Verifying sample outputs...');
    const results = await verifySamples(options.samples, config, logger);
    const passed = results.filter((result) => result.passed).length;
    const failed = results.length - passed;
    results.forEach((result) =>
      logger.info(
        `${path.basename(result.filePath)}: ${result.passed ? 'PASS' : 'FAIL'} - ${result.details}`,
      ),
    );
    logger.info(
      `Sample verification complete: ${passed}/${results.length} passed, ${failed} failed.`,
    );
  }
}

main().catch((error) => {
  console.error('Pipeline error:', (error as Error).message);
  process.exit(1);
});
