// eventually I'll pack SVGMatrix, Line, and Drawing into a namespace
// object with private vars and public methods called PaperAnywhereDrawing.
// main.js will then be wrapped in a onload listener and work with an
// PaperAnywhereDrawing instance.

// var ws = new WebSocket('ws:paperanywhere.com:500');
// ws.onmessage = testMessage;

function Drawing (obj) {
  if (!(this instanceof Drawing)) {
    throw new TypeError('Drawing constructor called without "new".')
  }
  obj = obj || {}

  this.data = { // named "paperAnywhere" in localstorage
    version: 'Alpha 3',
    localPage: true,
    localUser: new User().initLocalUser()
    // probably do something different for online
  }
  // "username/pagename": {"username": new User()}
  // this.data = {};

  this.localUser = this.data.localUser

  // session dependent info below won't get sync directly to the server
  this.currentLine = new Line()
  this.currentLineAttribute = new LineAttribute()
  this.viewMetrics = {
    changed: true,
    width: 128,
    height: 128,
    pixelRatio: 1
  }
  this.doFullRedraw = true
  this.isGesture = false
  this.lastDrawnPoint = -1
  this.inputTransform = new SVGMatrix()
  this.requestAnimationFrameActive = false
  this.tempView = new SVGMatrix()
  this.context = undefined
  this.brushPreviewContext = undefined
  this.previewLine = new Line().addFromArray([30, 55, 54, 39, 86, 39, 110, 55, 134, 71, 166, 71, 190, 55])
  // the coordinates for the preview curve are:
  // -10, 0, -7, -2, -3, -2, 0, 0, 3, 2, 7, 2, 10, 0
  // matrix actually ok not matrix
  // scale by 8x, translate +110X, +55Y
  this.jsonrpcid = 1
}
// function testMessage (message) {
//   var data = JSON.parse(message.data)
//   if (data.method === 'newLine') {
//     var serverLine = new Line(data.params.line)
//     var serverLineAttrib = new LineAttribute(data.params.lineAttribs)

//     mainDrawing.serverNewLine(serverLine, serverLineAttrib)
//   } else if (data.method === 'undoRedo') {
//     if (data.params < 0) {
//       mainDrawing.serverUndo(data.params)
//     } else if (data.params > 0) {
//       mainDrawing.serverRedo(data.params)
//     }
//   }
// }
Drawing.prototype.setScreenMetrics = function (viewWidth, viewHeight, pixelRatio) {
  this.viewMetrics.changed = true
  this.viewMetrics.width = viewWidth || this.viewMetrics.width
  this.viewMetrics.height = viewHeight || this.viewMetrics.height
  this.viewMetrics.pixelRatio = pixelRatio || this.viewMetrics.pixelRatio
  this.redraw()

  return this
}

Drawing.prototype.setBrushPreviewContext = function (context) {
  this.brushPreviewContext = context

  return this
}

Drawing.prototype.setCanvasContext = function (context) {
  this.context = context

  return this
}

Drawing.prototype.undo = function () {
  if (this.localUser.undoTop > 0) {
    this.localUser.undoTop -= 1
    var tempMessage = { method: 'undoRedo', params: -1, id: mainDrawing.jsonrpcid }
    console.log(tempMessage)
    // ws.send(JSON.stringify(tempMessage));
    mainDrawing.jsonrpcid += 2
    this.doFullRedraw = true
    this.redraw()
  }
  return this
}
Drawing.prototype.redo = function () {
  if (this.localUser.undoTop < this.localUser.lines.length) {
    this.localUser.undoTop += 1
    var tempMessage = { method: 'undoRedo', params: +1, id: mainDrawing.jsonrpcid }
    console.log(tempMessage)
    // ws.send(JSON.stringify(tempMessage));
    mainDrawing.jsonrpcid += 2
    this.doFullRedraw = true
    this.redraw()
  }

  return this
}
Drawing.prototype.serverUndo = function (undoSteps) {
  if (this.localUser.undoTop < this.localUser.lines.length) {
    if (!undoSteps) {
      undoSteps = -1
    }
    this.localUser.undoTop += undoSteps
    mainDrawing.jsonrpcid += 2
    this.doFullRedraw = true
    this.redraw()
  }
}
Drawing.prototype.serverRedo = function (redoSteps) {
  if (this.localUser.undoTop < this.localUser.lines.length) {
    if (!redoSteps) {
      redoSteps = 1
    }
    this.localUser.undoTop += redoSteps
    mainDrawing.jsonrpcid += 2
    this.doFullRedraw = true
    this.redraw()
  }
}

