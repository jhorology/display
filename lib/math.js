/**
 * Calculate the coefficients of a quadratic polynomial that passes through three points.
 * The points are given as (x1, y1), (x2, y2), (x3, y3).
 * The polynomial is of the form:
 * f(x) = a * x^2 + b * x + c
 * where:
 * - a, b, c are the coefficients of the polynomial
 * - p is the x-coordinate of the vertex of the parabola
 * - q is the y-coordinate of the vertex of the parabola
 * - f is a function that evaluates the polynomial at a given x
 * @param {Array} p0 - coordinates of the first point
 * @param {Array} p1 - coordinates of the first point
 * @param {Array} p2 - coordinates of the second point
 * @returns {object} An object containing the coefficients a, b, c, the vertex coordinates {x, y}, and a function f to evaluate the polynomial
 * @throws {Error} If the points are collinear or if the x-coordinates are not distinct
 */
function quadraticInterpolation(p0, p1, p2) {
  const x0 = p0[0],
    y0 = p0[1],
    x1 = p1[0],
    y1 = p1[1],
    x2 = p2[0],
    y2 = p2[1]
  if (x0 === x1 || x0 === x2 || x1 === x2) {
    throw new Error('Duplicate x coordinates in arguments')
  }
  const denom_ab = (x1 - x0) * (x2 - x1) * (x0 - x2)

  if (denom_ab === 0) {
    throw new Error("Can't" + ' calculate quadratic interpolation for collinear points')
  }

  const a = (x0 * (y2 - y1) + x1 * (y0 - y2) + x2 * (y1 - y0)) / denom_ab,
    b = (y1 - y0 - a * (x1 * x1 - x0 * x0)) / (x1 - x0),
    c = y0 - a * x0 * x0 - b * x0

  let vertex = null

  if (a !== 0) {
    const vx = -b / (2 * a)
    vertex = [vx, a * vx * vx + b * vx + c]
  }

  return {
    a: a,
    b: b,
    c: c,
    vertex,
    f: (x) => a * x * x + b * x + c
  }
}

