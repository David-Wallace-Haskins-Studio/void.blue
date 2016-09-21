/*jslint browser: true, devel: true */
/*global SVGMatrix, Line, Drawing, requestAnimationFrame */
window.addEventListener("DOMContentLoaded", function () {
    'use strict';
    var mainDrawing = new Drawing(),
        brushPreviewContext,
        context,
        timerId = false, // false or the ID of the timer for multitouch gestures
        drawLock = false, // prevents multitouch
        primaryFinger = null, // identifier of first finger for touch events
        spaceIsDown = false, // for spacebar dragging
        cmdIsDown = false, // for cmd undo and redo
        circleIsDown = false, // for circle gestures
        clickListenerList, // initialized towards the end.
        saveTimerId = false,
        gestureStartCoords,
        gestureLeftCircle,
        undoRedoMode,
        o,
        dynamicUndoRedoStartTime,
        undoRedoRate,
        dynamicUndoRedoAutoRepeat;

    window.mainDrawing = mainDrawing; // for debuging

    context = document.getElementById("canvas").getContext("2d");
    // if canvas fails to initialize,
    //  we should changed the whole page to an error message.

    brushPreviewContext = document.getElementById("brushPreviewCanvas").getContext("2d");

    mainDrawing.pageLoad();
    function initializePalette() {
        var swatches = document.getElementsByClassName('swatch'), i;

        mainDrawing.viewChange();

        requestAnimationFrame(function () {
            var k = mainDrawing.localUser.strokeWidth;
            for (i = 0; i < swatches.length; i += 1) {
                swatches[i].style.backgroundColor = mainDrawing.localUser.palette[i];
                if (i === mainDrawing.localUser.selectedColorIndex) {
                    swatches[i].classList.add("selected");
                }
            }
            if (mainDrawing.localUser.sliderLock) {
                document.getElementById("lock").classList.add('locked');
            }

            document.getElementById("handle").style.left = (Math.pow((k - 0.5) / 109.5, 1 / 3) * 100) + "%";
        });

        mainDrawing.updateBrushPreview();
    }
    initializePalette();

    function resizeTouchCircle() {
        /*requestAnimationFrame(function () {
            var circleRadius = (screen.width < screen.height) ?
                    screen.width / 10 : screen.height / 10,
                circleStyle = document.getElementById("circle").style,
                circlePosition = document.getElementById('circleContainer').style;

            circlePosition.width = (2 * circleRadius) + "px";
            circlePosition.height = (2 * circleRadius) + "px";
            circlePosition.bottom = circleRadius + "px";
            circlePosition.right = (window.innerWidth < window.innerHeight) ?
                    (window.innerWidth / 2 - circleRadius) + "px" :
                    circleRadius + "px";
        });*/
    }

    resizeTouchCircle();
    mainDrawing.setBrushPreviewContext(brushPreviewContext);
    mainDrawing.setCanvasContext(context);
    mainDrawing.setScreenMetrics(
        window.innerWidth,
        window.innerHeight,
        window.devicePixelRatio || 1
    );

    function windowResize() {
        resizeTouchCircle();

        mainDrawing.setScreenMetrics(
            window.innerWidth,
            window.innerHeight,
            window.devicePixelRatio || 1
        );
    }

    function closePalette(event) {
        requestAnimationFrame(function () {
            document.getElementById('card').classList.add('hidden');
            document.getElementById('fadeyBit').classList.add('hidden');
            document.getElementById('help').classList.add('hidden');
        });
        event.preventDefault();
        event.stopPropagation();
    }

    function openPalette(event) {
        requestAnimationFrame(function () {
            document.getElementById('card').classList.remove('hidden');
            document.getElementById('fadeyBit').classList.remove('hidden');
        });
        initializePalette();
        event.preventDefault();
        event.stopPropagation();
    }

    function doHome(event) {
        console.log("Home");
        event.preventDefault();
        event.stopPropagation();
    }

    function doUndo(event) {
        mainDrawing.undo();
        event.preventDefault();
        event.stopPropagation();
    }

    function doRedo(event) {
        mainDrawing.redo();
        event.preventDefault();
        event.stopPropagation();
    }

    function changeSwatch(event) {
        if (event.target.classList && event.target.classList.contains("swatch")) {
            requestAnimationFrame(function () {
                var swatches = document.getElementsByClassName('swatch'), i;
                for (i = 0; i < swatches.length; i += 1) {
                    swatches[i].classList.remove('selected');
                    if (event.target === swatches[i]) {
                        mainDrawing.localUser.selectedColorIndex = i;
                    }
                }
                event.target.classList.add('selected');
                mainDrawing.updateBrushPreview();
            });
        }
        event.preventDefault();
        event.stopPropagation();
    }

    function toggleSizeLock(event) {
        event.target.classList.toggle('locked');
        mainDrawing.localUser.sliderLock = event.target.classList.contains('locked');
        mainDrawing.updateBrushPreview();
        event.preventDefault();
        event.stopPropagation();
    }

    function startHandle(event) {
        var x, sliderWidth, sliderPosition;

        function getPosition(obj) {
            var topValue = 0, leftValue = 0;
            while (obj) {
                leftValue += obj.offsetLeft;
                topValue += obj.offsetTop;
                obj = obj.offsetParent;
            }
            return {left: leftValue, top: topValue};
        }

        sliderWidth = +(window.getComputedStyle(document.getElementById("handle-bed")).width.slice(0, -2));
        sliderPosition = getPosition(document.getElementById("handle-bed")).left + 12;
        // +12 is from a css offset.

        function setSlider(event) {
            var k;

            if (event.changedTouches) {
                x = event.changedTouches[0].pageX;
            } else if (event.touches) {
                x = event.touches[0].pageX;
            } else {
                x = event.pageX;
            }

            k = ((x - sliderPosition) / sliderWidth) * 100;

            if (k > 100) {
                k = 100;
            } else if (k < 0) {
                k = 0;
            }

            requestAnimationFrame(function () {
                document.getElementById("handle").style.left = k + "%";
            });

            //this return value sould be a method call of the current user context.
            //supposed to an exponential range from 0.5 to 110.
            mainDrawing.localUser.strokeWidth = Math.pow(k / 100, 3) * 109.5 + 0.5;
            // old math was
            // l = Math.pow(1.055417, k) / 2;
            // k = Math.log(2 * l)/Math.log(1.055417)
            mainDrawing.updateBrushPreview();
        }

        setSlider(event);

        function moveHandle(event) {
            setSlider(event);
            event.preventDefault();
            event.stopPropagation();
        }

        function releaseHandle(event) {
            setSlider(event);
            if (event.touches || event.changedTouches) {
                window.removeEventListener("touchmove", moveHandle, false);
                window.removeEventListener("touchend", releaseHandle, false);
            } else {
                window.removeEventListener("mousemove", moveHandle, false);
                window.removeEventListener("mouseup", releaseHandle, false);
            }
            event.preventDefault();
            event.stopPropagation();
        }

        if (event.touches || event.changedTouches) {
            window.addEventListener("touchmove", moveHandle, false);
            window.addEventListener("touchend", releaseHandle, false);
        } else {
            window.addEventListener("mousemove", moveHandle, false);
            window.addEventListener("mouseup", releaseHandle, false);
        }

        event.preventDefault();
        event.stopPropagation();
    }

    function masterDrawing(event) {
        var x, y;
        clearTimeout(saveTimerId);

        function pan(event) {
            mainDrawing.pan(event.pageX - x, event.pageY - y);
            x = event.pageX;
            y = event.pageY;
            document.body.style.cursor = '-webkit-grabbing';
            console.log("grabbing");
            event.preventDefault();
            event.stopPropagation();
        }

        function endPan(event) {
            mainDrawing.pan(event.pageX - x, event.pageY - y);
            window.removeEventListener("mousemove", pan, false);
            window.removeEventListener("mouseup", endPan, false);
            event.preventDefault();
            event.stopPropagation();
        }

        function movePen(event) {
            mainDrawing.addPoint(event.pageX, event.pageY);
            event.preventDefault();
            event.stopPropagation();
        }

        function releasePen(event) {
            mainDrawing.addPoint(event.pageX, event.pageY);
            mainDrawing.endLine();
            window.removeEventListener("mousemove", movePen, false);
            window.removeEventListener("mouseup", releasePen, false);
            event.preventDefault();
            event.stopPropagation();
            clearTimeout(saveTimerId);
            saveTimerId = setTimeout(function () {mainDrawing.pageSave(); }, 1000);
        }

        if (spaceIsDown || event.button === 1) {
            x = event.pageX;
            y = event.pageY;
            window.addEventListener("mousemove", pan, false);
            window.addEventListener("mouseup", endPan, false);
        } else if (event.button === 0) {
            mainDrawing.beginLine().addPoint(event.pageX, event.pageY);
            window.addEventListener("mousemove", movePen, false);
            window.addEventListener("mouseup", releasePen, false);
        }

        event.preventDefault();
        event.stopPropagation();
    }
    gestureStartCoords = [];
    function masterDrawingTouch(event) {
        clearTimeout(saveTimerId);
        if (event.touches.length === 1) {
            primaryFinger = event.touches[0].identifier;
            if (!timerId && !drawLock) {
                timerId = setTimeout(function () {
                    timerId = false;
                    drawLock = true;
                    mainDrawing.commitBuffer();
                }, 100);
                mainDrawing.startBuffer().beginLine().addPoint(event.touches[0].pageX, event.touches[0].pageY);
            }
        }
        if (event.touches.length > 1 && !drawLock) {
            gestureStartCoords = [
                event.touches[0].pageX,
                event.touches[0].pageY,
                event.touches[1].pageX,
                event.touches[1].pageY
            ];
            clearTimeout(timerId);
            timerId = false;
        }
        event.preventDefault();
        event.stopPropagation();
    }
    function moveFinger(event) {
        var i,
            gestureCoords;
        if (drawLock || timerId) {
            for (i = 0; i < event.changedTouches.length; i += 1) {
                if (event.changedTouches[i].identifier === primaryFinger) {
                    mainDrawing.addPoint(event.changedTouches[i].pageX, event.changedTouches[i].pageY);
                }
            }
        } else if (event.touches.length > 1) {
            gestureCoords = [
                event.touches[0].pageX,
                event.touches[0].pageY,
                event.touches[1].pageX,
                event.touches[1].pageY
            ];
            mainDrawing.multitouchZoom(gestureStartCoords, gestureCoords);
        }
        if (!circleIsDown) {
            event.preventDefault();
            event.stopPropagation();
        }
    }


    function releaseFinger(event) {
        // check to make sure it's not a gesture first
        var i;
        if (drawLock || timerId) {
            for (i = 0; i < event.changedTouches.length; i += 1) {
                if (primaryFinger === event.changedTouches[i].identifier) {
                    if (timerId) {
                        mainDrawing.commitBuffer();
                        clearTimeout(timerId);
                        timerId = false;
                    }
                    mainDrawing.endLine();
                    primaryFinger = null;
                    drawLock = false;
                }
            }
        }
        if (!circleIsDown) {
            clearTimeout(saveTimerId);
            saveTimerId = setTimeout(function () {mainDrawing.pageSave(); }, 1000);
            event.preventDefault();
            event.stopPropagation();
        }
    }
    // ADDING TOUCH LISTENERS UNCONDITIONALLY
    window.addEventListener("touchmove", moveFinger, false);
    window.addEventListener("touchend", releaseFinger, false);

    function mouseScroll(event) {
        if (document.getElementById("card").classList.contains('hidden')) {
            if ((event.wheelDelta || -event.detail) > 0) {
                mainDrawing.zoomIn(event.pageX, event.pageY);
            } else {
                mainDrawing.zoomOut(event.pageX, event.pageY);
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }

    function keyboardKeyRelease(event) {
        if (event.keyCode === 32) {
            spaceIsDown = false;
            document.body.style.cursor = 'default';
            event.preventDefault();
        } else if (event.keyCode === 224 || event.keyCode === 17 || event.keyCode === 91 || event.keyCode === 93) {
            cmdIsDown = false;
            event.preventDefault();
        }
        event.stopPropagation();
    }

    function keyboardKeyPress(event) {
        var key = event.keyCode;

        if (event.ctrlKey && event.shiftKey) {
            if (key === 90 && !event.shiftKey) {
                // CTRL + "Z"
                mainDrawing.undo();
                event.preventDefault();
            } else if ((key === 89) || (key === 90 && event.shiftKey)) {
                // CTRL + "Y", or CTRL + SHIF + "Z"
                mainDrawing.redo();
                event.preventDefault();
            }
        } else {
            if (key === 61 || key === 107 || key === 187 || key === 43) {
                // all of the "+" keys
                mainDrawing.zoomIn(window.innerWidth / 2, window.innerHeight / 2);
                event.preventDefault();
            } else if (key === 109 || key === 189 || key === 45 || key === 173) {
                // all of the "-" keys
                mainDrawing.zoomOut(window.innerWidth / 2, window.innerHeight / 2);
                event.preventDefault();
            } else if (key === 66) {
                // "b" for bringing up brush settings
                requestAnimationFrame(function () {
                    document.getElementById('card').classList.toggle('hidden');
                    document.getElementById('fadeyBit').classList.toggle('hidden');
                });
                event.preventDefault();
            } else if (key === 32) {
                spaceIsDown = true;
                document.body.style.cursor = '-webkit-grab';
                event.preventDefault();
                event.stopPropagation();
            } else if (key === 224 || key === 17 || key === 91 || key === 93) {
                // all of the "cmd" keys
                cmdIsDown = true;
                event.preventDefault();
            } else if (key === 90 && cmdIsDown === true && !event.shiftKey) {
                mainDrawing.undo();
                event.preventDefault();
            } else if ((key === 89 && cmdIsDown === true) || (key === 90 && cmdIsDown === true && event.shiftKey)) {
                mainDrawing.redo();
                event.preventDefault();
            }
        }
        event.stopPropagation();
    }

    gestureLeftCircle = false;
    undoRedoMode = false;
    o = {};
    dynamicUndoRedoStartTime = -1;

    // local to dynamicUndoRedo
    undoRedoRate = 25;
    dynamicUndoRedoAutoRepeat = false;

    function dynamicUndoRedo(curTime) {
        if (undoRedoMode) {
            requestAnimationFrame(dynamicUndoRedo);
        } else {
            undoRedoRate = 0;
        }
        var n,
            timeDelta = curTime - dynamicUndoRedoStartTime;

        if (dynamicUndoRedoAutoRepeat) {
            if (o.x < -o.radius) {
                n = (-o.x - o.radius) * 20 / (o.radius * 4);
            } else if (o.x > o.radius) {
                n = (o.x - o.radius) * 20 / (o.radius * 4);
            } else {
                n = 0;
            }

            if (n > 20) {
                n = 20;
            }

            if (timeDelta > 2000 / n) {
                if (o.x < -o.radius) {
                    mainDrawing.undo();
                } else if (o.x > o.radius) {
                    mainDrawing.redo();
                }
                dynamicUndoRedoStartTime = curTime;
            }
        } else {
            if (dynamicUndoRedoStartTime < 0) {
                if (o.x < -o.radius) {
                    mainDrawing.undo();
                } else if (o.x > o.radius) {
                    mainDrawing.redo();
                }
                dynamicUndoRedoStartTime = curTime;
            } else if (timeDelta > 500) {
                if (o.x < -o.radius) {
                    mainDrawing.undo();
                } else if (o.x > o.radius) {
                    mainDrawing.redo();
                }
                dynamicUndoRedoStartTime = curTime;
                dynamicUndoRedoAutoRepeat = true;
            }
        }
    }

    function circleGesture(event) {
        document.getElementById('circleUndoIcon').classList.remove('hidden');
        document.getElementById('circleRedoIcon').classList.remove('hidden');
        document.getElementById('circlePaletteIcon').classList.remove('hidden');
        document.getElementById('circleMenuIcon').classList.remove('hidden');
        circleIsDown = true;
        primaryFinger = event.touches[0].identifier;

        event.preventDefault();
        event.stopPropagation();
    }

    function moveFingerCircle(event) {
        if (circleIsDown) {
            o.radius = (screen.width < screen.height) ?
                    screen.width / 10 : screen.height / 10;
            if (window.innerWidth < window.innerHeight) {
                o.x = event.touches[0].pageX - (window.innerWidth / 2);
                o.y = event.touches[0].pageY - (window.innerHeight - o.radius * 2);
            } else {
                o.x = event.touches[0].pageX - (window.innerWidth - o.radius * 2);
                o.y = event.touches[0].pageY - (window.innerHeight - o.radius * 2);
            }
            if (!undoRedoMode) {
                if (Math.sqrt(o.x * o.x + o.y * o.y) > o.radius) {
                    if (o.x < o.y) {
                        if (o.x < -o.y) {
                            dynamicUndoRedoStartTime = -1;
                            dynamicUndoRedoAutoRepeat = false;
                            requestAnimationFrame(dynamicUndoRedo);
                            undoRedoMode = true;
                            
        document.getElementById('circlePaletteIcon').classList.add('hidden');
        document.getElementById('circleMenuIcon').classList.add('hidden');
                        }
                    } else {
                        if (o.x < -o.y) {
                            console.log("palette");
                        } else {
                            dynamicUndoRedoStartTime = -1;
                            dynamicUndoRedoAutoRepeat = false;
                            requestAnimationFrame(dynamicUndoRedo);
                            undoRedoMode = true;
        document.getElementById('circlePaletteIcon').classList.add('hidden');
        document.getElementById('circleMenuIcon').classList.add('hidden');
                        }
                    }
                }
            }

            event.preventDefault();
            event.stopPropagation();
        }
    }
    function releaseFingerCircle(event) {
        var i;
        document.getElementById('circleUndoIcon').classList.add('hidden');
        document.getElementById('circleRedoIcon').classList.add('hidden');
        document.getElementById('circlePaletteIcon').classList.add('hidden');
        document.getElementById('circleMenuIcon').classList.add('hidden');
        if (circleIsDown) {
            if (!undoRedoMode) {
                for (i = 0; i < event.changedTouches.length; i += 1) {
                    if (event.changedTouches[i].identifier === primaryFinger) {
                        o.radius = (screen.width < screen.height) ?
                                screen.width / 10 : screen.height / 10;
                        if (window.innerWidth < window.innerHeight) {
                            o.x = event.changedTouches[i].pageX - (window.innerWidth / 2);
                            o.y = event.changedTouches[i].pageY - (window.innerHeight - o.radius * 2);
                        } else {
                            o.x = event.changedTouches[i].pageX - (window.innerWidth - o.radius * 2);
                            o.y = event.changedTouches[i].pageY - (window.innerHeight - o.radius * 2);
                        }
                        if (Math.sqrt(o.x * o.x + o.y * o.y) > o.radius) {
                            if (o.x < o.y) {
                                if (o.x > -o.y) {
                                    console.log("menu");
                                }
                            } else {
                                if (o.x < -o.y) {
                                    console.log("palette released");
                                    openPalette(event);
                                }
                            }
                        } else {
                          // do nothing, formerly the "help menu"
                        }
                    }
                }
            }
            circleIsDown = false;
            gestureLeftCircle = false;
            primaryFinger = null;
            undoRedoMode = false;
            event.preventDefault();
            event.stopPropagation();
        }
    }

    // ADD TOUCH EVENT LISTENERS UNCONDITIONALLY
    document.getElementById("circle").addEventListener("touchstart", circleGesture, false);
    window.addEventListener("touchmove", moveFingerCircle, false);
    window.addEventListener("touchend", releaseFingerCircle, false);

    // this is a list of event listeners that are for
    // both "mousedown" and "touchstart", and are effected by
    // the removeMouseListeners callback.
    clickListenerList = [
        //elem will get populated by the id strings.
        //desktop UI
        {id: "home", callback: doHome},
        {id: "palette", callback: openPalette},
        {id: "undo", callback: doUndo},
        {id: "redo", callback: doRedo},
        //palette card
        {id: "swatches", callback: changeSwatch},
        {id: "lock", callback: toggleSizeLock},
        {id: "handle-bed", callback: startHandle},
        {id: "close", callback: closePalette},
        {id: "fadeyBit", callback: closePalette},
        {id: "help", callback: closePalette},
        // fancy palette dismissal to be implimented later
        {id: "card", callback: function (event) {
            event.preventDefault();
            event.stopPropagation();
        }},
        // Touch ui
        ////{id: "circle", callback: circleGesture},
        //main drawing and touch dragging, id is N/A.
        {elem: window, callback: masterDrawing, callbackTouch: masterDrawingTouch}
    ];

    clickListenerList.forEach(function (i) {
        if (typeof i.id === "string") {
            i.elem = document.getElementById(i.id);
        }
        if (i.elem) {
            i.elem.addEventListener("touchstart", i.callbackTouch || i.callback, false);
            i.elem.addEventListener("mousedown", i.callback, false);
        }
    });

    // other event listeners
    window.addEventListener("resize", windowResize, false);
    window.addEventListener("mousewheel", mouseScroll, false);
    window.addEventListener("DOMMouseScroll", mouseScroll, false);
    window.addEventListener("keydown", keyboardKeyPress, false);
    window.addEventListener("beforeunload", function () {mainDrawing.pageSave(); }, false);

    window.addEventListener("keyup", keyboardKeyRelease, false);

    // this is a capturing event so that the mouse listeners can be removed ASAP.
    window.addEventListener("touchstart", function removeMouseListeners() {
        clickListenerList.forEach(function (i) {
            if (i.elem) {
                i.elem.removeEventListener("mousedown", i.callback, false);
            }
        });
        window.removeEventListener("touchstart", removeMouseListeners, true);
    }, true);
}, false);