Drawing.prototype.zoomIn = function (x, y) {
  var p = this.inputTransform.applyToPoint({ x: x, y: y })
  this.tempView = new SVGMatrix().scale(1.0905077326652576592, p.x, p.y).multiply(this.tempView)
  // zoom numbers are aprox Math.pow(0.5, 1/8) and Math.pow(2, 1/8)
  // 8 steps to zoom 50% or 200%
  this.doFullRedraw = true
  this.redraw()

  return this
}

Drawing.prototype.zoomOut = function (x, y) {
  var p = this.inputTransform.applyToPoint({ x: x, y: y })
  this.tempView = new SVGMatrix().scale(0.9170040432046712317, p.x, p.y).multiply(this.tempView)
  this.doFullRedraw = true
  this.redraw()

  return this
}

Drawing.prototype.pan = function (x, y) {
  this.tempView = new SVGMatrix().translate(x, y).multiply(this.tempView)
  this.doFullRedraw = true
  this.redraw()

  return this
}

Drawing.prototype.viewChange = function () {
  this.localUser.view = this.tempView.multiply(this.localUser.view)
  if (this.localUser.sliderLock) {
    this.localUser.strokeWidth *= Math.sqrt(this.tempView.getDeterminant())
  }
  this.tempView = new SVGMatrix()

  return this
}

Drawing.prototype.multitouchZoom = function (start, end) {
  var tempTransform, p1, p2, p3, p4, v1x, v1y, v2x, v2y, t1x, t1y, t2x, t2y, s, result
  tempTransform = new SVGMatrix().translate(-this.viewMetrics.width / 2, -this.viewMetrics.height / 2)
  p1 = tempTransform.applyToPoint({ x: start[0], y: start[1] })
  p2 = tempTransform.applyToPoint({ x: start[2], y: start[3] })
  p3 = tempTransform.applyToPoint({ x: end[0], y: end[1] })
  p4 = tempTransform.applyToPoint({ x: end[2], y: end[3] })
  v1x = p2.x - p1.x
  v1y = p2.y - p1.y
  v2x = p4.x - p3.x
  v2y = p4.y - p3.y
  t1x = (p2.x + p1.x) / 2
  t1y = (p2.y + p1.y) / 2
  t2x = (p4.x + p3.x) / 2
  t2y = (p4.y + p3.y) / 2
  s = Math.sqrt(((v2x * v2x) + (v2y * v2y)) / ((v1x * v1x) + (v1y * v1y)))
  result = null
  result = new SVGMatrix(s, 0, 0, s, t2x - (t1x * s), t2y - (t1y * s))
  this.tempView = result
  this.doFullRedraw = true
  this.redraw()

  return this
}

Drawing.prototype.beginLine = function () {
  this.currentLine = new Line()
  this.currentLineAttribute = new LineAttribute()
  this.localUser.penDown = true
  this.viewChange()
  this.currentLineAttribute.transform = this.localUser.view.inverse()
  this.currentLineAttribute.stroke = this.localUser.getCurrentColor()
  this.currentLineAttribute.strokeWidth = this.localUser.strokeWidth
  this.lastDrawnPoint = -1

  return this
}

Drawing.prototype.endLine = function () {
  if (!this.isGesture) {
    if (this.localUser.undoTop < this.localUser.lines.length) {
      this.localUser.lines.length = this.localUser.undoTop
      this.localUser.attr.length = this.localUser.undoTop
      this.doFullRedraw = true
    }
    if (this.currentLine.t.length !== 0) {
      this.localUser.lines.push(this.currentLine)
      this.localUser.attr.push(this.currentLineAttribute)
      this.localUser.undoTop += 1
    }
    // var lineAndAttribs = { line: this.currentLine, lineAttribs: this.currentLineAttribute }
    // var lineData = { method: 'newLine', params: lineAndAttribs, id: this.jsonrcpid }
    this.jsonrcpid += 2
    // ws.send(JSON.stringify(lineData));
    this.localUser.penDown = false
    this.lastDrawnPoint -= 1
    this.redraw()
  }

  return this
}

Drawing.prototype.serverNewLine = function (serverLine, serverLineAttribs) {
  if (this.localUser.undoTop < this.localUser.lines.length) {
    this.localUser.lines.length = this.localUser.undoTop
    this.localUser.attr.length = this.localUser.undoTop
    this.doFullRedraw = true
  }
  this.localUser.lines.push(serverLine)
  this.localUser.attr.push(serverLineAttribs)
  this.localUser.undoTop += 1
  this.context.save()
  serverLineAttribs.applyToCanvas(
    this.context,
    this.tempView.multiply(this.localUser.view)
  )
  serverLine.drawToCanvas(this.context)
  this.context.restore()
  this.redraw()
}