function distanceFromPointToPoint(p1, p2) {
  const x1 = p1[0],
    y1 = p1[1],
    x2 = p2[0],
    y2 = p2[1]
  if (x1 === x2 && y1 === y2) {
    throw new Error('The two points are identical. A unique line cannot be defined.')
  }
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * Calculate the shortest distance between a point and a line ax + by + c = 0,
 * the intersection, and the positional relationship between a point and a line.
 *
 * @param {number} x - x cordinate of point
 * @param {number} y - y cordinate of point
 * @param {Object} {A, B, C} | {m, b} - coefficient of line expression Ax + BY + C=0 or y = mx + b
 * @param {number} cnv - selector of component of normal vector of line. -1:follow A,B, 0: x, 1:y
 * @param {number} nvsign - sign of normal vector selected by `cnv`, -1 or 1
 * @returns {object | null} distance, intersection and positioning of points { distance: number, sign: number, intersection: { x: number, y: number } }
 */
function distanceFromPointToLine(point, line, cnv = -1, nvsign = 1) {
  const x = point[0],
    y = point[1],
    { A, B, C } = generalizeLine(line, cnv, nvsign),
    denominator = A * A + B * B

  if (denominator === 0) {
    throw new Error(
      'The line coefficients (a, b) cannot both be zero. This does not define a line.'
    )
  }
  const valueAtPoint = A * x + B * y + C,
    distance = Math.abs(valueAtPoint) / Math.sqrt(denominator),
    // intersection point (x0, y0) on the line
    x0 = x - (A * valueAtPoint) / denominator,
    y0 = y - (B * valueAtPoint) / denominator,
    // From the positional relationship of (x, y), the normal vector side is positive.
    sign = valueAtPoint >= 0 ? 1 : -1

  return {
    distance,
    sign,
    intersection: [x0, y0],
    valueAtPoint
  }
}

function lineFromSlopeAndPoint(m, point) {
  if (m === Infinity || m === -Infinity) {
    return {
      m: m,
      b: point[0],
      A: 1,
      B: 0,
      C: -point[0],
      f: (x) => point[0]
    }
  }
  const x = point[0],
    y = point[1],
    b = y - m * x
  return {
    m,
    b,
    A: m,
    B: -1,
    C: b,
    f: (x) => m * x + b
  }
}

function lineFromTwoPoints(p1, p2) {
  const x1 = p1[0],
    y1 = p1[1],
    x2 = p2[0],
    y2 = p2[1]
  if (x1 === x2 && y1 === y2) {
    throw new Error('The two points are identical. A unique line cannot be defined.')
  }
  const m = (y2 - y1) / (x2 - x1),
    b = y1 - m * x1
  return {
    m,
    b,
    A: m,
    B: -1,
    C: b,
    f: (x) => m * x + b
  }
}

function lineIntersection(line1, line2) {
  const { A: A1, B: B1, C: C1 } = generalizeLine(line1),
    { A: A2, B: B2, C: C2 } = generalizeLine(line2)

  const denominator = A1 * B2 - A2 * B1
  if (denominator === 0) {
    if (A1 * C2 - A2 * C1 === 0 && B1 * C2 - B2 * C1 === 0) {
      throw new Error('Lines are coincident.')
    } else {
      throw new Error('Lines are parallels.')
    }
  }

  // normal vector n1 = (A1, B1), n2 = (A2, B2)
  const dotProduct = A1 * A2 + B1 * B2,
    n1 = Math.sqrt(A1 * A1 + B1 * B1),
    n2 = Math.sqrt(A2 * A2 + B2 * B2)

  if (n1 === 0 || n2 === 0) {
    throw new Error('Invalid line equation (one or both lines are undefined).')
  }

  const theta = dotProduct / (n1 * n2)

  const clampedTheta = Math.max(-1.0, Math.min(1.0, theta))
  let radians = Math.acos(clampedTheta)
  radians = Math.min(radians, Math.PI - radians)

  return {
    intersection: [(B1 * C2 - B2 * C1) / denominator, (A2 * C1 - A1 * C2) / denominator],
    radians
  }
}

function rotatePoint(point, centerPoint, radians) {
  const // move center to origin
    translatedX = point[0] - centerPoint[0],
    translatedY = point[1] - centerPoint[1],
    // rotate
    cosTheta = Math.cos(radians),
    sinTheta = Math.sin(radians),
    rotatedX = translatedX * cosTheta - translatedY * sinTheta,
    rotatedY = translatedX * sinTheta + translatedY * cosTheta
  return [rotatedX + centerPoint.x, rotatedY + centerPoint.y]
}

/**
 * Determine whether a point is within a specified sector,
 * Returns the relative angle from the starting angle and distance from center point, if present.
 *
 * @param {Array} point Coordinates of the point you want to judg [x, y]
 * @param {Array} center center coordinates of sector [x, y]
 * @param {number} startAngleRad Starting angle of the sector (in radians). Counterclockwise from the positive direction of the X-axis.
 * @param {number} endAngleRad Ending angle of the sector (in radians). Counterclockwise from the positive direction of the X-axis.
 * @param [{number}] radius sector radius
 * @returns {{angleFromStart: number, distance: number}|null}
 * - angleFromStart: Relative angle from the starting angle if the point is within the sector
 * - distance: distance from center point if the point is within the sector
 * return nulll if the point is outside the sector
 */
function pointInSector(point, center, startAngleRad, endAngleRad, radius = Infinity) {
  const dx = point[0] - center[0],
    dy = point[1] - center[1],
    // distance from center points
    distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > radius) {
    return null
  }

  const pointAngle = normalizeAngle0To2PI(Math.atan2(dy, dx)),
    normalizedStartAngle = normalizeAngle0To2PI(startAngleRad),
    normalizedEndAngle = normalizeAngle0To2PI(endAngleRad)
  let angleFromStart = null
  if (normalizedStartAngle <= normalizedEndAngle) {
    if (pointAngle >= normalizedStartAngle && pointAngle <= normalizedEndAngle) {
      angleFromStart = pointAngle - normalizedStartAngle
    }
  } else {
    // sector crosses the 0 radian line
    if (pointAngle >= normalizedStartAngle || pointAngle <= normalizedEndAngle) {
      if (pointAngle >= normalizedStartAngle) {
        angleFromStart = pointAngle - normalizedStartAngle
      } else {
        // angle from startAngle in next round
        angleFromStart = 2 * Math.PI - normalizedStartAngle + pointAngle
      }
    }
  }
  if (angleFromStart !== null) {
    return { angleFromStart, distance }
  }
  return null
}
/**
 * Generalize line representation to a standard form Ax + By + C = 0.
 * @param {Object} line - Line representation, either {A, B, C} or {m, b}.
 * @param {number} cnv - selector of component of normal vector of line. -1:follow A,B, 0: x, 1:y
 * @param {number} sign - Sign of normal vector selected by `cnv`, -1 or 1.
 */
function generalizeLine(line, cnv = -1, sign = 1) {
  let A, B, C
  if (line.hasOwnProperty('A') && line.hasOwnProperty('B') && line.hasOwnProperty('C')) {
    A = line.A
    B = line.B
    C = line.C
  } else if (line.hasOwnProperty('m') && line.hasOwnProperty('b')) {
    A = line.m
    B = -1
    C = line.b
  } else {
    throw new Error('Invalid argument line:' + line)
  }
  // direct normal vector
  if (
    (cnv === 0 && sign == -1 && A > 0) ||
    (cnv === 0 && sign == 1 && A < 0) ||
    (cnv === 1 && sign == -1 && B > 0) ||
    (cnv === 1 && sign == 1 && B < 0)
  ) {
    A = -A
    B = -B
  }
  return { A, B, C }
}

/**
 * normalize angle from 0 to 2*PI.
 * @param {number} angleRad angle in radians
 * @returns {number} normalized angle in radians
 */
function normalizeAngle0To2PI(angleRad) {
  let normalized = angleRad % (2 * Math.PI)
  if (normalized < 0) {
    normalized += 2 * Math.PI
  }
  return normalized
}

function angleFromSlope(m) {
  if (m === Infinity || m === -Infinity) {
    return Math.PI / 2
  }
  const angle = Math.atan(m)
  return angle < 0 ? angle + Math.PI : angle
}

module.exports = {
  quadraticInterpolation,
  distanceFromPointToPoint,
  distanceFromPointToLine,
  lineFromSlopeAndPoint,
  lineFromTwoPoints,
  lineIntersection,
  rotatePoint,
  pointInSector,
  normalizeAngle0To2PI,
  angleFromSlope
}
