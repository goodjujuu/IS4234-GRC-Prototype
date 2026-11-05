// A minimal text-only PDF writer for the audit export, so the prototype needs no PDF
// dependency. Uses the built-in Helvetica font, wraps by estimated width and paginates.
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;

function clean(text) {
  return String(text ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/([\\()])/g, '\\$1');
}

function wrap(text, size) {
  const maxChars = Math.floor((PAGE_W - 2 * MARGIN) / (size * 0.5));
  const lines = [];
  let line = '';
  for (const word of String(text ?? '').split(/\s+/)) {
    if (line && line.length + word.length + 1 > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// rows: [{ text, size?, bold?, gap? }]
export function buildPdf(rows) {
  const pages = [[]];
  let y = PAGE_H - MARGIN;
  for (const row of rows) {
    const size = row.size || 10;
    for (const line of wrap(row.text, size)) {
      if (y - size < MARGIN) {
        pages.push([]);
        y = PAGE_H - MARGIN;
      }
      y -= size + 4;
      pages[pages.length - 1].push(`BT /${row.bold ? 'F2' : 'F1'} ${size} Tf ${MARGIN} ${y} Td (${clean(line)}) Tj ET`);
    }
    y -= row.gap ?? 2;
  }

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // the page tree, filled in once the page ids are known
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds = pages.map((lines) => {
    const stream = lines.join('\n');
    const content = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${content} 0 R >>`);
  });
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let out = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = Buffer.byteLength(out);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}
