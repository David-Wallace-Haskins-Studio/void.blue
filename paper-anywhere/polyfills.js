// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// list-based fallback implementation by Jonas Finnemann Jensen
// https://gist.github.com/jonasfj/4438815
(function () {
  'use strict'
  var x = 0; var vendors = ['ms', 'moz', 'webkit', 'o']
  var callbackStack = []; var minHandleNum = 0; var lastTime = 0

  // First try to alias native versions
  for (x = 0; x < vendors.length && !window.requestAnimationFrame; x += 1) {
    window.requestAnimationFrame = window[vendors[x] +
            'RequestAnimationFrame']
    window.cancelAnimationFrame = window[vendors[x] +
            'CancelAnimationFrame'] || window[vendors[x] +
            'CancelRequestAnimationFrame']
  }

  function frame () {
    var i; var clist = callbackStack // save old stack
    lastTime = Date.now()
    callbackStack = [] // new stack for next frame
    minHandleNum += clist.length
    for (i = 0; i < clist.length; i += 1) {
      if (clist[i]) {
        clist[i](lastTime)
      }
    }
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      if (callbackStack.length === 0) {
        window.setTimeout(frame, Math.max(0, 20 + lastTime - Date.now()))
      }
      callbackStack.push(callback)
      return callbackStack.length + minHandleNum
    }
    window.cancelAnimationFrame = function (id) {
      delete callbackStack[id - minHandleNum - 1]
    }
  }
}())
