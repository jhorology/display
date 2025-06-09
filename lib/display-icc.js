const fs = require('node:fs/promises'),
  math = require('mathjs'),
  { DOMParser, XMLSerializer } = require('@xmldom/xmldom'),
  xpath = require('xpath'),
  NUM_DEC_ACCURACY = 5,
  DEC_SCALE = Math.pow(10, NUM_DEC_ACCURACY),
  BLADFORD_TRASNFORM = [
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, -0.0685, 1.0296]
  ],
  D65_TO_D50_TRANSFORM = [
    [1.047882080078, 0.022918701172, -0.050201416016],
    [0.029586791992, 0.990478515625, -0.017059326172],
    [0.009231567383, 0.015075683594, 0.751678466797]
  ],
  D65_WHITE = [0.949554443359, 1.0, 1.089019775391],
  D50_WHITE = [0.96418762207, 1.0, 0.824890136719]

function dec(val) {
  return Math.round(val * DEC_SCALE) / DEC_SCALE
}

function xyz_cord(arr) {
  const sum = arr[0] + arr[1] + arr[2]
  return xy2xyz(arr[0] / sum, arr[1] / sum)
}

function xy2xyz() {
  const arr = arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : arguments,
    x = dec(arr[0]),
    y = dec(arr[1])
  return [x, y, dec(1 - x - y)]
}

function xyz_norm(arr) {
  return [dec(arr[0] / arr[1]), 1.0, dec(arr[2] / arr[1])]
}

function de_fixed_dec(uint, bits, d_bits, signed) {
  const divider = 1 << d_bits,
    max = bits === 32 ? 0xffffffff : (1 << bits) - 1,
    sign = 1 << (bits - 1)
  if (uint < 0 || uint > max) {
    throw new Error('value out of range: ' + uint + 'max:' + max)
  }
  if (signed) {
    if (uint & sign) {
      return dec(-(((~uint + 1) & max) / divider))
    }
    return dec(uint / divider)
  } else {
    return dec(uint / divider)
  }
}

function en_fixed_dec(f, bits, d_bits, signed) {
  const unsignedMax = 1 << (bits - d_bits),
    signedMax = unsignedMax >> 1,
    mask = bits === 32 ? 0xffffffff : (1 << bits) - 1,
    multiplier = 1 << d_bits
  if (signed) {
    if (f < -signedMax || f >= signedMax) {
      throw new Error('valu out of range: ' + f)
    }
    if (f < 0) {
      return (~Math.round(-f * multiplier) + 1) & mask
    }
    const uint = Math.round(f * multiplier)
    if (uint > mask >> 1) {
      throw new Error('Overflow: ' + f + '->' + uint)
    }
    return uint
  } else {
    if (f < 0 || f >= unsignedMax) {
      throw new Error('valu out of range: ' + f)
    }
    const uint = Math.round(f * multiplier)
    if (uint > mask) {
      throw new Error('Overflow: ' + f + '->' + uint)
    }
    return uint
  }
}
function de_u8f8(u16) {
  return de_fixed_dec(u16, 16, 8, false)
}

function en_u8f8(f) {
  return en_fixed_dec(f, 16, 8, false)
}

function de_s7f8(u16) {
  return de_fixed_dec(u16, 16, 8, true)
}

function en_s7f8(f) {
  return en_fixed_dec(f, 16, 8, true)
}

/**
 * Converts a 16-bit unsigned integer with a 16-bit fixed-point fraction to a floating-point number.
 * @param {number} u32 - The 32-bit unsigned integer to convert.
 * @returns {number} The converted floating-point number.
 */
function de_u16f16(u32) {
  return de_fixed_dec(u32, 32, 16, false)
}

/**
 * Encodes a floating-point number into a 32-bit unsigned integer with a 16-bit fixed-point fraction.
 * @param {number} f - The floating-point number to encode.
 * @returns {number} The encoded 32-bit unsigned integer.
 */
