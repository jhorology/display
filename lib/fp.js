// simulate integer operatioon
let intMode = false

function _traverse(v, fn) {
  if (typeof v === 'number') {
    return fn(v)
  }
  if (Array.isArray(v)) {
    return v.map((e) => _traverse(e, fn))
  }
  if (typeof v === 'object') {
    return Object.keys(v).reduce(
      (acc, key) => {
        acc[key] = _traverse(v[key], fn)
        return acc
      },
      { ...v }
    )
  }
  return v
}

/**
 * real number to s15Fixed16Number Init32
 */
function _toS15F16Int32(r) {
  const si = intMode ? (r * 0x10000) | 0 : Math.round(r * 0x10000)
  if (si < -0x80000000 || si > 0x7fffffff) {
    throw new Error('Overflow: ' + r + '->' + si)
  }
  return si
}

/**
 * real number to s15Fixed16Number UInit32
 */
function _toS15F16UInt32(r) {
  return _toS15F16Int32(r) >>> 0
}

/**
 * real number from s15Fixed16Number Int32
 */
function _fromS15F16Int32(si) {
  if (si < -0x80000000 || si > 0x7fffffff) {
    throw new Error('value out of range: ' + si)
  }
  return si / 0x10000
}

/**
 * real number from s15Fixed16Number UInt32
 */
function _fromS15F16UInt32(ui) {
  if (ui < 0 || ui > 0xffffffff) {
    throw new Error('value out of range: ' + ui)
  }
  return (ui & 0x80000000 ? -(~ui + 1) : ui) / 0x10000
}

module.exports = {
  toS15F16Int32: (v) => _traverse(v, _toS15F16Int32),
  toS15F16UInt32: (v) => _traverse(v, _toS15F16UInt32),
  fromS15F16Int32: (v) => _traverse(v, _fromS15F16Int32),
  fromS15F16UInt32: (v) => _traverse(v, _fromS15F16UInt32)
}
