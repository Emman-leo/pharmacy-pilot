import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadCSV } from './exportCSV.js';

describe('downloadCSV', () => {
  let blobPayloads;
  let anchor;

  beforeEach(() => {
    blobPayloads = [];
    anchor = { click: vi.fn(), href: '', download: '' };
    vi.stubGlobal(
      'Blob',
      vi.fn(function MockBlob(parts, opts) {
        blobPayloads.push({ parts, opts });
        return { type: opts?.type };
      }),
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return anchor;
      return {};
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('writes header, escapes quotes, and triggers download', () => {
    downloadCSV(
      'report.csv',
      [{ name: 'a"b', qty: 2 }],
      [
        { key: 'name', header: 'Name' },
        { key: 'qty', header: 'Qty' },
      ],
    );

    expect(anchor.click).toHaveBeenCalled();
    expect(blobPayloads).toHaveLength(1);
    const csv = blobPayloads[0].parts[0];
    expect(csv).toContain('Name,Qty');
    expect(csv).toContain('"a""b"');
    expect(csv).toContain(',2');
  });
});