function en_u16f16(f) {
  return en_fixed_dec(f, 32, 16, false)
}

/**
 * Converts a 32-bit signed integer with a 16-bit fixed-point fraction to a floating-point number.
 * @param {number} u32 - The 32-bit signed integer to convert.
 * @returns {number} The converted floating-point number.
 */
function de_s15f16(u32) {
  return de_fixed_dec(u32, 32, 16, true)
}

/**
 * Encodes a floating-point number into a 32-bit signed integer with a 16-bit fixed-point fraction.
 * @param {number} f - The floating-point number to encode.
 * @returns {number} The encoded 32-bit signed integer.
 */
function en_s15f16(f) {
  return en_fixed_dec(f, 32, 16, true)
}

function de_lut16(u16) {
  if (u16 < 0 || u16 > 0xffff) {
    throw new Error('valu out of range: ' + u16)
  }
  return dec(u16 / 0xffff) // Convert 16-bit unsigned integer to floating-point number
}

function en_lut16(f) {
  if (f < 0 || f > 1) {
    throw new Error('valu out of range: ' + u16)
  }
  return Math.round(0xffff * f) // Convert floating-point number to 16-bit unsigned integer
}

/**
 * Decodes a Apple display native information.
 * @param {Buffer} buf - The buffer containing the ndin data.
 * @param {number} [offset=0] - The offset in the buffer to start reading.
 * @returns {Object} An object containing the decoded ndin data.
 * @throws {Error} If the reserved field is not zero or if the size is not 54.
 * @throws {Error} If the ndin data is malformed.
 */
function de_ndin(buf, offset = 0) {
  const _uint32 = () => {
    var ret = buf.readUInt32BE(offset)
    offset += 4
    return ret
  }
  const _read = () => {
    return de_s15f16(_uint32())
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
    red: [_read(), _read()],
    green: [_read(), _read()],
    blue: [_read(), _read()],
    white: [_read(), _read()],
    red_gamma: _read(),
    green_gamma: _read(),
    blue_gamma: _read(),
    unknown: buf.slice(offset).toString('hex')
  }
  return ret
}

/**
 * Encodes an Apple display native information into a buffer.
 * @param {Buffer} buf - The buffer to write the ndin data to.
 * @param {number} [offset = 0] - The offset in the buffer to start writing.
 * @param {Object} ndin - The ndin data to encode.
 * @throws {Error} If the ndin data is malformed or if the buffer is not large enough.
 */
function en_ndin(buf, ndin, offset = 0) {
  const _uint32 = (val) => {
    buf.writeUInt32BE(val, offset)
    offset += 4
  }
  const _write = (val) => _uint32(en_s15f16(val))
  _uint32(0) // reserved
  _uint32(54) // size
  _write(ndin.red[0])
  _write(ndin.red[1])
  _write(ndin.green[0])
  _write(ndin.green[1])
  _write(ndin.blue[0])
  _write(ndin.blue[1])
  _write(ndin.white[0])
  _write(ndin.white[1])
  _write(ndin.red_gamma)
  _write(ndin.green_gamma)
  _write(ndin.blue_gamma)
  buf.fill(0, offset, offset + 6) // reserved space for unknown data
}

/**
 * Creates a buffer containing the Apple display native information.
 * @param {Object} ndin - The ndin data to encode.
 * @returns {Buffer} A buffer containing the encoded ndin data.
 */
function create_ndin(ndin) {
  const buf = Buffer.alloc(58)
  en_ndin(buf, ndin)
  return buf
}

/**
 * Decodes a vcgt (video card gamma table) from a buffer.
 * @param {Buffer} buf - The buffer containing the vcgt data.
 * @param {number} [offset=0] - The offset in the buffer to start reading.
 * @returns {Object} An object containing the decoded vcgt data.
 * @throws {Error} If the buffer is too small or if the vcgt size is invalid.
 */
