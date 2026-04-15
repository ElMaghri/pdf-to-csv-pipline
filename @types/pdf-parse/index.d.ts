declare module 'pdf-parse' {
  function pdfParse(
    buffer: Buffer,
    options?: any,
  ): Promise<{
    text: string;
    numpages: number;
    version: string;
    [key: string]: any;
  }>;

  export default pdfParse;
}
