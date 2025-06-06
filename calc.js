const math = require('mathjs')

const aw3225qf_edid = {
  desc: 'aw3225qf',
  red: [0.6835, 0.3046],
  green: [0.2421, 0.7099],
  blue: [0.1445, 0.0527],
  white: [0.3127, 0.3291]
}

const s3221qs_edid = {
  desc: 's3221qs',
  red: [0.6757, 0.3115],
  green: [0.2763, 0.6562],
  blue: [0.1533, 0.0673],
  white: [0.3134, 0.3291]
}

const bladford_transform = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296]
]

const bladford_inverse_transform = [
  [0.986992905, -0.147054256, 0.159962118],
  [0.432305306, 0.518360271, 0.049291229],
  [-0.00852866, 0.040042821, 0.968486735]
]

// based on Display P3.icc
const d50_white = [0.96418762207, 1.0, 0.824890136719]
const transform_d65_to_d50 = [
  [1.047882080078, 0.022918701172, -0.050201416016],
  [0.029586791992, 0.990478515625, -0.017059326172],
  [0.009231567383, 0.015075683594, 0.751678466797]
]

function calibrate(edid, measured_white_xy) {
  const edid_white = xy2xyz(edid.white),
    white = xy2xyz(measured_white_xy),
    transform = math.multiply(
      bladford_inverse_transform,
      [
        [white[0] / edid_white[0], 0, 0],
        [0, white[1] / edid_white[1], 0],
        [0, 0, white[2] / edid_white[2]]
      ],
      bladford_transform
    )
  const result = Object.assign({}, edid, {
    red: scaleSumUpTo1(math.multiply(transform, xy2xyz(edid.red))).slice(0, 2),
    green: scaleSumUpTo1(math.multiply(transform, xy2xyz(edid.green))).slice(0, 2),
    blue: scaleSumUpTo1(math.multiply(transform, xy2xyz(edid.blue))).slice(0, 2),
    white: measured_white_xy
  })
  return result
}

function xy2xyz(xy) {
  return [xy[0], xy[1], Math.trunc((1 - xy[0] - xy[1]) * 10000) / 10000]
}

function scaleBaseY(xyz) {
  return [xyz[0] / xyz[1], 1.0, xyz[2] / xyz[1]]
}

function scaleSumUpTo1(xyz) {
  const sum = xyz.reduce((acc, v) => acc + v, 0)
  return xyz.map((v) => v / sum)
}

function strXYZNumber(xyz) {
  return `<XYZNumber X="${xyz[0]}" Y="${xyz[1]}" Z="${xyz[2]}"/>`
}

function strMatrixArray(transform) {
  return '<Array>\n  ' + transform.map((row) => row.join(' ')).join('\n  ') + '\n</Array>'
}

function v2profile(edid) {
  const transform_d50_to_d65 = math.inv(transform_d65_to_d50),
    d65_white = scaleBaseY(math.multiply(transform_d50_to_d65, d50_white))

  console.log('icc v2 profile for', edid.desc, '----------->')
  console.log('white *EDID strict:', strXYZNumber(scaleBaseY(xy2xyz(edid.white))))

  console.log('white *D65:', strXYZNumber(d65_white))
  console.log('red:', strXYZNumber(scaleSumUpTo1(xy2xyz(edid.red))))
  console.log('green:', strXYZNumber(scaleSumUpTo1(xy2xyz(edid.green))))
  console.log('blue:', strXYZNumber(scaleSumUpTo1(xy2xyz(edid.blue))))
  console.log('<-----------\n')
}

function v4profile(edid) {
  const transform_d50_to_d65 = math.inv(transform_d65_to_d50),
    d65_white = scaleBaseY(math.multiply(transform_d50_to_d65, d50_white)),
    edid_white = scaleBaseY(xy2xyz(edid.white)),
    transform_d50_to_target = math.multiply(transform_d50_to_d65, [
      [edid_white[0] / d65_white[0], 0, 0],
      [0, edid_white[1] / d65_white[1], 0],
      [0, 0, edid_white[2] / d65_white[2]]
    ]),
    transform_target_to_d50 = math.inv(transform_d50_to_target),
    transform = (xy) => scaleSumUpTo1(math.multiply(transform_d65_to_d50, xy2xyz(xy))),
    transform_strict = (xy) => scaleSumUpTo1(math.multiply(transform_target_to_d50, xy2xyz(xy)))

  // console.log("d50_white:", d50_white);
  // console.log("edid_white:", edid_white);
  // console.log(
  //   "edid_white to d50:",
  //   scaleBaseY(math.multiply(transform_target_to_d50, edid_white)),
  // );

  console.log('Assuming the white-point is D65, icc v4 profile for', edid.desc, '----------->')
  console.log('white:', strXYZNumber(d50_white))
  console.log('red:', strXYZNumber(transform(edid.red)))
  console.log('green:', strXYZNumber(transform(edid.green)))
  console.log('blue:', strXYZNumber(transform(edid.blue)))
  console.log('chromaticAdaption:\n', strMatrixArray(transform_d65_to_d50))
  console.log('<-----------\n')

  console.log('EDID strict, icc v4 profile for', edid.desc, '----------->')
  console.log('white:', strXYZNumber(d50_white))
  console.log('red:', strXYZNumber(transform_strict(edid.red)))
  console.log('green:', strXYZNumber(transform_strict(edid.green)))
  console.log('blue:', strXYZNumber(transform_strict(edid.blue)))
  console.log('chromatic adaption:\n', strMatrixArray(transform_target_to_d50))
  console.log('<-----------\n')
}

v2profile(aw3225qf_edid)
v4profile(aw3225qf_edid)

v2profile(s3221qs_edid)
v4profile(s3221qs_edid)

// Slightly warmer color(D60 ?) than macbook
// v2profile(calibrate(aw3225qf_edid, [0.3333, 0.3333]))
// v4profile(calibrate(aw3225qf_edid, [0.3333, 0.33767]))

// white point is massively shifted
// v2profile(calibrate(s3221qs_edid, [0.3333, 0.3333]))
// v4profile(calibrate(s3221qs_edid, [0.3333, 0.3333]))