function de_vcgt(buf, offset = 0) {
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
  const _s15f16 = () => de_s15f16(_uint32())
  const _lut16arr = (size) => {
    const array = []
    for (let i = 0; i < size; i++) {
      array.push(de_lut16(_uint16()))
    }
    return array
  }
  const reserved = _uint32(),
    type = _uint32()
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
      const luts = (numChannels === 3 ? ['red', 'green', 'blue'] : ['lut']).reduce((o, ch) => {
        o[ch] = _lut16arr(numLutEntries)
        return o
      }, {})
      return {
        type,
        valueType,
        ...luts,
        unkonwn: buf.slice(offset, offset + 29).toString('hex')
      }
    case 1:
      return {
        type,
        red: {
          gamma: _s15f16(),
          min: _s15f16(),
          max: _s15f16()
        },
        green: {
          gamma: _s15f16(),
          min: _s15f16(),
          max: _s15f16()
        },
        blue: {
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
 * @param {number} [offset=0] - The offset in the buffer to start writing.
 * @throws {Error} If the vcgt type is unsupported.
 */
function en_vcgt(buf, vcgt, offset = 0) {
  const _uint16 = (val) => {
    buf.writeUInt16BE(val, offset)
    offset += 2
  }
  const _uint32 = (val) => {
    buf.writeUInt32BE(val, offset)
    offset += 4
  }
  const _s15f16 = (val) => _uint32(en_s15f16(val))
  const _lut16array = (arr) => {
    for (const v of arr) {
      _uint16(en_lut16(v))
    }
  }
  _uint32(0) // reserved
  _uint32(vcgt.type)
  switch (vcgt.type) {
    case 0: // LUT
      const numChannels = vcgt.red ? 3 : 1,
        numLutEntries = vcgt.red ? vcgt.red.length : vcgt.lut.length,
        valueType = 2 // LUT16
      _uint16(numChannels)
      _uint16(numLutEntries)
      _uint16(valueType)
      if (numChannels === 3) {
        _lut16array(vcgt.red)
        _lut16array(vcgt.green)
        _lut16array(vcgt.blue)
      } else {
        _lut16array(vcgt.lut)
      }
      buf.fill(0, offset, offset + 29) // reserved space for unknown data
      break
    case 1: // Gamma
      _s15f16(vcgt.red.gamma)
      _s15f16(vcgt.red.min)
      _s15f16(vcgt.red.max)
      _s15f16(vcgt.green.gamma)
      _s15f16(vcgt.green.min)
      _s15f16(vcgt.green.max)
      _s15f16(vcgt.blue.gamma)
      _s15f16(vcgt.blue.min)
      _s15f16(vcgt.blue.max)
      break
    default:
      throw new Error('Unsupported vcgt type: ' + vcgt.type)
  }
}
function create_vcgt(vcgt) {
  const size =
      vcgt.type === 0 ? 14 + (vcgt.red ? vcgt.red.length * 6 : vcgt.lut.length * 2) + 29 : 44,
    buf = Buffer.alloc(size) // Allocate a buffer of sufficient size
  en_vcgt(buf, vcgt)
  return buf
}

function parse_xyz_values(dom) {
  return xpath.select('//XYZArrayType/XYZNumber', dom).reduce((acc, node) => {
    const key = node.parentNode.parentNode.tagName.replace(/(.*)Tag/, '$1')
    acc[key] = ['X', 'Y', 'Z'].map((c) => parseFloat(node.attributes.getNamedItem(c).value))
    return acc
  }, {})
}

function parse_curves(dom) {
  return ['red', 'green', 'blue'].reduce((acc, c) => {
    const key = c + 'TRC'
    let node = xpath.select(`//Tags/${key}Tag`, dom, true)
    if (!node) {
      return undefined
    }

    // SameAs
    let attr = node.attributes.getNamedItem('SameAs')
    if (attr) {
      acc[key] = acc[attr.value.replace(/(.*)Tag/, '$1')]
      return acc
    }

    // parametric curve
    let curve = xpath.select(`parametricCurveType/ParametricCurve`, node, true)
    if (curve) {
      const type = parseInt(curve.attributes.getNamedItem('FunctionType').value),
        params = curve.firstChild.nodeValue
          .trim()
          .split(/[\s\r\n]+/)
          .map((v) => dec(parseFloat(v))),
        gamma = params[0]
      switch (type) {
        case 0:
          acc[key] = { type, gamma }
          return acc
        case 1:
          acc[key] = { type, gamma, a: params[1], b: params[2] }
          return acc
        case 2:
          acc[key] = { type, gamma, a: params[1], b: params[2], c: params[3] }
          return acc
        case 3:
          acc[key] = {
            type,
            gamma,
            a: params[1],
            b: params[2],
            c: params[3],
            d: params[4]
          }
          return acc
        case 4:
          acc[key] = {
            type,
            gamma,
            a: params[1],
            b: params[2],
            c: params[3],
            d: params[4],
            e: params[5],
            f: params[6]
          }
          return acc
      }
      throw new Error(`Unsupported parametric function type: ${type}`)
    }

    let data = xpath.select(`curveType/Curve/text()`, node, true)
    if (data) {
      const arr = data.nodeValue
        .trim()
        .split(/[\s\r\n]+/)
        .map((v) => parseInt(v))
      if (arr.length === 1) {
        acc[key] = { gamma: de_s7f8(arr[0]) }
        return acc
      } else if (arr.length > 1) {
        acc[key] = arr.map((v) => de_lut16(v))
        return acc
      }
    }
    throw new Error(`Unsupported curve`)
  }, {})
}
function parse_chromatic_adaption(dom) {
  const node = xpath.select(
    `//Tags/chromaticAdaptationTag/s15Fixed16ArrayType/Array/text()`,
    dom,
    true
  )
  if (node) {
    const arr = node.nodeValue
      .trim()
      .split(/[\s\r\n]+/)
      .map((v) => dec(parseFloat(v)))

    let i = 0,
      chromaticAdaption = []
    for (let j = 0; j < 3; j++) {
      let row = []
      for (let k = 0; k < 3; k++) {
        row.push(arr[i])
        i++
      }
      chromaticAdaption.push(row)
    }
    return { chromaticAdaption }
  }
  return {}
}

class IccProfile {
  constructor() {
    this._dom = null
    this._obj = null
    this._ndin = null
    this._vcgt = null
  }
  static async fromXmlFile(file, encoding = 'utf8') {
    const xml = await fs.readFile(file, encoding)
    return IccProfile.fromXml(xml)
  }
  static fromXml(xml) {
    const icc = new IccProfile()
    icc._dom = new DOMParser().parseFromString(xml, 'text/xml')
    icc._obj = {
      ...parse_xyz_values(icc._dom),
      ...parse_curves(icc._dom),
      ...parse_chromatic_adaption(icc._dom)
    }
    return icc
  }

  get redColorant() {
    return this._obj.redColorant
  }
  get greenColorant() {
    return this._obj.greenColorant
  }
  get blueColorant() {
    return this._obj.blueColorant
  }

  get ndin() {
    if (!this._ndin) {
      this._ndin = de_ndin(this.getPrivateTagData('ndin'))
    }
    return this._ndin
  }
  get vcgt() {
    if (!this._vcgt) {
      this._vcgt = de_vcgt(this.getPrivateTagData('vcgt'))
    }
    return this._vcgt
  }

  getPrivateTagData(tag) {
    const node = xpath.select(
      `//Tags/PrivateTag[@TagSignature='${tag}']/PrivateType[@type='${tag}']/UnknownData`,
      this._dom,
      true
    )
    if (!node) {
      throw new Error(`No \'${tag}\' private tag found in the ICC profile`)
    }
    const hex = node.firstChild.nodeValue.replace(/\r\n|\n|\r|\s/g, '')
    return Buffer.from(hex, 'hex')
  }

  toJSON() {
    return JSON.stringify(this._obj, null, 2)
  }
}

function native_colorant(ndin, white) {
  const w = xyz_norm(xy2xyz(ndin.white)),
    r = xyz_norm(xy2xyz(ndin.red)),
    g = xyz_norm(xy2xyz(ndin.green)),
    b = xyz_norm(xy2xyz(ndin.blue)),
    m = [
      [r[0], g[0], b[0]],
      [r[1], g[1], b[1]],
      [r[2], g[2], b[2]]
    ],
    s = math.multiply(
      math.inv(m),
      [
        [white[0] / w[0], 0, 0],
        [0, white[1] / w[1], 0],
        [0, 0, white[1] / w[1]]
      ],
      white
    )
  return {
    redColorant: [s[0] * r[0], s[0] * r[1], s[0] * r[2]],
    greenColorant: [s[1] * g[0], g[1] * r[1], s[1] * g[2]],
    blueColorant: [s[2] * b[0], s[2] * b[1], s[2] * b[2]],
    mediaWhitePoint: white
  }
}
function native_colorant_2(ndin, white) {
  const w = xyz_norm(xy2xyz(ndin.white)),
    r = xyz_norm(xy2xyz(ndin.red)),
    g = xyz_norm(xy2xyz(ndin.green)),
    b = xyz_norm(xy2xyz(ndin.blue)),
    m = math.multiply(
      math.inv(BLADFORD_TRASNFORM),
      [
        [white[0] / w[0], 0, 0],
        [0, white[1] / w[1], 0],
        [0, 0, white[1] / w[1]]
      ],
      BLADFORD_TRASNFORM
    )
  return {
    redColorant: math.multiply[(m, r)],
    greenColorant: math.multiply[(m, g)],
    blueColorant: math.multiply[(m, b)],
    mediaWhitePoint: white
  }
}

async function main() {
  const icc = await IccProfile.fromXmlFile(
    // '/Users/masafumi/Documents/GitHub/display/icc/AW3225QF Standard.xml'
    '/Users/masafumi/Documents/Color Profiles/AW3225QF DP macOS Generated.xml'
    // '/Users/masafumi/Documents/Color Profiles/Calibrite/MBA_M2_Calibrite_50_120cd_2025-06-08_1.xml'
  )
  console.log('--------- D65 ----------------')
  let c = native_colorant(icc.ndin, D65_WHITE)
  console.log('red', icc.ndin.red, icc.redColorant, c.redColorant)
  console.log('green', icc.ndin.green, icc.greenColorant, c.greenColorant)
  console.log('blue', icc.ndin.blue, icc.blueColorant, c.blueColorant)
  console.log('--------- D65 bladford----------------')
  c = native_colorant_2(icc.ndin, D65_WHITE)
  console.log('red', icc.ndin.red, icc.redColorant, c.redColorant)
  console.log('green', icc.ndin.green, icc.greenColorant, c.greenColorant)
  console.log('blue', icc.ndin.blue, icc.blueColorant, c.blueColorant)
  console.log('--------- D50 ----------------')
  c = native_colorant(icc.ndin, D50_WHITE)
  console.log('red', icc.ndin.red, icc.redColorant, c.redColorant)
  console.log('green', icc.ndin.green, icc.greenColorant, c.greenColorant)
  console.log('blue', icc.ndin.blue, icc.blueColorant, c.blueColorant)
  console.log('--------- D50 bladford ----------------')
  c = native_colorant_2(icc.ndin, D50_WHITE)
  console.log('red', icc.ndin.red, icc.redColorant, c.redColorant)
  console.log('green', icc.ndin.green, icc.greenColorant, c.greenColorant)
  console.log('blue', icc.ndin.blue, icc.blueColorant, c.blueColorant)
}

main()
  .then(() => {})
  .catch((err) => {
    console.error('Error:', err)
  })
