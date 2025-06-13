const fs = require('node:fs/promises'),
  { DOMParser, XMLSerializer } = require('@xmldom/xmldom'),
  xpath = require('xpath')

function parseArray(text, mapper) {
  return text
    .trim()
    .split(/[\s\r\n]+/)
    .map(mapper)
}

function parseBuffer(text) {
  return Buffer.from(text.replace(/\r\n|\n|\r|\s/g, ''), 'hex')
}

function parseXYZNumber(node) {
  return ['X', 'Y', 'Z'].map((c) => parseFloat(node.attributes.getNamedItem(c).value))
}

function parseValue(s) {
  s = s.trim()
  // boolean
  if (s === 'true') return true
  if (s === 'false') return false
  // number
  const num = +s
  if (!isNaN(num) && num !== Infinity && num !== -Infinity) {
    return num
  }
  const date = new Date(s)
  if (date.toString() !== 'Invalid Date') {
    return date
  }
  return s
}

module.exports = class IccMaxDOM {
  constructor() {
    this._dom = null
  }

  static async fromXmlFile(file, encoding = 'utf8') {
    const xml = await fs.readFile(file, encoding)
    return IccMaxDOM.fromXml(xml)
  }

  static fromXml(xml) {
    const instance = new IccMaxDOM()
    instance._dom = new DOMParser().parseFromString(xml, 'text/xml')
    return instance
  }

  select(query, single = false) {
    return xpath.select(query, this._dom, single)
  }

  selectText(query) {
    const node = this.select(query, true)
    if (!node) {
      return null
    }
    return node.textContent
  }

  selectBuffer(query) {
    const text = this.selectText(query, true)
    if (!text) {
      return null
    }
    return parseBuffer(text)
  }

  selectArray(query, mapper) {
    const text = this.selectText(query, true)
    if (!text) {
      return null
    }
    return parseArray(text, mapper)
  }

  selectXYZNumber(query) {
    const node = this.select(query, true)
    return parseXYZNumber(node)
  }

  selectHeader() {
    return this.select('IccProfile/Header/*').reduce((obj, node) => {
      let value = null
      if (node.attributes.length) {
        value = {}
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i]
          value[attr.name] = parseValue(attr.value)
        }
      } else if (node.tagName === 'PCSIlluminant') {
        value = parseXYZNumber(xpath.select('XYZNumber', node, true))
      } else {
        value = parseValue(node.textContent)
      }
      obj[node.tagName] = value
      return obj
    }, {})
  }

  selectDisplayChromaticity() {
    return ['w', 'r', 'g', 'b'].reduce((obj, ch) => {
      const tags = {
        w: 'mediaWhitePoint',
        r: 'redColorant',
        g: 'greenColorant',
        b: 'blueColorant'
      }
      obj[ch] = this.selectXYZNumber(`/IccProfile/Tags/${tags[ch]}Tag/XYZArrayType/XYZNumber`)
      return obj
    }, {})
  }

  selectChromaticAdaption() {
    const array = this.selectArray(
      `/IccProfile/Tags/chromaticAdaptationTag/s15Fixed16ArrayType/Array`,
      parseFloat
    )
    if (!array) {
      return null
    }
    let i = 0,
      matrix = []
    for (let j = 0; j < 3; j++) {
      let row = []
      for (let k = 0; k < 3; k++) {
        row.push(array[i])
        i++
      }
      matrix.push(row)
    }
    return matrix
  }

  /**
   * @param {string} ch - 'red', 'green' or 'blue' | 'r', 'g' or  'b'
   */
  selectToneResponseCurve(ch) {
    const c = ch.length === 1 ? { r: 'red', g: 'green', b: 'blue' }[ch] : ch
    let node = this.select(`/IccProfile/Tags/${c}TRCTag`, true)
    if (!node) {
      return undefined
    }

    // SameAs
    const attr = node.attributes.getNamedItem('SameAs')
    if (attr) {
      return {
        sameAs: attr.value.replace(/(.*)TRCTag/, '$1')
      }
    }

    // parametric curve
    let curve = xpath.select(`parametricCurveType/ParametricCurve`, node, true)
    if (curve) {
      const type = parseInt(curve.attributes.getNamedItem('FunctionType').value),
        params = parseArray(curve.textContent, parseFloat),
        gamma = params[0]
      switch (type) {
        case 0:
          return { type, gamma }
        case 1:
          return { type, gamma, a: params[1], b: params[2] }
        case 2:
          return { type, gamma, a: params[1], b: params[2], c: params[3] }
        case 3:
          return {
            type,
            gamma,
            a: params[1],
            b: params[2],
            c: params[3],
            d: params[4]
          }
        case 4:
          return {
            type,
            gamma,
            a: params[1],
            b: params[2],
            c: params[3],
            d: params[4],
            e: params[5],
            f: params[6]
          }
      }
      throw new Error(`Unsupported parametric function type: ${type}`)
    }

    curve = xpath.select(`curveType/Curve`, node, true)
    if (curve) {
      const array = parseArray(curve.textContent, (v) => parseInt(v))
      if (array.length === 1) {
        return { gamma: arr[0] }
      } else if (array.length > 1) {
        return array
      }
    }
    throw new Error(`Unsupported curve`)
  }

  selectPrivateTagData(tag) {
    return this.selectBuffer(
      `/IccProfile/Tags/PrivateTag[@TagSignature='${tag}']/PrivateType[@type='${tag}']/UnknownData`
    )
  }
}
