import {
  PipelineConfig,
  RawTableData,
  ValidationIssue,
  ValidationResult,
} from './types';
import {
  buildHeaderIndex,
  isValidDate,
  normalizeHeader,
  parseNumberSafe,
} from './utils';

function headerMatches(header: string, expected: string): boolean {
  return normalizeHeader(header) === normalizeHeader(expected);
}

function getFieldValue(
  row: string[],
  headerIndex: Record<string, number>,
  fieldName: string,
): string {
  const index = headerIndex[normalizeHeader(fieldName)];
  return index !== undefined ? row[index] : '';
}

export function validateTableData(
  table: RawTableData,
  config: PipelineConfig,
): ValidationResult {
  const warnings: ValidationIssue[] = [];
  const errors: ValidationIssue[] = [];
  const headerIndex = buildHeaderIndex(table.headers);
  const headerLength = table.headers.length;

  if (table.rows.length === 0) {
    errors.push({
      type: 'error',
      code: 'no-data',
      message: 'PDF page contains no extractable rows.',
    });
  }

  // Check required headers only if they are specified in config
  const requiredHeadersToCheck = config.requiredHeaders.filter(
    (h) => h.trim().length > 0,
  );
  const missingHeaders = requiredHeadersToCheck.filter((required) => {
    return !table.headers.some((header) => headerMatches(header, required));
  });
  if (missingHeaders.length > 0 && requiredHeadersToCheck.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'missing-headers',
      message: `Missing expected headers: ${missingHeaders.join(', ')}`,
    });
  }

  const contentRows = table.rows.slice(1);
  let emptyCount = 0;

  // Only perform expensive duplicate detection if configured
  // and if we have valid fields to check
  const duplicateCheckFieldsValid = config.duplicateCheckFields.filter(
    (f) => f.trim().length > 0,
  );
  const duplicateKeys = new Set<string>();

  contentRows.forEach((row, rowIndex) => {
    if (row.length !== headerLength) {
      warnings.push({
        type: 'warning',
        code: 'row-length-mismatch',
        message: `Row ${rowIndex + 2} has ${row.length} columns; expected ${headerLength}.`,
        rowIndex: rowIndex + 1,
      });
    }

    let rowHasEmptyCells = false;
    row.forEach((cell, columnIndex) => {
      const value = cell.trim();
      if (value.length === 0) {
        emptyCount += 1;
        rowHasEmptyCells = true;
        // Only warn about empty cells if not too many warnings already
        if (warnings.length < 50) {
          warnings.push({
            type: 'warning',
            code: 'empty-cell',
            message: `Empty cell found at row ${rowIndex + 2}, column ${columnIndex + 1}.`,
            rowIndex: rowIndex + 1,
            columnIndex,
          });
        }
      }
    });

    // Check required fields only if specified in config
    const requiredFieldsToCheck = config.requiredFields.filter(
      (f) => f.trim().length > 0,
    );
    requiredFieldsToCheck.forEach((field) => {
      const value = getFieldValue(row, headerIndex, field);
      if (!value || value.trim().length === 0) {
        errors.push({
          type: 'error',
          code: 'missing-required-field',
          message: `Required field ${field} is missing on row ${rowIndex + 2}.`,
          rowIndex: rowIndex + 1,
          field,
          value,
        });
      }
    });

    config.dateFields.forEach((field) => {
      const value = getFieldValue(row, headerIndex, field);
      if (value && !isValidDate(value)) {
        errors.push({
          type: 'error',
          code: 'invalid-date',
          message: `Invalid date in field ${field} on row ${rowIndex + 2}: '${value}'.`,
          rowIndex: rowIndex + 1,
          field,
          value,
        });
      }
    });

    Object.entries(config.numericFields).forEach(([field, rules]) => {
      const value = getFieldValue(row, headerIndex, field);
      if (value && value.trim().length > 0) {
        const number = parseNumberSafe(value);
        if (number === null) {
          errors.push({
            type: 'error',
            code: 'invalid-number',
            message: `Numeric field ${field} contains invalid value '${value}' on row ${rowIndex + 2}.`,
            rowIndex: rowIndex + 1,
            field,
            value,
          });
        } else {
          if (rules.allowNegative === false && number < 0) {
            warnings.push({
              type: 'warning',
              code: 'negative-value',
              message: `Field ${field} contains a negative number on row ${rowIndex + 2}.`,
              rowIndex: rowIndex + 1,
              field,
              value,
            });
          }
          if (typeof rules.min === 'number' && number < rules.min) {
            errors.push({
              type: 'error',
              code: 'number-below-min',
              message: `Value ${number} for field ${field} is below minimum ${rules.min} on row ${rowIndex + 2}.`,
              rowIndex: rowIndex + 1,
              field,
              value,
            });
          }
          if (typeof rules.max === 'number' && number > rules.max) {
            errors.push({
              type: 'error',
              code: 'number-above-max',
              message: `Value ${number} for field ${field} exceeds maximum ${rules.max} on row ${rowIndex + 2}.`,
              rowIndex: rowIndex + 1,
              field,
              value,
            });
          }
        }
      }
    });

    // Only check for duplicates if we have valid fields and not too many already
    if (duplicateCheckFieldsValid.length > 0 && warnings.length < 50) {
      const duplicateKey = duplicateCheckFieldsValid
        .map((field) =>
          getFieldValue(row, headerIndex, field).trim().toLowerCase(),
        )
        .join('||');
      if (duplicateKey.trim().length > 0) {
        if (duplicateKeys.has(duplicateKey)) {
          // Only warn if not a row with empty cells
          if (!rowHasEmptyCells) {
            warnings.push({
              type: 'warning',
              code: 'duplicate-row',
              message: `Potential duplicate row detected at row ${rowIndex + 2}.`,
              rowIndex: rowIndex + 1,
            });
          }
        } else {
          duplicateKeys.add(duplicateKey);
        }
      }
    }
  });

  const totalCells = contentRows.length * headerLength;
  const emptyPercent = totalCells > 0 ? (emptyCount / totalCells) * 100 : 0;
  if (emptyPercent >= config.maxEmptyCellsPercent) {
    warnings.push({
      type: 'warning',
      code: 'high-empty-rate',
      message: `More than ${config.maxEmptyCellsPercent}% of cells are empty (${emptyPercent.toFixed(1)}%).`,
    });
  }

  const pass = errors.length === 0;
  const summary = pass
    ? `Validation passed with ${warnings.length} warning(s).`
    : `Validation failed with ${errors.length} error(s) and ${warnings.length} warning(s).`;

  return {
    pass,
    warnings,
    errors,
    summary,
  };
}
