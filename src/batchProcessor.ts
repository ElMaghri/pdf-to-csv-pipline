import fs from 'fs';
import path from 'path';
import { createConcurrencyLimit } from './concurrency';
import { convertPDFToTables } from './converter';
import { validateTableData } from './validator';
import { BatchOptions, RawTableData } from './types';
import {
  ensureDir,
  getOutputCsvName,
  getValidationSidecarName,
  writeCsv,
  writeJson,
} from './utils';

interface FileResult {
  filePath: string;
  status: 'passed' | 'failed' | 'skipped';
  warnings: number;
  errors: number;
}

export async function processBatch(options: BatchOptions): Promise<{
  processed: number;
  passed: number;
  failed: number;
  skipped: number;
  warnings: number;
  errors: number;
}> {
  ensureDir(options.outputDir);
  const quarantineDir = path.join(options.outputDir, 'quarantine');
  ensureDir(quarantineDir);

  const pdfFiles = fs
    .readdirSync(options.inputDir)
    .filter((file) => file.toLowerCase().endsWith('.pdf'))
    .map((file) => path.join(options.inputDir, file));

  const results: FileResult[] = [];

  const limit = createConcurrencyLimit(options.concurrency);
  for (let i = 0; i < pdfFiles.length; i += options.batchSize) {
    const batch = pdfFiles.slice(i, i + options.batchSize);
    options.logger.info(
      `Processing batch ${Math.floor(i / options.batchSize) + 1} with ${batch.length} files.`,
    );

    const tasks = batch.map((filePath) =>
      limit(async () => processFile(filePath, options, quarantineDir)),
    );
    const batchResults = await Promise.all(tasks);
    results.push(...batchResults);
  }

  const summary = results.reduce(
    (acc, result) => {
      acc.processed += 1;
      acc[result.status] += 1;
      acc.warnings += result.warnings;
      acc.errors += result.errors;
      return acc;
    },
    { processed: 0, passed: 0, failed: 0, skipped: 0, warnings: 0, errors: 0 },
  );

  options.logger.info(
    `Batch complete. Processed ${summary.processed}, passed ${summary.passed}, failed ${summary.failed}, skipped ${summary.skipped}.`,
  );

  return summary;
}

async function processFile(
  filePath: string,
  options: BatchOptions,
  quarantineDir: string,
): Promise<FileResult> {
  const name = path.basename(filePath, '.pdf');
  const existingCsv = path.join(options.outputDir, `${name}.csv`);
  if (options.resume && fs.existsSync(existingCsv)) {
    options.logger.info(`Skipping already processed file: ${name}`);
    return { filePath, status: 'skipped', warnings: 0, errors: 0 };
  }

  try {
    options.logger.info(`Converting PDF: ${name}`);
    const tables = await convertPDFToTables(filePath);
    if (tables.length === 0) {
      options.logger.warn(`No extractable tables found in ${name}.`);
      return { filePath, status: 'failed', warnings: 0, errors: 1 };
    }

    let fileHasError = false;
    let totalWarnings = 0;
    let totalErrors = 0;

    for (const table of tables) {
      const validation = validateTableData(table, options.config);
      totalWarnings += validation.warnings.length;
      totalErrors += validation.errors.length;

      options.logger.info(
        `Validation for ${name} page ${table.page}: ${validation.summary}`,
      );
      validation.warnings.forEach((issue) =>
        options.logger.warn(issue.message),
      );
      validation.errors.forEach((issue) => options.logger.error(issue.message));

      if (!validation.pass) {
        fileHasError = true;
      }

      const csvName = getOutputCsvName(name, table.page);
      const validationName = getValidationSidecarName(name, table.page);
      const csvPath = path.join(options.outputDir, csvName);
      const validationPath = path.join(options.outputDir, validationName);

      if (!options.dryRun) {
        writeJson(validationPath, {
          filePath,
          page: table.page,
          pass: validation.pass,
          warnings: validation.warnings,
          errors: validation.errors,
          summary: validation.summary,
        });
      }

      if (validation.pass && !options.dryRun) {
        writeCsv(table.rows, csvPath, options.config.outputDelimiter);
      }
    }

    if (fileHasError && !options.dryRun) {
      const destination = path.join(quarantineDir, path.basename(filePath));
      fs.copyFileSync(filePath, destination);
      options.logger.warn(`Quarantined ${name} due to validation failure.`);
    }

    return {
      filePath,
      status: fileHasError ? 'failed' : 'passed',
      warnings: totalWarnings,
      errors: totalErrors,
    };
  } catch (error) {
    options.logger.error(
      `Failed to process ${name}: ${(error as Error).message}`,
    );
    if (!options.dryRun) {
      const destination = path.join(quarantineDir, path.basename(filePath));
      try {
        fs.copyFileSync(filePath, destination);
      } catch {
        // ignore
      }
    }
    return { filePath, status: 'failed', warnings: 0, errors: 1 };
  }
}
