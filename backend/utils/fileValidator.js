const MAGIC_BYTES = {
  'video/mp4': [
    [0x66, 0x74, 0x79, 0x70],   // ftyp box
  ],
  'video/webm': [
    [0x1A, 0x45, 0xDF, 0xA3],   // EBML header
  ],
  'video/ogg': [
    [0x4F, 0x67, 0x67, 0x53],   // OggS
  ],
  'video/quicktime': [
    [0x66, 0x74, 0x79, 0x70],   // ftyp box (same as mp4)
    [0x6D, 0x6F, 0x6F, 0x76],   // moov
  ],
};

const HEADER_SIZE = 12;

function validateVideoFile(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < HEADER_SIZE) {
    return false;
  }

  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) {
    return false;
  }

  return signatures.some(sig => {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) {
        return false;
      }
    }
    return true;
  });
}

module.exports = { validateVideoFile };
