function User (obj) {
  if (!(this instanceof User)) {
    throw new TypeError('User constructor called without "new".')
  }
  obj = obj || {}

  if (Array.isArray(obj.attr)) {
    this.attr = obj.attr.map(function (i) {
      return new LineAttribute(i)
    })
  } else {
    this.attr = []
  }
  if (Array.isArray(obj.lines)) {
    this.lines = obj.lines.map(function (i) {
      return new Line(i)
    })
  } else {
    this.lines = []
  }
  if (obj.penDown) {
    // this User object got saved while the user was still drawing
    // so delete the incomplete line.
    this.lines.pop()
  }
  this.penDown = false // also known as !lineComplete
  this.undoTop = (obj.undoTop < this.lines.length)
    ? obj.undoTop : this.lines.length

  // these properties only appears for the local user
  if (obj.view && obj.palette && Object.prototype.hasOwnProperty.call(obj, 'selectedColorIndex') &&
    Object.prototype.hasOwnProperty.call(obj, 'strokeWidth') && Object.prototype.hasOwnProperty.call(obj, 'sliderLock')) {
    this.view = new SVGMatrix(obj.view)
    this.palette = obj.palette.slice(0) // duplicate for safety
    this.selectedColorIndex = obj.selectedColorIndex
    this.strokeWidth = obj.strokeWidth
    this.sliderLock = obj.sliderLock
  }
}

User.prototype.initLocalUser = function () {
  this.view = new SVGMatrix()
  this.palette = [
    '#ffffff',
    '#000000',
    '#7a4e1f',
    '#a5a6a9',
    '#c40233',
    '#ffd300',
    '#009f6b',
    '#0087bd',
    '#fa85b3',
    '#ff7813',
    '#833f87',
    '#9fcff7'
  ]
  this.selectedColorIndex = 0
  this.strokeWidth = 1
  this.sliderLock = false

  return this
}

User.prototype.getCurrentColor = function () {
  return this.palette[this.selectedColorIndex]
}
