/**
 * Task output arrives as arbitrary chunks of a byte stream, so the dashboard
 * keeps it as a bounded array of lines. Carriage returns rewrite the line in
 * progress the way a terminal would, which is how progress meters from npm,
 * Metro, and EAS render without flooding the log.
 */
export interface OutputBuffer {
  lines: string[];
  /** A carriage return was seen, so the next text replaces the current line. */
  pendingReset: boolean;
}

export const MAX_OUTPUT_LINES = 2000;

export function createOutputBuffer(): OutputBuffer {
  return { lines: [''], pendingReset: false };
}

export function appendOutput(buffer: OutputBuffer, rawChunk: string): void {
  const chunk = rawChunk.replace(/\r\n/g, '\n');
  let index = 0;
  while (index < chunk.length) {
    const newline = chunk.indexOf('\n', index);
    const carriage = chunk.indexOf('\r', index);
    let end: number;
    let startsNewLine: boolean;
    if (newline === -1 && carriage === -1) {
      end = chunk.length;
      startsNewLine = false;
    } else if (carriage === -1 || (newline !== -1 && newline < carriage)) {
      end = newline;
      startsNewLine = true;
    } else {
      end = carriage;
      startsNewLine = false;
    }
    const segment = chunk.slice(index, end);
    if (buffer.pendingReset) {
      buffer.lines[buffer.lines.length - 1] = '';
      buffer.pendingReset = false;
    }
    buffer.lines[buffer.lines.length - 1] += segment;
    if (end === chunk.length) {
      index = chunk.length;
    } else if (startsNewLine) {
      buffer.lines.push('');
      index = end + 1;
    } else {
      buffer.pendingReset = true;
      index = end + 1;
    }
  }
  if (buffer.lines.length > MAX_OUTPUT_LINES) {
    buffer.lines.splice(0, buffer.lines.length - MAX_OUTPUT_LINES);
  }
}