Drawing.prototype.redraw = function () {
  var that = this
  if (!this.requestAnimationFrameActive) {
    this.requestAnimationFrameActive = true
    window.requestAnimationFrame(function () {
      that._redraw()
    })
  }

  return this
}

Drawing.prototype._redraw = function () {
  var i
  var width = this.viewMetrics.width
  var height = this.viewMetrics.height
  var pixelRatio = this.viewMetrics.pixelRatio
  var that = this
  if (this.requestAnimationFrameActive) {
    window.requestAnimationFrame(function () {
      that._redraw()
    })
  }
  this.requestAnimationFrameActive = false
  if (this.viewMetrics.changed) {
    if (this.context) {
      this.context.canvas.width = width * pixelRatio
      this.context.canvas.height = height * pixelRatio
      this.context.canvas.style.width = width + 'px'
      this.context.canvas.style.height = height + 'px'
      this.context.translate(
        width * pixelRatio / 2,
        height * pixelRatio / 2
      )
      this.context.lineJoin = 'round'
      this.context.lineCap = 'round'
      this.context.scale(pixelRatio, pixelRatio)
    }
    if (this.brushPreviewContext) {
      this.brushPreviewContext.lineJoin = 'round'
      this.brushPreviewContext.lineCap = 'round'
    }
    this.inputTransform = new SVGMatrix().translate(-width / 2, -height / 2)
    this.viewMetrics.changed = false
    this.doFullRedraw = true
    this.requestAnimationFrameActive = true
  }
  if (this.doFullRedraw) {
    this.context.fillStyle = '#041b7c'
    this.context.fillRect(-window.innerWidth / 2, -window.innerHeight / 2, window.innerWidth, window.innerHeight)
    if (this.localUser.undoTop > 0) {
      for (i = 0; i < this.localUser.undoTop; i += 1) {
        this.context.save()
        this.localUser.attr[i].applyToCanvas(
          this.context,
          this.tempView.multiply(this.localUser.view)
        )
        this.localUser.lines[i].drawToCanvas(this.context)
        this.context.restore()
      }
    }
    this.doFullRedraw = false
    this.lastDrawnPoint = this.currentLine.t.length - 1
    this.requestAnimationFrameActive = true
  }
  if (this.lastDrawnPoint < this.currentLine.t.length - 1 && !this.isGesture) {
    this.context.save()
    this.currentLineAttribute.applyToCanvas(
      this.context,
      this.tempView.multiply(this.localUser.view)
    )
    this.currentLine.drawToCanvas(
      this.context,
      this.localUser.penDown,
      this.lastDrawnPoint
    )
    this.context.restore()
    this.lastDrawnPoint = this.currentLine.t.length - 1
    this.requestAnimationFrameActive = true
  }
}

Drawing.prototype.updateBrushPreview = function () {
  var that = this
  window.requestAnimationFrame(function () {
    that.brushPreviewContext.save()
    that.brushPreviewContext.fillStyle = 'rgba(255, 255, 255, 1)'
    that.brushPreviewContext.fillRect(0, 0, 220, 110)
    if (that.localUser.getCurrentColor() === '#ffffff') {
      new LineAttribute({
        stroke: '#d4d4d4',
        strokeWidth: that.localUser.strokeWidth + 2
      }).applyToCanvas(that.brushPreviewContext)
      that.previewLine.drawToCanvas(that.brushPreviewContext)
    }
    new LineAttribute({
      stroke: that.localUser.getCurrentColor(),
      strokeWidth: that.localUser.strokeWidth
    }).applyToCanvas(that.brushPreviewContext)
    that.previewLine.drawToCanvas(that.brushPreviewContext)
    that.brushPreviewContext.restore()
  })

  return this
}

Drawing.prototype.addPoint = function (x, y) {
  // I need to extend this to be able to input a Screen and Page point pair.
  var p = this.inputTransform.applyToPoint({ x: x, y: y })
  this.currentLine.addPoint(p.x, p.y)
  this.redraw()

  return this
}

Drawing.prototype.startBuffer = function () {
  this.isGesture = true

  return this
}

Drawing.prototype.dropBuffer = function () {
  return this
}

Drawing.prototype.commitBuffer = function () {
  this.isGesture = false
  this.redraw()

  return this
}

Drawing.prototype.pageLoad = function () {
  var store = JSON.parse(window.localStorage.getItem('paperAnywhere')) || {}

  if (store.version === 'Alpha 3' && store.localPage === true &&
            store.localUser) {
    this.data.localUser = new User(store.localUser)
    this.localUser = this.data.localUser
    this.doFullRedraw = true
    this.redraw()
  }

  return this
}

Drawing.prototype.pageSave = function () {
  this.viewChange()
  window.localStorage.setItem('paperAnywhere', JSON.stringify(this.data))

  return this
}
