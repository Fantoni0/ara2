const crypto = require('crypto')
const bigInt = require('big-integer')
BigInt.prototype.toJSON = function () { return this.toString() }
BigInt.prototype.fromJSON = function () { return BigInt(this) }

module.exports = {
  /**
   * Sums two polynomials and aggregates equal terms.
   * @param a First polynomial.
   * @param b Second polynomial.
   * @return {*[]} Resulting polynomial
   */
  addPolynomials (a, b) {
    return this.removePolynomialDuplicates(this.sortPolynomial(a.concat(b)))
  },

  /**
   * Evaluates a polynomial for a given value using modular arithmetic.
   * @param poly Polynomial to evaluate.
   * @param value Value to substitute.
   * @param modulo Modulo.
   * @return {*}
   */
  evaluatePolynomial (poly, value, modulo) {
    let result = bigInt()
    poly.forEach((element, index) => {
      result = result.add(value.modPow(element.degree, modulo).multiply(element.coefficient))
    })
    result = result.mod(modulo)
    return result
  },

  /**
   * Given a polynomial, returns the ordered (according to the exponent) version.
   * @param poly Polynomial to sort.
   * @return {*}
   */
  sortPolynomial (poly) {
    return poly.sort((a, b) => { return (a.degree - b.degree).toString() })
  },

  /**
   * Sums different terms with the same degree.
   * ASSUMES A SORTED POLYNOMIAL!
   * @param poly Polynomial to remove duplicates from.
   * @return {*[]}
   */
  removePolynomialDuplicates (poly) {
    const newPoly = []
    poly.forEach((element, index) => {
      if (index > 0 && newPoly[newPoly.length - 1].degree.eq(element.degree)) {
        newPoly[newPoly.length - 1].coefficient = bigInt(newPoly[newPoly.length - 1].coefficient).add(bigInt(element.coefficient))
      } else {
        newPoly.push(element)
      }
    })
    return newPoly
  },

  /**
   * Makes sure all the terms in a polynomial are Big Integers after receiving the JSON representation.
   * @param poly Polynomial to recast.
   * @return {*}
   */
  reCastPolynomialToBigInt (poly) {
    poly.forEach((element, index, array) => {
      array[index] = {
        degree: bigInt(element.degree),
        coefficient: bigInt(element.coefficient)
      }
    })
    return poly
  },

  /**
   * Obtains a copy fromm a given polynomial
   * @param poly Given polynomial.
   * @return {*}
   */
  clonePolynomial (poly) {
    return this.reCastPolynomialToBigInt(JSON.parse(JSON.stringify(poly)))
  },

  /**
   * Generates a random string.
   * SKETCHY. Just for PoC. Use a proper hash function for real implementations!
   * @param len
   * @return {string}
   */
  randomDecimalString (len) {
    let str = ''
    for (let i = 0; i < len; i++) {
      str += crypto.randomInt(0, 10)
    }
    return str
  },

  /**
   * Computes the standard deviation of given data in array format.
   * @param data Data to compute the STD.
   * @param mean Mean of the data.
   * @return {number} Standard deviation.
   */
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
