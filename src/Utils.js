const crypto = require("crypto");
const bigInt = require("big-integer")
BigInt.prototype.toJSON = function() { return this.toString() }
BigInt.prototype.fromJSON = function() { return BigInt(this) }

module.exports = {

  addPolynomials (a, b) {
    return this.removePolynomialDuplicates(this.sortPolynomial(a.concat(b)))
  },

  evaluatePolynomial (poly, value, modulo) {
    let result = bigInt()
    poly.forEach((element, index) => {
      result = result.add(value.modPow(element.degree, modulo).multiply(element.coefficient))
    })
    result = result.mod(modulo)
    return result
  },

  sortPolynomial (poly) {
    return poly.sort((a, b) => {return (a.degree - b.degree).toString()})
  },

  // Assumes sorted array
  removePolynomialDuplicates (poly) {
    let newPoly = []
    poly.forEach((element, index) => {
      if (index > 0 && newPoly[newPoly.length - 1].degree.eq(element.degree)){
        newPoly[newPoly.length -1].coefficient = bigInt(newPoly[newPoly.length -1].coefficient).add(bigInt(element.coefficient))
      } else {
        newPoly.push(element)
      }
    })
    return newPoly
  },

  reCastPolynomialToBigInt (poly) {
    poly.forEach((element, index, array) => {
      array[index] = {
        degree: bigInt(element.degree),
        coefficient: bigInt(element.coefficient)
      }
    })
    return poly
  },

  clonePolynomial (poly) {
    return this.reCastPolynomialToBigInt(JSON.parse(JSON.stringify(poly)))
  },

  // Sketchy. Just for PoC
  // Future work: Use a proper hash function
  randomDecimalString (len) {
    let str = ''
    for (let i = 0; i  < len; i++) {
      str += crypto.randomInt(0, 10)
    }
    return str
  },

  standardDeviation (data, mean) {
    let variance = 0
    mean = parseFloat(mean.replace(/,/g, '')) // Cast to float
    for (let i = 0; i < data.length; i++) {
      variance += Math.pow((data[i] - mean), 2)
    }
    variance = variance / data.length
    return Math.sqrt(variance)
  }
}
