function toUnknownData(buffer) {
  if (!buffer || !buffer.length) {
    return []
  }
  return buffer.toString('hex').match(/.{1,64}/g)
}

function toLut(array, numDigits = 5) {
  const splitSize = 16
  if (!array || !array.length) {
    return []
  }
  const splits = []
  for (let i = 0; i < array.length; i += splitSize) {
    splits.push(
      array.slice(i, i + splitSize).reduce((s, v) => {
        return s + (v | 0).toString().padStart(numDigits)
      }, '')
    )
  }
  return splits
}

module.exports = {
  toUnknownData,
  toLut
}
