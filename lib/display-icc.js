const fs = require('node:fs/promises'),
  math = require('mathjs'),
  fp = require('./fp'),
  BRADFORD_TRANSNFORM = [
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
  D65_WHITE = [0.95047, 1, 1.08883],
  D50_WHITE = [0.96422, 1, 0.82521]

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
  return chromaticAdapt(BRADFORD_TRANSNFORM, c_xyz_src, w_xyz_dst)
}

function chromaticAdaptCAT02(c_xyz_src, w_xyz_dst) {
  return chromaticAdapt(CIE_CAT02_TRANSFORM, c_xyz_src, w_xyz_dst)
}

function chromaticAdaptBradfordD50(c_xyz_src) {
  return chromaticAdaptBradford(c_xyz_src, D50_WHITE)
}

function chromaticAdaptCAT02D50(c_xyz_src) {
  return chromaticAdaptCAT02(c_xyz_src, D50_WHITE)
}

function xyzChromaticity(wrgb_xy_cord) {
  const // normalize base Y
    w = xy2xyz(wrgb_xy_cord.w, true, true),
    r = xy2xyz(wrgb_xy_cord.r, true, true),
    g = xy2xyz(wrgb_xy_cord.g, true, true),
    b = xy2xyz(wrgb_xy_cord.b, true, true),
    // r, g, b luminance ratio
    lr = math.multiply(math.inv(math.transpose([r, g, b])), w)
  return {
    w,
    r: math.multiply(r, lr[0]),
    g: math.multiply(g, lr[1]),
    b: math.multiply(b, lr[2])
  }
}

module.exports = {
  createChromaticAdaption,
  chromaticAdapt,
  chromaticAdaptBradford,
  chromaticAdaptBradfordD50,
  chromaticAdaptCAT02,
  chromaticAdaptCAT02D50,
  xyzChromaticity
}
