const fs = require('node:fs/promises'),
  { DOMParser, XMLSerializer } = require('@xmldom/xmldom'),
  xpath = require('xpath')

function textQuery(query) {
  return query.endsWith('/text()') ? query : query + '/text()'
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

  selectText(query) {
    const text = this.select(textQuery(query), true)
    if (!text) {
      return null
    }
    return text.nodeValue
  }

  selectBuffer(query) {
    const text = this.selectText(query, true)
    if (!text) {
      return null
    }
    return Buffer.from(text.replace(/\r\n|\n|\r|\s/g, ''), 'hex')
  }

  selectArray(query, mapper) {
    const text = this.selectText(query, true)
    if (!text) {
      return null
    }
    return text
      .trim()
      .split(/[\s\r\n]+/)
      .map(mapper)
  }

  select(query, single = false) {
    return xpath.select(query, this._dom, single)
  }
}
