import React, { useMemo } from "react";

/**
 * Zero-dependency ISO/IEC 18004 QR Code encoder (Byte mode, Error Correction Level M).
 * Supports Version 1..5 (up to 84 UTF-8 bytes) — ideal for ILOLIT SafeVisit opaque tokens (~35 chars)
 * with ZERO external API calls and ZERO personal data leakage.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i] ^ res[0];
    for (let j = 0; j < ecCount - 1; j += 1) {
      res[j] = res[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    res[ecCount - 1] = gfMul(gen[ecCount], factor);
  }
  return res;
}

interface VersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  ecPerBlock: number;
  blocks: number;
  alignment: number[];
}

// Level M specifications for QR Versions 1..5
const VERSIONS_M: VersionSpec[] = [
  { version: 1, size: 21, dataCodewords: 16, ecPerBlock: 10, blocks: 1, alignment: [] },
  { version: 2, size: 25, dataCodewords: 28, ecPerBlock: 16, blocks: 1, alignment: [6, 18] },
  { version: 3, size: 29, dataCodewords: 44, ecPerBlock: 26, blocks: 1, alignment: [6, 22] },
  { version: 4, size: 33, dataCodewords: 64, ecPerBlock: 18, blocks: 2, alignment: [6, 26] },
  { version: 5, size: 37, dataCodewords: 86, ecPerBlock: 24, blocks: 2, alignment: [6, 30] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text);
  const spec =
    VERSIONS_M.find((v) => utf8.length + 2 <= v.dataCodewords) || VERSIONS_M[VERSIONS_M.length - 1];
  const payload = utf8.slice(0, Math.max(0, spec.dataCodewords - 2));

  // 1. Build bit stream: 0100 (Byte mode) + 8-bit length + payload + terminator + padding
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >> i) & 1);
    }
  };
  pushBits(0b0100, 4);
  pushBits(payload.length, 8);
  for (let i = 0; i < payload.length; i += 1) {
    pushBits(payload[i], 8);
  }
  const maxBits = spec.dataCodewords * 8;
  const term = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < term; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx += 1;
  }

  const dataBytes = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < spec.dataCodewords; i += 1) {
    let b = 0;
    for (let j = 0; j < 8; j += 1) {
      b = (b << 1) | (bits[i * 8 + j] || 0);
    }
    dataBytes[i] = b;
  }

  // 2. Split into blocks & compute Reed-Solomon EC codewords, then interleave
  const blockSize = Math.floor(spec.dataCodewords / spec.blocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < spec.blocks; b += 1) {
    const slice = dataBytes.slice(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(slice);
    ecBlocks.push(rsRemainder(slice, spec.ecPerBlock));
  }

  const finalCodewords: number[] = [];
  for (let i = 0; i < blockSize; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  // 3. Prepare matrix & function pattern mask
  const n = spec.size;
  const modules: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const isFunc: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < n && c >= 0 && c < n) {
      modules[r][c] = dark;
      isFunc[r][c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter && (onBorder || inCore));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i += 1) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  for (const ar of spec.alignment) {
    for (const ac of spec.alignment) {
      if (isFunc[ar][ac]) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(ar + dr, ac + dc, dist === 2 || dist === 0);
        }
      }
    }
  }

  // Reserve format info areas & dark module
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = n - 8; i < n; i += 1) {
    setFunc(8, i, false);
    setFunc(i, 8, false);
  }
  setFunc(n - 8, 8, true);

  // 4. Place data bits in zig-zag order
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i -= 1) {
      allBits.push((cw >> i) & 1);
    }
  }
  let bitIdx = 0;
  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let i = 0; i < n; i += 1) {
      const r = upward ? n - 1 - i : i;
      for (let j = 0; j < 2; j += 1) {
        const c = right - j;
        if (!isFunc[r][c]) {
          modules[r][c] = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          bitIdx += 1;
        }
      }
    }
    upward = !upward;
  }

  // 5. Apply mask pattern 0 ((r + c) % 2 === 0) and write BCH format info for Level M (00) + mask 0 (000)
  const maskId = 0;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!isFunc[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  // Format bits: EC Level M = 0b00, mask = 0b000 -> 5-bit data = 0b00000
  const data5 = (0b00 << 3) | maskId;
  let rem = data5 << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >> i) & 1) {
      rem ^= 0b10100110111 << (i - 10);
    }
  }
  const formatBits = ((data5 << 10) | rem) ^ 0b101010000010010;
  const fmtBit = (i: number) => ((formatBits >> i) & 1) === 1;

  // Write format info around top-left finder
  const tlRows = [0, 1, 2, 3, 4, 5, 7, 8, 8, 8, 8, 8, 8, 8, 8];
  const tlCols = [8, 8, 8, 8, 8, 8, 8, 8, 7, 5, 4, 3, 2, 1, 0];
  for (let i = 0; i < 15; i += 1) {
    modules[tlRows[i]][tlCols[i]] = fmtBit(i);
  }
  // Write format info around top-right & bottom-left finders
  for (let i = 0; i < 8; i += 1) {
    modules[8][n - 1 - i] = fmtBit(i);
  }
  for (let i = 8; i < 15; i += 1) {
    modules[n - 15 + i][8] = fmtBit(i);
  }

  return modules;
}

interface SafeVisitQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const SafeVisitQrCode: React.FC<SafeVisitQrCodeProps> = ({ value, size = 164, className }) => {
  const matrix = useMemo(() => generateQrMatrix(value), [value]);
  const quiet = 3;
  const total = matrix.length + quiet * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label="ILOLIT SafeVisit megtekintési QR-kód"
      className={className}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={total} height={total} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect key={`${r}-${c}`} x={c + quiet} y={r + quiet} width={1} height={1} fill="#0f172a" />
          ) : null,
        ),
      )}
    </svg>
  );
};

export default SafeVisitQrCode;
