const crypto = require("crypto");
BigInt.prototype.toJSON = function() { return this.toString() }
BigInt.prototype.fromJSON = function() { return BigInt(this) }

module.exports = {

  addPolynomials (a, b) {
    //console.log(a,b)
    //console.log("SALIDA= ", a,b,  this.removePolynomialDuplicates(this.sortPolynomial(a.concat(b))))
    return this.removePolynomialDuplicates(this.sortPolynomial(a.concat(b)))
  },

  evaluatePolynomial (poly, value) {
    let result = BigInt(0)
    poly.forEach((element, index) => {
      result += value ** element.degree * element.coefficient
    })
    return result
  },

  sortPolynomial (poly) {
    return poly.sort((a, b) => {return (a.degree - b.degree).toString()})
  },

  // Assumes sorted array
  removePolynomialDuplicates (poly) {
    let newPoly = []
    poly.forEach((element, index) => {
      if (index > 0 && newPoly[newPoly.length - 1].degree === element.degree){
        //console.log("Se ha dado el caso, ", newPoly[newPoly.length -1], element)
        newPoly[newPoly.length -1].coefficient = BigInt(newPoly[newPoly.length -1].coefficient) + BigInt(element.coefficient)
        //console.log("Desp", newPoly[newPoly.length -1])
      } else {
        newPoly.push(element)
      }
    })
    return newPoly
  },

  reCastPolynomialToBigInt (poly) {
    poly.forEach((element, index, array) => {
      array[index] = {
        degree: BigInt(element.degree),
        coefficient: BigInt(element.coefficient)
      }
    })
    return poly
  },

  clonePolynomial (poly) {
    return this.reCastPolynomialToBigInt(JSON.parse(JSON.stringify(poly)))
  },

  // Sketchy
  // TODO: Add hash
  randomDecimalString (len) {
    let str = ''
    for (let i = 0; i  < len; i++) {
      str += crypto.randomInt(0, 4)
    }
    return str
  }

}
