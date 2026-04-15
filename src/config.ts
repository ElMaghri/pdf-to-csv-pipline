import fs from 'fs';
import path from 'path';
import { PipelineConfig } from './types';

export function loadConfig(configPath: string): PipelineConfig {
  const resolvedPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Config file not found at ${resolvedPath}`);
  }

  const raw = JSON.parse(
    fs.readFileSync(resolvedPath, 'utf8'),
  ) as PipelineConfig;
  return validateConfig(raw);
}

function validateConfig(config: PipelineConfig): PipelineConfig {
  if (!config.requiredHeaders || !Array.isArray(config.requiredHeaders)) {
    throw new Error('Configuration invalid: requiredHeaders must be an array.');
  }
  if (!config.requiredFields || !Array.isArray(config.requiredFields)) {
    throw new Error('Configuration invalid: requiredFields must be an array.');
  }
  if (!config.dateFields || !Array.isArray(config.dateFields)) {
    throw new Error('Configuration invalid: dateFields must be an array.');
  }
  if (!config.numericFields || typeof config.numericFields !== 'object') {
    throw new Error('Configuration invalid: numericFields must be an object.');
  }
  if (typeof config.rowLength !== 'number') {
    throw new Error('Configuration invalid: rowLength must be a number.');
  }
  if (typeof config.maxEmptyCellsPercent !== 'number') {
    throw new Error(
      'Configuration invalid: maxEmptyCellsPercent must be a number.',
    );
  }
  if (
    !config.duplicateCheckFields ||
    !Array.isArray(config.duplicateCheckFields)
  ) {
    throw new Error(
      'Configuration invalid: duplicateCheckFields must be an array.',
    );
  }
  if (typeof config.batchSize !== 'number') {
    throw new Error('Configuration invalid: batchSize must be a number.');
  }
  if (typeof config.concurrency !== 'number') {
    throw new Error('Configuration invalid: concurrency must be a number.');
  }
  if (typeof config.outputDelimiter !== 'string') {
    throw new Error('Configuration invalid: outputDelimiter must be a string.');
  }
  if (
    !config.sampleVerification ||
    typeof config.sampleVerification !== 'object'
  ) {
    throw new Error(
      'Configuration invalid: sampleVerification must be configured.',
    );
  }
  return config;
}
