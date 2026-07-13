const textEncoder = new TextEncoder();

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function normalizeEntries(files) {
  return Object.entries(files)
    .map(([name, content]) => {
      if (typeof name !== "string" || name.trim() === "") {
        throw new TypeError("ZIP entry name must be a non-empty string.");
      }

      if (typeof content !== "string") {
        throw new TypeError(`ZIP entry ${name} must contain a string.`);
      }

      return {
        name,
        nameBytes: textEncoder.encode(name),
        data: textEncoder.encode(content)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function createZipArchive(files) {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new TypeError("files must be an object.");
  }

  const entries = normalizeEntries(files);

  if (entries.length === 0) {
    throw new TypeError("At least one ZIP entry is required.");
  }

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const checksum = crc32(entry.data);

    const localHeader = new Uint8Array(30 + entry.nameBytes.length);
    const localView = new DataView(localHeader.buffer);

    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, entry.data.length);
    writeUint32(localView, 22, entry.data.length);
    writeUint16(localView, 26, entry.nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(entry.nameBytes, 30);

    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, entry.data.length);
    writeUint32(centralView, 24, entry.data.length);
    writeUint16(centralView, 28, entry.nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);
    centralHeader.set(entry.nameBytes, 46);

    centralParts.push(centralHeader);
    localOffset += localHeader.length + entry.data.length;
  }

  const centralSize = centralParts.reduce(
    (total, part) => total + part.length,
    0
  );

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);

  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, localOffset);
  writeUint16(endView, 20, 0);

  const totalSize =
    localParts.reduce((total, part) => total + part.length, 0) +
    centralSize +
    endRecord.length;

  const archive = new Uint8Array(totalSize);
  let offset = 0;

  for (const part of [...localParts, ...centralParts, endRecord]) {
    archive.set(part, offset);
    offset += part.length;
  }

  return archive;
}
