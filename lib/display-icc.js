const fs = require('node:fs/promises'),
  math = require('mathjs'),
  fp = require('./fp'),
  BRADFORD_TRANSFORM = [
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, -0.0685, 1.0296]
  ],
  CIE_CAT02_TRANSFORM = [
    [0.7328, 0.4296, -0.1624],
    [-0.7036, 1.6975, 0.0061],
    [0.003, 0.0136, 0.9834]
  ],
  // CIE
  CIE_D65_WHITE = [0.95047, 1, 1.08883],
  CIE_D50_WHITE = [0.96422, 1, 0.82521],
  // This value is used as PCSIlluminant in many display profiles,
  // and this seems to be accurate for profiles on macos.
  DISPLAY_PCS_D50_WHITE = [0.964202880859, 1.0, 0.824905395508],
  DISPLAY_P3_CURVE = {
    type: 3,
    gamma: 2.399993896484,
    a: 0.947860717773,
    b: 0.052139282227,
    c: 0.077392578125,
    d: 0.040451049805
  }

function xy2xyz(xy, normalize = false, s15f16int = false) {
  const xyz = [xy[0], xy[1], (s15f16int ? 0x10000 : 1) - xy[0] - xy[1]]
  return normalize ? xyz_normalize(xyz) : xyz
}

function xyz_normalize(xyz) {
  return [xyz[0] / xyz[1], 1, xyz[2] / xyz[1]]
}

// Comparison verification value
function validate_s15f16(r) {
  const ui = fp.toS15F16Int32(r)
  return fp.fromS15F16Int32(ui)
}

function createChromaticAdaption(transform, w_xyz_src, w_xyz_dst) {
  const w_lms_src = math.multiply(transform, w_xyz_src),
    w_lms_dst = math.multiply(transform, w_xyz_dst),
    von_kries_transform = [
      [w_lms_dst[0] / w_lms_src[0], 0, 0],
      [0, w_lms_dst[1] / w_lms_src[1], 0],
      [0, 0, w_lms_dst[2] / w_lms_src[2]]
    ]
  return math.multiply(math.inv(transform), von_kries_transform, transform)
}

function createChromaticAdaptionBradford(w_xyz_src, w_xyz_dst) {
  return createChromaticAdaption(BRADFORD_TRANSFORM, w_xyz_src, w_xyz_dst)
}

function createChromaticAdaptionCAT02(w_xyz_src, w_xyz_dst) {
  return createChromaticAdaption(CIE_CAT02_TRANSFORM, w_xyz_src, w_xyz_dst)
}

function chromaticAdapt(transform, c_xyz_src, w_xyz_dst) {
  const chad = createChromaticAdaption(transform, c_xyz_src.w, w_xyz_dst)
  return {
    w: w_xyz_dst,
    r: math.multiply(chad, c_xyz_src.r),
    g: math.multiply(chad, c_xyz_src.g),
    b: math.multiply(chad, c_xyz_src.b),
    chad
  }
}
function chromaticAdaptBradford(c_xyz_src, w_xyz_dst) {
  return chromaticAdapt(BRADFORD_TRANSFORM, c_xyz_src, w_xyz_dst)
}

function chromaticAdaptCAT02(c_xyz_src, w_xyz_dst) {
  return chromaticAdapt(CIE_CAT02_TRANSFORM, c_xyz_src, w_xyz_dst)
}

function chromaticAdaptBradfordD50(c_xyz_src) {
  return chromaticAdaptBradford(c_xyz_src, DISPLAY_PCS_D50_WHITE)
}

function chromaticAdaptCAT02D50(c_xyz_src) {
  return chromaticAdaptCAT02(c_xyz_src, DISPLAY_PCS_D50_WHITE)
}

function xyzChromaticity(wrgb_xy_cord, s15f16int = true) {
  const // normalize base Y
    w = xy2xyz(wrgb_xy_cord.w, true, s15f16int),
    r = xy2xyz(wrgb_xy_cord.r, true, s15f16int),
    g = xy2xyz(wrgb_xy_cord.g, true, s15f16int),
    b = xy2xyz(wrgb_xy_cord.b, true, s15f16int),
    // r, g, b luminance ratio
    lr = math.multiply(math.inv(math.transpose([r, g, b])), w)
  return {
    w,
    r: math.multiply(r, lr[0]),
    g: math.multiply(g, lr[1]),
    b: math.multiply(b, lr[2])
  }
}

function createLutInputArray(inputBits = 10) {
  const inputSize = 1 << inputBits
  return [...Array(inputSize).keys()].map((v) => v / (inputSize - 1))
}

