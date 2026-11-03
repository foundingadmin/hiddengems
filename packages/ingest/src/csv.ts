// A small RFC 4180 CSV reader: quoted fields, escaped quotes, commas and newlines inside quotes.
// nflverse files quote URLs that contain commas, so a plain split is wrong.

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

/**
 * Reads only the named columns, for files too wide to hold as objects (nflverse play by play has 372
 * columns and about 40 MB a season). Missing columns come back in `missing`; rows hold values in the
 * order asked.
 */
export function readCsvColumns(text: string, columns: readonly string[]): { rows: string[][]; missing: string[] } {
  let i = 0;
  const n = text.length;
  // Header
  const header: string[] = [];
  let field = '', quoted = false;
  for (; i < n; i++) {
    const c = text[i]!;
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { header.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; i++; break; }
    else field += c;
  }
  header.push(field);
  const want = new Map<number, number>();
  const missing: string[] = [];
  columns.forEach((name, slot) => { const at = header.indexOf(name); if (at < 0) missing.push(name); else want.set(at, slot); });
  const rows: string[][] = [];
  let row: string[] = new Array(columns.length).fill('');
  let col = 0, keep = want.get(0), any = false;
  field = ''; quoted = false;
  const endField = () => { if (keep !== undefined) row[keep] = field; field = ''; col++; keep = want.get(col); };
  for (; i < n; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { if (keep !== undefined) field += '"'; i++; } else quoted = false; }
      else if (keep !== undefined) field += c;
      continue;
    }
    if (c === '"') { quoted = true; any = true; }
    else if (c === ',') { endField(); any = true; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endField();
      if (any || col > 1) rows.push(row);
      row = new Array(columns.length).fill(''); col = 0; keep = want.get(0); any = false;
    } else { any = true; if (keep !== undefined) field += c; }
  }
  if (any) { endField(); rows.push(row); }
  return { rows, missing };
}
