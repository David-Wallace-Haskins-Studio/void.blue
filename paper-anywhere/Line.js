function Line (obj) {
  if (!(this instanceof Line)) {
    throw new TypeError('Line constructor called without "new".')
  }
  obj = obj || {}

  // I should output relative coordinates and be able to process them here.
  this.a = obj.a || undefined // array index of attributes. Not an array but a array index.
  this.x = [] // X coordinates relative to center.
  this.y = [] // Y coordinates relative to center.
  this.t = [] // in Unix (also Javascript) time. Somehow we will have to have some sort of time sync protocol somewhere else.

  var dx = 0; var dy = 0; var dt = 0; var i; var l
  if (obj.t && obj.t.length) {
    l = obj.t.length
  } else {
    l = 0
  }

  for (i = 0; i < l; i += 1) {
    this.x.push(dx + obj.x[i])
    dx = dx + obj.x[i]
    this.y.push(dy + obj.y[i])
    dy = dy + obj.y[i]
    this.t.push(dt + obj.t[i])
    dt = dt + obj.t[i]
  }
}

Line.prototype.addPoint = function (x, y, t) {
  if ((this.t.length === 0) || (this.x[this.t.length - 1] !== x) ||
            (this.y[this.t.length - 1] !== y)) {
    this.x.push(x)
    this.y.push(y)
    this.t.push(t || Date.now()) // and maybe a time sync thing later.
  }

  return this
}

Line.prototype.drawToCanvas = function (context, penDown, from, to) {
  var p, t, l, currentPoint, nextPoint
  if (to < from) {
    t = from
    from = to
    to = t
  }
  if (!from || from < 0) {
    from = 0
  }
  if (!to || to > this.t.length) {
    to = this.t.length
  }
  l = to - from
  if (l > 0) {
    // context.save();

    // this.a.applyToCanvas(context, view);
    context.beginPath()
    if (from > 0) {
      currentPoint = { x: this.x[from], y: this.y[from] }
      nextPoint = { x: this.x[from - 1], y: this.y[from - 1] }
      // if not a moveTo point, continue at the last half point
      // from the previously half drawn line.
      context.moveTo(
        (currentPoint.x + nextPoint.x) / 2,
        (currentPoint.y + nextPoint.y) / 2
      )
    }
    for (p = from; p < to; p += 1) {
      currentPoint = { x: this.x[p], y: this.y[p] }
      if (p + 1 === this.t.length) {
        nextPoint = undefined
      } else {
        nextPoint = { x: this.x[p + 1], y: this.y[p + 1] }
      }

      if (p === 0) {
        context.moveTo(currentPoint.x, currentPoint.y)
        if (p + 1 === this.t.length) {
          // draw dot if a second moveTo is ahead of this moveTo
          // or this moveTo is on the end of the Line.
          context.lineTo(currentPoint.x + 0.001, currentPoint.y)
        } else {
          // draw the first half line
          context.lineTo(
            (currentPoint.x + nextPoint.x) / 2,
            (currentPoint.y + nextPoint.y) / 2
          )
        }
      } else {
        // now check if we can see one point ahead.
        if (p + 1 === this.t.length && !penDown) {
          // if end of Line and the line is complete,
          // draw the second half of the line.
          context.lineTo(currentPoint.x, currentPoint.y)
        } else if (p + 1 < this.t.length) {
          context.quadraticCurveTo(
            currentPoint.x,
            currentPoint.y,
            (currentPoint.x + nextPoint.x) / 2,
            (currentPoint.y + nextPoint.y) / 2
          )
        }
      }
    }
    // new SVGMatrix().rotate(-35).scaleNonUniform(2/11, 11/2).rotate(35).applyToCanvas(context);
    context.stroke()
    // context.restore();
  }

  return this
}

Line.prototype.addFromArray = function (line) {
  for (var i = 0; i < line.length - 1; i += 2) {
    this.x.push(line[i])
    this.y.push(line[i + 1])
    this.t.push(i)
  }

  return this
}

Line.prototype.toJSON = function () {
  var dx = 0; var dy = 0; var dt = 0; var result = {}

  result.a = this.a
  result.x = []
  result.y = []
  result.t = []

  for (var i = 0; i < this.t.length; i += 1) {
    result.x.push(this.x[i] - dx)
    dx = this.x[i]
    result.y.push(this.y[i] - dy)
    dy = this.y[i]
    result.t.push(this.t[i] - dt)
    dt = this.t[i]
  }

  // relative input [8, 4, -5, 1, -2]
  // decoding proc [0+8,   8+4, 12+(-5), 7+1, 8+(-2)]
  // result        [8,      12,       7,   8,      6]
  // encoding proc [-0+8, -8+12,  -12+7,]
  // result        [   8,     4,     -5,]

  return result
}
