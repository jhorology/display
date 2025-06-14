const fp = require('./fp')

/**
 * Decodes a vcgt (video card gamma table) from a buffer.
 * @param {Buffer} buf - The buffer containing the vcgt data.
 * @param {boolean} [raw=false] - Decode the value of ressult as a raw integer
 * @param {number} [offset=0] - The offset in the buffer to start reading.
 * @returns {Object} An object containing the decoded vcgt data.
 * @throws {Error} If the buffer is too small or if the vcgt size is invalid.
 */
function decode_vcgt(buf, raw = false, offset = 0) {
  const _uint16 = () => {
    const ret = buf.readUInt16BE(offset)
    offset += 2
    return ret
  }
  const _uint32 = () => {
    const ret = buf.readUInt32BE(offset)
    offset += 4
    return ret
  }
  const _s15f16 = () => {
    let ret = buf.readInt16BE(offset)
    if (!raw) {
      ret = fp.fromS15F16Int32(ret)
    }
    offset += 4
    return ret
  }
  const _lut = (size) => {
    const array = []
    for (let i = 0; i < size; i++) {
      array.push(_uint16())
    }
    return raw ? array : array.map((e) => e / 0xffff)
  }
  const reserved = _uint32(),
    type = _uint32()

  if (reserved !== 0) {
    throw new Error('Reserved field is not zero: ' + reserved)
  }
  switch (type) {
    case 0:
      const numChannels = _uint16(),
        numLutEntries = _uint16(),
        valueType = _uint16()
      if (!((numChannels === 3 || numChannels === 1) && valueType === 2)) {
        throw new Error(
          `Unsupported vcgt data: numChannels:${numChannels}, valueType: ${valueType}`
        )
      }
      const luts = (numChannels === 3 ? ['r', 'g', 'b'] : ['lut']).reduce((o, ch) => {
        o[ch] = _lut(numLutEntries)
        return o
      }, {})
      return {
        type,
        valueType,
        ...luts,
        // I analyzed it based on calibrite PROFILER,
        // but 29 is strange, It might be a bug.
        unkonwn: buf.subarray(offset, offset + 29).toString('hex')
      }
    case 1:
      return {
        type,
        r: {
          gamma: _s15f16(),
          min: _s15f16(),
          max: _s15f16()
        },
        g: {
          gamma: _s15f16(),
          min: _s15f16(),
          max: _s15f16()
        },
        b: {
          gamma: _s15f16(),
          min: _s15f16(),
          max: _s15f16()
        }
      }
    default:
      throw new Error('Unsupported vcgt type: ' + type)
  }
}

/**
 * Encodes a vcgt (video card gamma table) into a buffer.
 * @param {Buffer} buf - The buffer to write the vcgt data to.
 * @param {Object} vcgt - The vcgt data to encode.
 * @param {boolean} [raw=false] - Treat the value of an ndin object as a raw integer
 * @param {number} [offset=0] - The offset in the buffer to start writing.
 * @throws {Error} If the vcgt type is unsupported.
 */
function encode_vcgt(buf, vcgt, raw = false, offset = 0) {
  const _uint16 = (v) => {
    buf.writeUInt16BE(v, offset)
    offset += 2
  }
  const _uint32 = (v) => {
    buf.writeUInt32BE(v, offset)
    offset += 4
  }
  const _s15f16 = (v) => {
    buf.writeInt32BE(raw ? v : fp.toS15F16Int32(v), offset)
    offset += 4
  }
  const _lut = (arr) => {
    for (const v of arr) {
      buf.writeUInt16(raw ? v : Math.round(v * 0xffff), offset)
      offset += 2
    }
  }
  _uint32(0) // reserved
  _uint32(vcgt.type)
  switch (vcgt.type) {
    case 0: // LUT
      const numChannels = vcgt.r ? 3 : 1,
        numLutEntries = vcgt.r ? vcgt.r.length : vcgt.lut.length,
        valueType = 2 // uint16
      _uint16(numChannels)
      _uint16(numLutEntries)
      _uint16(valueType)
      if (numChannels === 3) {
        _lut(vcgt.red)
        _lut(vcgt.green)
        _lut(vcgt.blue)
      } else {
        _lut(vcgt.lut)
      }
      // I analyzed it based on calibrite PROFILER,
      // but 29 is strange, It might be a bug.
      buf.fill(0, offset, offset + 29)
      break
    case 1: // Gamma
      _s15f16(vcgt.r.gamma)
      _s15f16(vcgt.r.min)
      _s15f16(vcgt.r.max)
      _s15f16(vcgt.g.gamma)
      _s15f16(vcgt.g.min)
      _s15f16(vcgt.g.max)
      _s15f16(vcgt.b.gamma)
      _s15f16(vcgt.b.min)
      _s15f16(vcgt.b.max)
      break
    default:
      throw new Error('Unsupported vcgt type: ' + vcgt.type)
  }
}