function createLut(fn, inputBits = 10, outputBits = 16) {
  const inputs = createLutInputArray(inputBits),
    multiplier = (1 << outputBits) - 1
  let t = 0
  switch (fn.type) {
    case 0:
      return inputs.map((x) => Math.round(x ** fn.gamma * multiplier))
    case 1:
      t = -fn.b / fn.a
      return inputs.map((x) => (x < t ? 0 : Math.round((fn.a * x + fn.b) ** fn.gamma * multiplier)))
    case 2:
      t = -fn.b / fn.a
      return inputs.map((x) =>
        Math.round((x < t ? fn.c : (fn.a * x + fn.b) ** fn.gamma) * multiplier)
      )
    case 3:
      return inputs.map((x) =>
        Math.round((x < fn.d ? fn.c * x : (fn.a * x + fn.b) ** fn.gamma) * multiplier)
      )
    case 4:
      return inputs.map((x) =>
        Math.round((x < fn.d ? fn.c * x + fn.f : (fn.a * x + fn.b) ** fn.gamma + fn.e) * multiplier)
      )
  }
  throw new Error('Unsupported parametric funtion type:' + fn.type)
}

// Fine-tuned to perfectly match the LUT created by macos
function createMacDefaultLut(inputBits = 10, outputBits = 16) {
  // const displayP3ParametricCurve = {
  //   type: 3,
  //   gamma: 2.399993896484,
  //   a: 0.947860717773,
  //   b: 0.052139282227,
  //   c: 0.077392578125,
  //   d: 0.040451049805
  // }
  //
  // x = 1)
  //   (a + b) ** gamma = 1
  //    b = 1 -a
  // x = d)
  //   c * d = (a * d + (1 - a)) ** gamma
  //   (c * d) ** (1 / gamma) = a * d + (1 - a)
  //   (c * d) ** (1 / gamma) = a * (d - 1) + 1
  //   a = (((c * d) ** (1 / gamma)) - 1) / (d - 1)
  //
  // first 48 points of LUT macos generated
  //     0     5    10    15    20    25    30    35    40    45    50    54    59    64    69    74
  //    79    84    89    94    99   104   109   114   119   124   129   134   139   144   149   154
  //   159   163   168   173   178   183   188   193   198   203   208   213   219   224   229   235
  //                                                             ^ Display P3 d point
  //  index
  //   41 -> 203   x=0.04007820136852395  y=0.0030975814450293735 c=y/x=0.07728843459183046
  //     d point   x=0.040451049805       y=0.0031306110322717284 c=    0.077392578125
  //   42 -> 208   x=0.04105571847507331  y=0.0031738765545128557 c=y/x=0.07730656464920599
  const gamma = 2.399993896484,
    c = 0.077392578125,
    d = 0.040451049805,
    a = ((c * d) ** (1 / gamma) - 1) / (d - 1),
    b = 1 - a
  const inputs = createLutInputArray(inputBits),
    multiplier = (1 << outputBits) - 1
  return inputs.map((x) => Math.round((x < d ? c * x : Math.pow(a * x + b, gamma)) * multiplier))
}

function createDellDefaultLut(inputBits = 10, outputBits = 16) {
  //
  // https://en.wikipedia.org/wiki/SRGB
  //
  //  first 64 points of LUT Alienware_AW32225QF_Native.icm
  //    0     5    10    15    20    25    30    35    40    45    50    55    60    65    70    75
  //   80    85    90    94    99   104   109   114   119   124   129   134   139   144   149   154
  //  159   164   169   174   178   183   188   193   198   203   208   213   219   224   229   235
  //  240   246   251   257   263   269   275   281   287   293   299   306   312   318   325   332
  // const inputs = createLutInputArray(inputBits),
  //   multiplier = (1 << outputBits) - 1
  // const gamma = 2.399993896484,
  //   c = 0.077392578125,
  //   d = 0.040451049805,
  //   a = ((c * d) ** (1 / gamma) - 1) / (d - 1),
  //   b = 1 - a
  // return inputs.map((x) => Math.round((x < d ? c * x : Math.pow(a * x + b, gamma)) * multiplier))

  // All points difference within 1
  return createLut(DISPLAY_P3_CURVE, inputBits, outputBits)
}

module.exports = {
  createChromaticAdaption,
  createChromaticAdaptionBradford,
  createChromaticAdaptionCAT02,
  chromaticAdapt,
  chromaticAdaptBradford,
  chromaticAdaptBradfordD50,
  chromaticAdaptCAT02,
  chromaticAdaptCAT02D50,
  xyzChromaticity,
  createLut,
  createMacDefaultLut,
  createDellDefaultLut
}
