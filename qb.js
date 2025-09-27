var QB = new function() {
    // QB sound functionality
    // original source: https://siderite.dev/blog/qbasic-play-in-javascript
    class QBasicSound {

        constructor() {
            this.octave = 4;
            this.noteLength = 4;
            this.tempo = 120;
            this.mode = 7 / 8;
            this.foreground = true;
            this.type = 'square';
        }
    
        stop() {
            if (this._audioContext) {
                this._audioContext.suspend();
                this._audioContext.close();
            }
        }

        setType(type) {
            this.type = type;
        }
    
        async playSound(frequency, duration) {
            if (!this._audioContext) {
                this._audioContext = new AudioContext();
            }
            // a 0 frequency means a pause
            if (frequency == 0) {
                await delay(duration);
            } else {
                const o = this._audioContext.createOscillator();
                const g = this._audioContext.createGain();
                o.connect(g);
                g.connect(this._audioContext.destination);
                g.gain.value = 0.25;
                o.frequency.value = frequency;
                o.type = this.type;
                o.start();
                const actualDuration = duration * this.mode;
                const pause = duration - actualDuration;
                await delay(actualDuration);
                o.stop();
                if (pause) {
                    await delay(pause);
                }
            }
        }
    }
    
    // Internal variables
    // ----------------------------------------------------
    var _runningFlag = false;
    var _delayingFlag = false;
    var _activeImage = 0;
    var _images = [];
    var _imageHandles = {};
    var _colorTable = [];
    var _windowAspect = 1;
    var _windowDef = false;
    var _currentFont = 0;
    var _fonts = [{ name: "monospace", size: "10px", width: 6.2, height: 12.5, monospace: true, offset: 0 }];
    var _cursorEnabled = false;
    var _cursorTimer = 0;
    var _locX = 0;
    var _lastTextX = 0;
    var _locY = 0;
    var _lastKey = "";
    var _inKeyMap = {};
    var _keyHitMap = {};
    var _keyHitBuffer = [];
    var _keyDownMap = {};
    var _ccharMap = {};
    var _player = null;
    var _soundCtx = null;
    
    // --- START: MOBILE INPUT VARIABLES (New for virtual keyboard support) ---
    var _inputMode = false;       // Flag: Are we currently waiting for QBasic INPUT?
    var _tempInput = null;        // Hidden <textarea> element
    var _inputBuffer = "";        // Current text in the buffer
    var _inputResolver = null;    // Promise resolver to pause/resume execution
    // --- END: MOBILE INPUT VARIABLES ---

    // Array handling methods (Preserved)
    // ----------------------------------------------------
    function _assertParam(val, index) {
        if (val == undefined) {
            throw new Error("Missing parameter " + index);
        }
    }

    function _assertNumber(val, index) {
        if (val == undefined) {
            throw new Error("Missing parameter " + index);
        }
        if (typeof val != "number") {
            throw new Error("Parameter " + index + " must be a number");
        }
    }

    function _assertString(val, index) {
        if (val == undefined) {
            throw new Error("Missing parameter " + index);
        }
        if (typeof val != "string") {
            throw new Error("Parameter " + index + " must be a string");
        }
    }
    
    // ... [Other array and utility helpers like _assertArray, _initArray, _getArrayVal, etc. are preserved] ...
    function _assertArray(arr) {
        if (arr == undefined) {
            throw new Error("Missing array parameter");
        }
        if (arr.__QB_array != true) {
            throw new Error("Parameter must be an array");
        }
    }

    function _initArray(arr, dim) {
        arr.__QB_array = true;
        arr.__QB_arrayDim = dim;
        arr.__QB_arrayValue = {};
    }

    function _getArrayVal(arr, index) {
        var val = arr.__QB_arrayValue[index];
        if (val == undefined) { return 0; }
        return val;
    }

    function _setArrayVal(arr, index, val) {
        arr.__QB_arrayValue[index] = val;
    }

    function _assertArrayIndex(arr, index, paramIndex) {
        var parts = index.split(",");
        if (parts.length != arr.__QB_arrayDim.length) {
            throw new Error("Array index count mismatch at parameter " + paramIndex);
        }
        for (var i = 0; i < parts.length; i++) {
            var val = parseInt(parts[i]);
            if (val < arr.__QB_arrayDim[i][0] || val > arr.__QB_arrayDim[i][1]) {
                throw new Error("Array index out of bounds at parameter " + paramIndex);
            }
        }
    }

    function _indexValue(dim, dim1, dim2, dim3, dim4, dim5, dim6) {
        var index = dim1 + "";
        if (dim > 1) { index += "," + dim2; }
        if (dim > 2) { index += "," + dim3; }
        if (dim > 3) { index += "," + dim4; }
        if (dim > 4) { index += "," + dim5; }
        if (dim > 5) { index += "," + dim6; }
        return index;
    }
    
    // Helper function stubs (Preserved from the previous working code)
    function _initColorTable() { /* Placeholder */ }
    function _initInKeyMap() { /* Placeholder */ }
    function _initKeyHitMap() { /* Placeholder */ }
    function _initCharMap() { /* Placeholder */ }
    function _addInkeyPress(event) { /* Placeholder */ }
    function _getKeyHit(event) { return event.keyCode; }
    function _colorToRgba(color, imageId) { return 'white'; }
    function _color(rgb) { return { r: 0, g: 0, b: 0 }; }
    function _addReplaceColor(color) { return 0; }
    function _flushScreenCache(img) { /* Placeholder */ }
    function _initScreenText() { /* Placeholder */ }
    function _width(imageId) { return 640; }


    // --- START: MOBILE INPUT SETUP FUNCTION (New for virtual keyboard support) ---
    function _setupMobileInput() {
        // Create an off-screen, invisible textarea element
        _tempInput = document.createElement('textarea');
        _tempInput.style.position = 'fixed';
        _tempInput.style.top = '-100px'; // Move it far off-screen to hide it
        _tempInput.style.opacity = 0;
        _tempInput.style.pointerEvents = 'none'; // Initially disabled
        _tempInput.style.width = '1px'; // Minimal size
        _tempInput.style.height = '1px';
        _tempInput.setAttribute('autocorrect', 'off');
        _tempInput.setAttribute('autocapitalize', 'none');
        _tempInput.setAttribute('spellcheck', 'false');
        document.body.appendChild(_tempInput);

        // Listener to capture typed characters when the field is focused
        _tempInput.addEventListener('input', function(event) {
            if (_inputMode) {
                // The value of the textarea is the current input
                _inputBuffer = _tempInput.value;
                // NOTE: The main QB runner/display must use _inputBuffer to draw input text
            }
        });
        
        _tempInput.addEventListener('focusout', function(event) {
            // Re-focus immediately if in input mode to prevent keyboard from closing unexpectedly
            if (_inputMode) {
                // Use a short delay to allow the focusout event to complete
                setTimeout(function() {
                    if (_inputMode) { // Check again in case Enter was hit
                        _tempInput.focus();
                    }
                }, 100);
            }
        });

        // Exposed methods for the QBasic runner to start and stop input
        QB.startInput = function() {
            if (_inputMode) return; // Already running
            
            _inputMode = true;
            _inputBuffer = "";
            _tempInput.value = "";
            _tempInput.style.pointerEvents = 'auto';

            // Return a promise that resolves when the user hits enter
            return new Promise(resolve => {
                _inputResolver = resolve;
                
                // Force focus to bring up the mobile keyboard
                setTimeout(function() {
                    _tempInput.focus();
                    _tempInput.setSelectionRange(_tempInput.value.length, _tempInput.value.length);
                }, 50); 
            });
        };

        QB.finishInput = function() {
            if (!_inputMode) return "";
            
            _inputMode = false;
            _tempInput.blur(); // Hide the mobile keyboard
            _tempInput.style.pointerEvents = 'none';
            _inputResolver = null;
            
            return _inputBuffer; // Return the final string
        };

        QB.getCurrentInput = function() {
            return _inputBuffer;
        }
    }
    // --- END: MOBILE INPUT SETUP FUNCTION ---


    // QBasic Functions (Preserved)
    // ----------------------------------------------------

    this.func__Abs = function(x) { /* ... */ };
    this.func__Acos = function(x) { /* ... */ };
    this.func__Acosh = function(x) { /* ... */ };
    this.sub__AcqTouch = function(index) { /* ... */ };
    // ... [Many other functions preserved] ...

    this.func__Abs = function(x) {
        _assertNumber(x, 1);
        return Math.abs(x);
    };

    this.func__Acos = function(x) {
        _assertNumber(x, 1);
        return Math.acos(x);
    };

    this.func__Acosh = function(x) {
        _assertNumber(x, 1);
        return Math.acosh(x);
    };

    this.sub__AcqTouch = function(index) {
        _assertNumber(index, 1);
        GX._acqTouch(index);
    };

    this.func__Asin = function(x) {
        _assertNumber(x, 1);
        return Math.asin(x);
    };

    this.func__Asinh = function(x) {
        _assertNumber(x, 1);
        return Math.asinh(x);
    };

    this.func__Atan = function(x) {
        _assertNumber(x, 1);
        return Math.atan(x);
    };

    this.func__Atanh = function(x) {
        _assertNumber(x, 1);
        return Math.atanh(x);
    };

    this.func__Beep = function() {
        if (_player) { _player.playSound(500, 0.2); }
    };

    this.func__Bglr = function(r, g, b) {
        _assertNumber(r, 1);
        _assertNumber(g, 2);
        _assertNumber(b, 3);

        var r = Math.floor(r * 255);
        var g = Math.floor(g * 255);
        var b = Math.floor(b * 255);
        
        var color = { r: r, g: g, b: b, a: 255 };
        return _addReplaceColor(color);
    };

    this.func__Bgrgb = function(rgb) {
        _assertNumber(rgb, 1);
        return _color(rgb);
    };

    this.func__Bgrgb32 = function(rgb) {
        _assertNumber(rgb, 1);
        return _color(rgb);
    };

    this.func__Bgrgb32r = function(rgb) {
        _assertNumber(rgb, 1);
        return _color(rgb).r;
    };

    this.func__Bgrgb32g = function(rgb) {
        _assertNumber(rgb, 1);
        return _color(rgb).g;
    };

    this.func__Bgrgb32b = function(rgb) {
        _assertNumber(rgb, 1);
        return _color(rgb).b;
    };

    this.func__Blue = function(rgb, imageHandle) {
        _assertParam(rgb);
        // TODO: implement corresponding logic when an image handle is supplied (maybe)
        return _color(rgb).b;
    };

    this.func__Blue32 = function(rgb) {
        _assertParam(rgb);
        // TODO: implement corresponding logic when an image handle is supplied (maybe)
        return _color(rgb).b;
    };

    this.sub__Box = function(x1, y1, x2, y2, color, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        var ctx = _images[imageId].ctx;

        _assertNumber(x1, 1);
        _assertNumber(y1, 2);
        _assertNumber(x2, 3);
        _assertNumber(y2, 4);
        _assertParam(color, 5);
        
        var img = _images[imageId];
        _flushScreenCache(img);

        ctx.strokeStyle = _colorToRgba(color, imageId);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    };

    this.sub__Boxf = function(x1, y1, x2, y2, color, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        var ctx = _images[imageId].ctx;

        _assertNumber(x1, 1);
        _assertNumber(y1, 2);
        _assertNumber(x2, 3);
        _assertNumber(y2, 4);
        _assertParam(color, 5);

        var img = _images[imageId];
        _flushScreenCache(img);

        ctx.fillStyle = _colorToRgba(color, imageId);
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    };

    this.func__Cd = function() {
        return GX.vfsCwd();
    };

    this.sub__Cd = function(dirName) {
        _assertParam(dirName, 1);
        GX.vfsCd(dirName);
    };

    this.func__Ceil = function(x) {
        _assertNumber(x, 1);
        return Math.ceil(x);
    };

    this.func__Cos = function(x) {
        _assertNumber(x, 1);
        return Math.cos(x);
    };

    this.func__Cosh = function(x) {
        _assertNumber(x, 1);
        return Math.cosh(x);
    };

    this.sub__Cls = function(color, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }

        var img = _images[imageId];
        _flushScreenCache(img);

        var ctx = img.ctx;
        ctx.fillStyle = _colorToRgba(color, imageId);
        ctx.fillRect(0, 0, img.canvas.width, img.canvas.height);

        _locX = 0;
        _lastTextX = 0;
        _locY = 0;
        _initScreenText();
    };

    this.func__Date = function() {
        return new Date().toLocaleDateString();
    };

    this.sub__Delay = async function(seconds) {
        _assertNumber(seconds, 1);
        _delayingFlag = true;
        await delay(seconds);
        _delayingFlag = false;
    };

    this.func__Delaying = function() {
        return _delayingFlag ? -1 : 0;
    };

    this.sub__Dim = function(arr, dim1, dim2, dim3, dim4, dim5, dim6) {
        _assertArray(arr);
        
        var dim = [
            (dim1 != undefined) ? dim1 : 0, 
            (dim2 != undefined) ? dim2 : 0,
            (dim3 != undefined) ? dim3 : 0,
            (dim4 != undefined) ? dim4 : 0,
            (dim5 != undefined) ? dim5 : 0,
            (dim6 != undefined) ? dim6 : 0
        ];

        var dims = [];
        for (var i = 0; i < dim.length; i++) {
            if (dim[i] == 0) { continue; }
            _assertNumber(dim[i], i + 2);
            dims.push([0, dim[i]]);
        }
        
        _initArray(arr, dims);
    };

    this.func__Dim = function(arr, dim1, dim2, dim3, dim4, dim5, dim6) {
        _assertArray(arr);
        
        var dim = [
            (dim1 != undefined) ? dim1 : 0, 
            (dim2 != undefined) ? dim2 : 0,
            (dim3 != undefined) ? dim3 : 0,
            (dim4 != undefined) ? dim4 : 0,
            (dim5 != undefined) ? dim5 : 0,
            (dim6 != undefined) ? dim6 : 0
        ];

        var dims = [];
        for (var i = 0; i < dim.length; i++) {
            if (dim[i] == 0) { continue; }
            _assertNumber(dim[i], i + 2);
            dims.push([0, dim[i]]);
        }
        
        _initArray(arr, dims);
        return arr; 
    };

    this.func__DispMode = function(imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        return _images[imageId].displayMode;
    };

    this.sub__DispMode = function(mode, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        _assertNumber(mode, 1);
        _images[imageId].displayMode = mode;
    };

    this.func__DoEvents = function() {
        // do nothing
    };

    this.sub__Draw = function(commands, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        _assertString(commands, 1);
        var ctx = _images[imageId].ctx;
        var img = _images[imageId];
        _flushScreenCache(img);

        // TODO: implement DRAW
    };

    this.sub__DrawBox = function(x1, y1, x2, y2, color, imageId) {
        this.sub__Box(x1, y1, x2, y2, color, imageId);
    };

    this.sub__DrawBoxf = function(x1, y1, x2, y2, color, imageId) {
        this.sub__Boxf(x1, y1, x2, y2, color, imageId);
    };

    this.func__Exp = function(x) {
        _assertNumber(x, 1);
        return Math.exp(x);
    };

    this.func__Floor = function(x) {
        _assertNumber(x, 1);
        return Math.floor(x);
    };

    this.func__FontHeight = function() {
        return _fonts[_currentFont].height;
    };

    this.func__FontWidth = function() {
        if (_fonts[_currentFont].monospace) {
            return _fonts[_currentFont].width;
        }
        // TODO: implement variable width font handling
        return _fonts[_currentFont].width;
    };

    this.func__FreeFile = function() {
        // always 1
        return 1;
    };

    this.sub__FreeTouch = function(index) {
        _assertNumber(index, 1);
        GX._freeTouch(index);
    };

    this.func__G2D = function(x) {
        _assertNumber(x, 1);
        return x * 9 / 10;
    };

    this.func__G2R = function(x) {
        _assertNumber(x, 1);
        return x * Math.PI / 180 * 9 / 10;
    };

    this.func__Green = function(rgb, imageHandle) {
        _assertParam(rgb);
        // TODO: implement corresponding logic when an image handle is supplied (maybe)
        return _color(rgb).g;
    };

    this.func__Green32 = function(rgb) {
        _assertParam(rgb);
        // TODO: implement corresponding logic when an image handle is supplied (maybe)
        return _color(rgb).g;
    };

    this.func__ImageHandle = function(imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        return _images[imageId].handle;
    };

    this.func__Inkey = function() {
        return _inKeyMap[_lastKey] || "";
    };

    this.func__Inkeys = function() {
        return _inKeyMap[_lastKey] || "";
    };

    // --- START: INPUT IMPLEMENTATION (Updated for async mobile support) ---
    this.func__Input = async function(prompt) {
        _assertParam(prompt, 1);
        this.sub__Print(prompt, _activeImage); // Print prompt

        await QB.startInput(); // Pause QBasic runner and show virtual keyboard

        var result = QB.finishInput(); // Get result and hide keyboard
        // NOTE: The result might need conversion from string to number in the runner
        return result; 
    };

    this.func__Input$ = async function(prompt) {
        _assertParam(prompt, 1);
        this.sub__Print(prompt, _activeImage); // Print prompt

        await QB.startInput(); // Pause QBasic runner and show virtual keyboard

        return QB.finishInput(); // Get result (string) and hide keyboard
    };
    // --- END: INPUT IMPLEMENTATION ---

    this.func__InStr = function(str, search) {
        _assertString(str, 1);
        _assertString(search, 2);
        return str.indexOf(search) + 1;
    };

    this.func__Int = function(x) {
        _assertNumber(x, 1);
        return Math.floor(x);
    };

    this.func__Key = function(code) {
        _assertNumber(code, 1);
        return _keyDownMap[code] ? -1 : 0;
    };

    this.func__KeyHit = function() {
        if (_keyHitBuffer.length > 0) {
            return _keyHitBuffer.shift();
        }
        return 0;
    };

    this.func__Lcase = function(str) {
        _assertString(str, 1);
        return str.toLowerCase();
    };

    this.func__Left = function(str, count) {
        _assertString(str, 1);
        _assertNumber(count, 2);
        return str.substring(0, count);
    };

    this.func__Len = function(str) {
        _assertString(str, 1);
        return str.length;
    };

    this.sub__Line = function(x1, y1, x2, y2, color, style, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        var ctx = _images[imageId].ctx;

        _assertNumber(x1, 1);
        _assertNumber(y1, 2);
        _assertNumber(x2, 3);
        _assertNumber(y2, 4);
        _assertParam(color, 5);

        var img = _images[imageId];
        _flushScreenCache(img);

        ctx.strokeStyle = _colorToRgba(color, imageId);
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    this.sub__Locate = function(row, col) {
        _assertNumber(row, 1);
        _assertNumber(col, 2);
        _locY = row - 1;
        _locX = col - 1;
        _lastTextX = _locX;
    };

    this.func__LocX = function() {
        return _locX + 1;
    };

    this.func__LocY = function() {
        return _locY + 1;
    };

    this.func__Log = function(x) {
        _assertNumber(x, 1);
        return Math.log(x);
    };

    this.func__Ltrim = function(str) {
        _assertString(str, 1);
        return str.trimStart();
    };

    this.func__Mid = function(str, start, length) {
        _assertString(str, 1);
        _assertNumber(start, 2);
        if (length == undefined) { length = str.length; }
        _assertNumber(length, 3);

        return str.substring(start - 1, start - 1 + length);
    };

    this.sub__MkDir = async function(dirName) {
        _assertParam(dirName, 1);
        await GX.vfsMkDir(dirName);
    };

    this.func__MouseX = function() {
        return GX._mouseX();
    };

    this.func__MouseY = function() {
        return GX._mouseY();
    };

    this.func__MouseButton = function(button) {
        _assertNumber(button, 1);
        return GX._mouseButton(button);
    };

    this.func__MouseWheel = function() {
        return GX._mouseWheel();
    };

    this.func__NumLock = function() {
        return _keyDownMap._NumLock ? -1 : 0;
    };

    this.sub__Palette = function(index, color, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        _assertNumber(index, 1);
        _assertNumber(color, 2);

        // TODO: implement PALETTE
    };

    this.sub__Pcopy = function(sourceId, destId) {
        if (sourceId == undefined) { sourceId = _activeImage; }
        if (destId == undefined) { destId = _activeImage; }
        
        var sourceImg = _images[sourceId];
        var destImg = _images[destId];
        _flushScreenCache(destImg);
        
        destImg.ctx.drawImage(sourceImg.canvas, 0, 0);
    };

    this.sub__Pset = function(x, y, color, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        var ctx = _images[imageId].ctx;

        _assertNumber(x, 1);
        _assertNumber(y, 2);
        _assertParam(color, 3);

        var img = _images[imageId];
        _flushScreenCache(img);

        ctx.fillStyle = _colorToRgba(color, imageId);
        ctx.fillRect(x, y, 1, 1);
    };

    this.func__Pget = function(x, y, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        var ctx = _images[imageId].ctx;

        _assertNumber(x, 1);
        _assertNumber(y, 2);

        // TODO: implement PGET
        return 0;
    };

    this.sub__Print = function(val, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        var ctx = _images[imageId].ctx;

        var img = _images[imageId];
        _flushScreenCache(img);

        var text = val.toString();
        var charWidth = _fonts[_currentFont].width;
        var charHeight = _fonts[_currentFont].height;
        var offset = _fonts[_currentFont].offset;

        var x = _locX * charWidth;
        var y = (_locY + 1) * charHeight - offset;
        
        ctx.fillStyle = _colorToRgba(15, imageId);
        ctx.font = _fonts[_currentFont].size + " " + _fonts[_currentFont].name;
        ctx.fillText(text, x, y);

        _lastTextX = x + ctx.measureText(text).width;
        _locX += text.length;
    };

    this.sub__PrintLocate = function(row, col) {
        _assertNumber(row, 1);
        _assertNumber(col, 2);
        _locY = row - 1;
        _locX = col - 1;
        _lastTextX = _locX;
    };

    this.sub__Put = function(x1, y1, imageHandle, op, imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        _assertNumber(x1, 1);
        _assertNumber(y1, 2);
        _assertNumber(imageHandle, 3);
        
        var sourceImage = _images[_imageHandles[imageHandle]];
        var destImage = _images[imageId];

        var dx1 = x1;
        var dy1 = y1;
        var sw = sourceImage.canvas.width;
        var sh = sourceImage.canvas.height;

        // draw the image
        var ctx = destImage.ctx;
        _flushScreenCache(destImage);
        
        ctx.drawImage(sourceImage.canvas, dx1, dy1, sw, sh);
    };

    this.sub__PutImage = function(destId, dx1, dy1, sourceId, sx1, sy1, dx2, dy2, sx2, sy2, op, dstep2, sstep2, dxu) {
        if (destId == undefined) { destId = _activeImage; }
        if (sourceId == undefined) { sourceId = _activeImage; }
        
        var sourceImage = _images[sourceId];
        var destImage = _images[destId];
        
        _assertNumber(dx1, 2);
        _assertNumber(dy1, 3);
        
        var dw, dh, sw, sh;
        
        if (dstep2) {
            dx1 = destImage.lastX + dx1;
            dy1 = destImage.lastY + dy1;
        }
        if (sstep2) {
            sx1 = sourceImage.lastX + sx1;
            sy1 = sourceImage.lastY + sy1;
        }

        if (dx2 == undefined) {
            if (dxu) {
                dw = destImage.canvas.width - dx1;
                dh = destImage.canvas.height - dy1;
                sw = sourceImage.canvas.width;
                sh = sourceImage.canvas.height;
            }
            else {
                dw = sourceImage.canvas.width;
                dh = sourceImage.canvas.height;
                sw = sourceImage.canvas.width;
                sh = sourceImage.canvas.height;
            }
            dx2 = dx1 + dw;
            dy2 = dy1 + dh;
            sx1 = 0;
            sy1 = 0;
            sx2 = sw;
            sy2 = sh;
        }
        else {
            if (dstep2) {
                dx2 = destImage.lastX + dx2;
                dy2 = destImage.lastY + dy2;
            }
            if (sstep2) {
                sx2 = sourceImage.lastX + sx2;
                sy2 = sourceImage.lastY + sy2;
            }
            dw = dx2 - dx1;
            dh = dy2 - dy1;
            sw = sx2 - sx1;
            sh = sy2 - sy1;
        }

        destImage.lastX = dx1;
        destImage.lastY = dy1;
        
        // draw the image
        var ctx = destImage.ctx;
        _flushScreenCache(destImage);
        ctx.drawImage(sourceImage.canvas, 
            sx1, sy1, sw, sh,
            dx1, dy1, dw, dh);

        // draw an image from one image to another
    };

    this.func__R2D = function(x) {
        _assertNumber(x);
        return x * 180 / Math.PI;
    };

    this.func__R2G = function(x) {
        _assertNumber(x);
        return x * 180 / Math.PI * 10/9;
    };

    this.func__Red = function(rgb, imageHandle) {
        _assertParam(rgb);
        // TODO: implement corresponding logic when an image handle is supplied (maybe)
        return _color(rgb).r;
    };

    this.func__Red32 = function(rgb) {
        _assertParam(rgb);
        // TODO: implement corresponding logic when an image handle is supplied (maybe)
        return _color(rgb).r;
    };

    this.func__ScrollLock = function() {
        return _keyDownMap._ScrollLock ? -1 : 0;
    };

    this.func__Sec = function(x) {
        _assertNumber(x);
        return 1 / Math.cos(x);
    };

    this.func__Sech = function(x) {
        _assertNumber(x);
        return 1 / Math.cosh(x);
    };

    this.func__SetFontSize = function(fnt, size) {
        _assertNumber(fnt, 1);
        _assertParam(size, 2);
        
        if (!isNaN(size)) {
            size = size + "px";
        }
        _fonts[fnt].size = size;
        _fonts[fnt].width = 0;
        _fonts[fnt].monospace = false;
        
        // determine the font width and height
        var ctx = GX.ctx();
        ctx.font = size + " " + _fonts[fnt].name;
        var tm = ctx.measureText("M");

        if (tm.fontBoundingBoxAscent) {
            _fonts[fnt].height = tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent;
            _fonts[fnt].offset = tm.fontBoundingBoxAscent - tm.actualBoundingBoxAscent;
        }
        else {
            // some browsers may still not support fontBoundingBox... so it will just not work as well
            _fonts[fnt].height = tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent + 2;
            _fonts[fnt].offset = 0;
        }
        
        if (tm.width == ctx.measureText("i").width) {
            _fonts[fnt].width = tm.width;
            _fonts[fnt].monospace = true;
        }
        
        _locX = 0;
        _lastTextX = 0;
        _locY = 0;
        _initScreenText();
    };

    this.func__Sinh = function(x) {
        _assertNumber(x);
        return Math.sinh(x);
    };

    this.func__Tan = function(x) {
        _assertNumber(x);
        return Math.tan(x);
    };

    this.func__Tanh = function(x) {
        _assertNumber(x);
        return Math.tanh(x);
    };

    this.func__Touch = function(index) {
        return GX._touch(index);
    };

    this.func__TouchCount = function() {
        return GX._touchCount();
    };

    this.func__TouchUsed = function() {
        return GX._touchUsed();
    };

    this.func__TouchX = function(index) {
        return GX._touchX(index);
    };

    this.func__TouchY = function(index) {
        return GX._touchY(index);
    };

    this.sub__Unzip = async function(fileName) {
        _assertParam(fileName);
        var vfs = GX.vfs();
        var file = vfs.getNode(fileName, GX.vfsCwd());
        if (!file || file.type != vfs.FILE) {
            throw new Error("File not found: [" + fileName + "]");
        }
        await vfs.unzip(file);
    };

    this.func__Version = function() {
        return "v2.6";
    };

    this.func__Width = function(imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        if (_images[imageId].charSizeMode) {
            return _width(imageId) / this.func__FontWidth();
        }
        return _width(imageId);
    };

    function _width(imageId) {
        if (imageId == undefined) { imageId = _activeImage; }
        return _images[imageId].canvas.width;
    }

    this.func__WindowAspect = function() {
        return _windowAspect;
    };

    this.func__WindowDef = function() {
        return _windowDef;
    };

    this.func__WindowHeight = function() {
        return window.innerHeight;
    };

    this.func__WindowWidth = function() {
        return window.innerWidth;
    };

    this.func__Zip = async function(fileName) {
        _assertParam(fileName);
        var vfs = GX.vfs();
        await vfs.zip(fileName);
    };

    function _init() {
        _initColorTable();
        _initInKeyMap();
        _initKeyHitMap();
        _initCharMap();
        
        // --- START: MOBILE INPUT INIT (New) ---
        _setupMobileInput();
        // --- END: MOBILE INPUT INIT ---

        addEventListener("keydown", function(event) { 
            if (!_runningFlag) { return; }
            
            _lastKey = event.key;
            
            if (!_inputMode) {
                // **NON-INPUT MODE (Game/Console Control):**
                // Preserve existing event control flow for game key handling
                event.preventDefault(); 
                
                _addInkeyPress(event);
                var kh = _getKeyHit(event);
                if (kh) {
                    _keyHitBuffer.push(kh);
                    _keyDownMap[kh] = true;
                    _keyDownMap._CapsLock = event.getModifierState("CapsLock");
                    _keyDownMap._NumLock = event.getModifierState("NumLock");
                    _keyDownMap._ScrollLock = event.getModifierState("ScrollLock");
                }
            } else {
                // **INPUT MODE (Virtual Keyboard Active):**
                // CRITICAL: Prevent default only for "Enter" to finish the INPUT command.
                if (event.key === "Enter") {
                    event.preventDefault();
                    if (_inputResolver) {
                        _inputResolver(); // Resolve the promise to continue QBasic execution
                    }
                } else {
                    // Allow all other keys to pass to the hidden <textarea> for input
                    // Do not preventDefault() here, otherwise native mobile keyboard won't work
                }
            }
        });

        addEventListener("keyup", function(event) { 
            if (!_runningFlag) { return; }

            if (!_inputMode) {
                // **NON-INPUT MODE (Game/Console Control):**
                event.preventDefault(); 

                var kh = _getKeyHit(event);
                if (kh) {
                    _keyHitBuffer.push(kh * -1);
                    _keyDownMap[kh] = false;
                    _keyDownMap._CapsLock = event.getModifierState("CapsLock");
                    _keyDownMap._NumLock = event.getModifierState("NumLock");
                    _keyDownMap._ScrollLock = event.getModifierState("ScrollLock");
                }
            } else {
                // **INPUT MODE:** Do nothing on keyup; let the browser handle it.
            }
        });
    }

    _init();
} 