function create_vcgt(vcgt, raw = false) {
  const size = vcgt.type === 0 ? 14 + (vcgt.r ? vcgt.r.length * 6 : vcgt.lut.length * 2) + 29 : 44,
    buf = Buffer.alloc(size) // Allocate a buffer of sufficient size
  encode_vcgt(buf, vcgt, raw)
  return buf
}

/**
 * Decodes a Apple display native information.
 * @param {Buffer} buf - The buffer containing the ndin data.
 * @param {boolean} [raw=false] - Decode the value of ressult as a raw integer
 * @param {number} [offset=0] - The offset in the buffer to start reading.
 * @returns {Object} An object containing the decoded ndin data.
 * @throws {Error} If the reserved field is not zero or if the size is not 54.
 * @throws {Error} If the ndin data is malformed.
 */
function decode_ndin(buf, raw = false, offset = 0) {
  const _uint32 = () => {
    const ret = buf.readUInt32BE(offset)
    offset += 4
    return ret
  }
  const _s15f16 = () => {
    const ret = buf.readInt32BE(offset)
    offset += 4
    return raw ? ret : fp.fromS15F16Int32(ret)
  }
  const reseverd = _uint32()
  if (reseverd !== 0) {
    throw new Error('Reserved field is not zero: ' + reseverd)
  }
  const size = _uint32()
  if (size !== 54) {
    throw new Error('Invalid size for ndin: ' + size)
  }
  const ret = {
    r: [_s15f16(), _s15f16()],
    g: [_s15f16(), _s15f16()],
    b: [_s15f16(), _s15f16()],
    w: [_s15f16(), _s15f16()],
    rGamma: _s15f16(),
    gGamma: _s15f16(),
    bGamma: _s15f16(),
    unknown: buf.subarray(offset, offset + 6).toString('hex')
  }
  return ret
}

/**
 * Encodes an Apple display native information into a buffer.
 * @param {Buffer} buf - The buffer to write the ndin data to.
 * @param {bool} [raw = false] - Treat the value of an ndin object as a raw integer
 * @param {number} [offset = 0] - The offset in the buffer to start writing.
 * @param {Object} ndin - The ndin data to encode.
 * @throws {Error} If the ndin data is malformed or if the buffer is not large enough.
 */
function encode_ndin(buf, ndin, raw = false, offset = 0) {
  const _uint32 = (v) => {
    buf.writeUInt32BE(v, offset)
    offset += 4
  }
  const _s15f16 = (v) => {
    buf.writeUInt32BE(raw ? val : fp.toS15F16Int32(v), offset)
    offset += 4
  }
  _uint32(0) // reserved
  _uint32(54) // size
  _s15f16(ndin.r[0])
  _s15f16(ndin.r[1])
  _s15f16(ndin.g[0])
  _s15f16(ndin.g[1])
  _s15f16(ndin.b[0])
  _s15f16(ndin.b[1])
  _s15f16(ndin.w[0])
  _s15f16(ndin.w[1])
  _s15f16(ndin.rGamma)
  _s15f16(ndin.gGamma)
  _s15f16(ndin.bGamma)
  buf.fill(0, offset, offset + 6) // reserved space for unknown data
}

/**
 * Creates a buffer containing the Apple display native information.
 * @param {Object} ndin - The ndin data to encode.
 * @param {bool} [raw = false] - Treat the value of an ndin object as a raw integer
 * @returns {Buffer} A buffer containing the encoded ndin data.
 */
function create_ndin(ndin, raw = false) {
  const buf = Buffer.alloc(58)
  encode_ndin(buf, ndin, raw)
  return buf
}

// TODO vcgp
//  - [V]ideo [C]ard [G]amma [P]rofile ?
//  - [V]ideo [C]ore [G]raphics [P]rofile ?
//  - 00026666 = gamma 2.4
//  - 00023333 = gamma 2.2
//
// macbiook air
//   00000000
//   0003 0000 00026666 0003 0000 00026666 0003 0000 00026666 0000 00023333 3400 0000 00023333 3400 0000 00023333 3400
//   red--------------> green------------> blue-------------> red--------------> green------------> blue------------->
//
// AW3225QF
//   00000000
//   0003 0000 00026666 0003 0000 00026666 0003 0000 00026666 0000 00023333 0000 0000 00023333 0000 0000 00023333 0000
//   red--------------> green------------> blue-------------> red--------------> green------------> blue------------->
//
// DELL S3221QS
//   00000000
//   0000 0001 00010000 0000 0000 00010000 00010000 00000000 0001 000000010000 0000000000010000

// TODO MCH2
// https://learn.microsoft.com/en-us/windows/win32/wcs/display-calibration-mhc

module.exports = {
  decode_vcgt,
  encode_vcgt,
  create_vcgt,
  decode_ndin,
  encode_ndin,
  create_ndin
}
