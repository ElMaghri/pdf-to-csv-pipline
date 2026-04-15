# PDF-to-CSV Pipeline

A production-grade Node.js + TypeScript pipeline for reliably converting PDFs into CSV files with comprehensive validation, anomaly detection, batch processing, controlled concurrency, and sample verification.

## Features

✅ **Reliable PDF table extraction** from real-world PDFs (multi-page support)  
✅ **Strong, configurable validation** with anomaly detection and error reporting  
✅ **Comprehensive logging** - every issue has human-readable explanation  
✅ **Batch processing** with concurrency control for high-volume conversions  
✅ **Resumable processing** - skip already-processed files  
✅ **Sample verification** - compare outputs against known-good examples  
✅ **Dry-run mode** - test pipeline without writing files  
✅ **Clean TypeScript codebase** - strict mode enabled  
✅ **Production-ready** - tested and documented

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/akbdr/Desktop/lab/pdf-to-csv-pipline
npm install
```

### 2. Add PDFs

Place your PDF files in the `input/` directory:

```bash
cp your-pdfs/*.pdf input/
```

### 3. Run the Pipeline

```bash
# Dry-run (no output written)
npm start -- --dry-run --verbose

# Full processing
npm start -- --input input --output output --concurrency 8

# Resume from last processed file
npm start -- --resume

# With sample verification
npm start -- --verify-samples
```

## CLI Options

| Option                   | Description                     | Default       |
| ------------------------ | ------------------------------- | ------------- |
| `--input <dir>`          | Input directory with PDFs       | `input`       |
| `--output <dir>`         | Output directory for CSVs       | `output`      |
| `--batch-size <number>`  | Files per batch                 | `50`          |
| `--concurrency <number>` | Parallel file processing        | `8`           |
| `--config <file>`        | Path to config.json             | `config.json` |
| `--verify-samples`       | Compare outputs against samples | `false`       |
| `--resume`               | Skip already-processed files    | `false`       |
| `--verbose`              | Debug-level logging             | `false`       |
| `--dry-run`              | Validate without writing output | `false`       |
| `-h, --help`             | Show help message               | —             |

## Configuration

Edit `config.json` to customize validation rules:

```json
{
  "requiredFields": ["name", "email"],
  "dateFormat": "YYYY-MM-DD",
  "numericFields": ["amount", "quantity"],
  "outputDelimiter": ",",
  "maxNumericValue": 999999999,
  "minNumericValue": -999999999,
  "allowDuplicates": false
}
```

## Project Structure

```
pdf-to-csv-pipline/
├── src/
│   ├── main.ts              # CLI entry point
│   ├── config.ts            # Configuration loading & validation
│   ├── logger.ts            # Logging system (Winston)
│   ├── converter.ts         # PDF extraction logic
│   ├── validator.ts         # Data validation & anomaly detection
│   ├── batchProcessor.ts    # Batch processing orchestration
│   ├── concurrency.ts       # Concurrency limiter utility
│   ├── utils.ts             # Helper functions
│   ├── types.ts             # TypeScript interfaces
│   └── validator.test.ts    # Validator unit tests
├── input/                   # Place PDFs here
├── output/                  # Generated CSV files
├── samples/                 # Sample PDFs + expected CSVs for testing
├── logs/                    # Runtime log files
├── @types/                  # Custom type definitions
├── config.json              # Pipeline configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest testing configuration
└── README.md                # This file
```

## Validation Rules

The validator checks for:

- **Structure**: Consistent column counts, header presence
- **Required fields**: Configured fields must be present
- **Data types**: Date format validation, numeric range checks
- **Anomalies**: Empty cells, malformed data, duplicates, outliers
- **Quality**: All warnings logged with human-readable explanations

Files that fail validation are quarantined in `output/quarantine/`.

## Sample Verification

Add sample PDFs with expected CSV outputs to test the pipeline:

```bash
samples/
  ├── sample1.pdf
  ├── sample1.expected.csv
  ├── sample2.pdf
  └── sample2.expected.csv
```

Then run:

```bash
npm start -- --verify-samples
```

## Testing

Run unit tests for the validator:

```bash
npm test
```

## Logging

All logs are written to the `logs/` directory with timestamps:

- **INFO**: Operation progress and summary
- **WARN**: Data quality concerns, anomalies
- **ERROR**: Processing failures, invalid data
- **DEBUG**: (verbose mode) Detailed execution flow

## Performance Tips

For processing 30,000+ files:

1. Adjust `--batch-size` based on available RAM (default 50)
2. Set `--concurrency` to number of CPU cores (default 8)
3. Use `--resume` if pipeline is interrupted
4. Monitor `logs/` for warnings before full execution

### Example: Processing 30K files

```bash
npm start -- \
  --input /path/to/30k/pdfs \
  --output /path/to/output \
  --batch-size 100 \
  --concurrency 12 \
  --verbose
```

## Troubleshooting

### No PDFs found in input directory

- Ensure PDFs are in the `--input` directory
- Check file extensions (must be `.pdf`)

### Validation failures

- Check `logs/` for detailed warnings
- Review `config.json` settings
- Check quarantine folder for failed PDFs

### Performance issues

- Reduce `--concurrency` if running out of memory
- Increase `--batch-size` for faster processing
- Check disk space for output files

## Development

### Build

```bash
npm run build
```

### Run with TypeScript directly

```bash
npm start -- --help
```

### Code structure

- **converter.ts**: Extracts tables from PDFs using pdf-parse
- **validator.ts**: Comprehensive data validation with configurable rules
- **batchProcessor.ts**: Orchestrates batch processing with concurrency control
- **logger.ts**: Winston-based logging system
- **concurrency.ts**: Custom concurrency limiter for reliable parallel processing

## Dependencies

### Production

- `pdf-parse` - PDF text extraction
- `csv-stringify` - CSV generation
- `commander` - CLI argument parsing
- `winston` - Structured logging
- `dotenv` - Environment variable loading

### Development

- `typescript` - TypeScript compiler
- `ts-node` - TypeScript runtime
- `jest` - Unit testing framework
- `ts-jest` - Jest + TypeScript integration

## Notes

- The pipeline never silently outputs bad data
- All validation warnings are logged
- Failed files are quarantined separately
- Resume functionality preserves progress
- Memory-safe for high-volume processing

## License

See LICENSE file for details.
