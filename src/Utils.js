module.exports = {

  addPolynomials (a, b) {
    const result = new Map()
    a.forEach((v, k) => {
      result.set(k, v)
    })
    b.forEach((v, k) => {
      if (result.has(k)) {
        result.set(k, result.get(k) + v)
      } else {
        result.set(k, v)
      }
    })
    return result
  },

  evaluatePolynomial (poly, value) {
    let result = BigInt(0)
    poly.forEach((v, k) => {
      result += value ** k * v
    })
    return result
  }
}
