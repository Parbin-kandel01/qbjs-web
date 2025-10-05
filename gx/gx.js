var GX = new function() {
    var _canvas = null;
	var _ctx = null;
    var _framerate = 60;
    var _bg = [];
    var _images = [];
    var _entities = [];
    var _entities_active = [];
    var _entity_animations = [];
    var _scene = {};
    var _tileset = {};
    var _tileset_tiles = [];
    var _tileset_animations = [];
    var _map = {};
    var _map_layers = [];
    var _map_layer_info = [];
    var _map_loading = false;
    var _gravity = 9.8 * 8;
    var _terminal_velocity = 300;
    var _fonts = new Array(2);
    _fonts[0] = { eid:0, charSpacing:0, lineSpacing: 0};
    _fonts[1] = { eid:0, charSpacing:0, lineSpacing: 0};
    var _font_charmap = new Array(2).fill(new Array(256).fill({x:0,y:0}));
    var _fullscreenFlag = false;
    var __debug = {
        enabled: false,
        font: 1 // GX.FONT_DEFAULT
    };
    var _sounds = [];
    var _sound_muted = false;
    var _mouseButtons = [0,0,0];
    var _mouseWheelFlag = 0;
    var _mousePos = { x:0, y:0 };
    var _mouseInputFlag = false;
    var _touchInputFlag = false;
    var _touchPos = { x:0, y:0 };
    var _bindTouchToMouse = true;

    var _vfs = new VFS(); // Assuming VFS is defined elsewhere or will be provided
    var _vfsCwd = null;

    // javascript specific
    var _onGameEvent = null;
    var _pressedKeys = {};

    // Mobile Input Variables
    var _touchControls = {
        up: false,
        down: false,
        left: false,
        right: false,
        action: false
    };
    var _isMobileDevice = false; // Flag to detect mobile devices
    
    // Internal Helper Functions (ADDED FOR COMPLETENESS/FIXES)
    function _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function _rectCollide(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 &&
               x1 + w1 > x2 &&
               y1 < y2 + h2 &&
               y1 + h1 > y2;
    }

    // Placeholder for physics/movement logic (used in _sceneUpdate)
    async function _sceneMoveEntities() {
        var delta = 1 / GX.frameRate();
        var gravity = GX.gravity();
        var terminalVelocity = GX.terminalVelocity();

        for (var i=1; i <= _entities.length; i++) {
            var e = _entities[i-1];
            
            if (e.applyGravity) {
                // Apply gravity
                e.vy = e.vy + gravity * (GX.frame() - e.jumpstart) * delta;
                if (e.vy > terminalVelocity) {
                    e.vy = terminalVelocity;
                }
            }

            // Apply velocity
            e.x += e.vx * delta;
            e.y += e.vy * delta;

            // TODO: Add map/tile collision checks here
        }
    }

    function _mapLayerInit() {
        // Initializes a map layer array
        if (!GX.mapRows() || !GX.mapColumns()) { return new Int16Array(0); }
        return new Int16Array(GX.mapRows() * GX.mapColumns());
    }

    async function _getJSON(url) {
        let res = await fetch(url);
        if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); }
        return await res.json();
    }
    
    function _fontCreateDefault(fontId) {
        // Placeholder for default font creation, called in _reset
    }
    
    function _debugFrameRate() {
        // Placeholder for drawing FPS, called in _sceneDraw
    }
    
    function _mapIsometric(value) {
        if (value != undefined) { _map.isometric = value; }
        return _map.isometric;
    }

    function _mapDraw() {
        // Placeholder for map drawing
    }

    function _mapTile(col, row, layer, tileId) {
        // Placeholder for map tile access
        return 0;
    }

    function _mapTileId(col, row, layer) {
        // Placeholder for map tile ID access
        return 0;
    }

    function _mapTilePos(tileId) {
        // Placeholder for map tile position access
        return {x: 0, y: 0};
    }

    function _mapClear() {
        _map.columns = 0;
        _map.rows = 0;
        _map.layers = 0;
        _map_layers = [];
        _map_layer_info = [];
        _map.isometric = false;
    }

    function _tilesetCreate(filename, width, height, tiles, animations) {
        _tileset.filename = filename;
        _tileset.width = width;
        _tileset.height = height;
        _tileset_tiles = tiles;
        _tileset_animations = animations;
        _tileset.image = _imageLoad(filename);
    }
    
    function _tilesetTileType(tileId) {
        // Placeholder for tileset tile type access
        return 0;
    }
    
    function _tilesetTileId(col, row) {
        // Placeholder for tileset tile ID access
        return 0;
    }

    /* ---------- REPLACEMENT: improved _showInput / _hideInput  ---------- */
    function _showInput(cx, cy) {
        // cx, cy are optional coordinates (page coordinates relative to canvas) - used to position input
        var hiddenInput = document.getElementById("gx-hidden-input");
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.id = "gx-hidden-input";
            hiddenInput.type = "text";
            hiddenInput.autocapitalize = "off";
            hiddenInput.autocomplete = "off";
            hiddenInput.autocorrect = "off";
            hiddenInput.spellcheck = false;
            hiddenInput.setAttribute('inputmode','text'); // hints mobile keyboards
            // style such that input is focusable and inside viewport but visually invisible
            Object.assign(hiddenInput.style, {
                position: 'absolute',
                zIndex: 2147483647,
                opacity: '0.01',    // NOT 0 — some browsers ignore fully-transparent elements
                left: '0px',
                top: '0px',
                width: '1px',
                height: '1px',
                border: 'none',
                padding: '0',
                margin: '0',
                background: 'transparent',
                outline: 'none'
            });
            document.body.appendChild(hiddenInput);

            // forward keydown / keyup to game events
            hiddenInput.addEventListener('keydown', function(e) {
                if (_onGameEvent) _onGameEvent({ event: GX.EVENT_KEY_DOWN, key: e.key });
                // allow navigation keys etc to behave normally (don't prevent)
            }, false);
            hiddenInput.addEventListener('keyup', function(e) {
                if (_onGameEvent) _onGameEvent({ event: GX.EVENT_KEY_UP, key: e.key });
            }, false);

            // input: commit typed characters (handles many simple cases)
            hiddenInput.addEventListener('input', function(e) {
                var v = e.target.value;
                if (v && v.length > 0) {
                    if (_onGameEvent) _onGameEvent({ event: GX.EVENT_KEY_TYPED, key: v });
                    e.target.value = "";
                }
            });

            // composition events: handle IME properly (CJK, Devanagari, etc.)
            hiddenInput.addEventListener('compositionend', function(e) {
                if (_onGameEvent) _onGameEvent({ event: GX.EVENT_KEY_TYPED, key: e.data });
                hiddenInput.value = "";
            });

            // when keyboard is dismissed (blur) hide the input again
            hiddenInput.addEventListener('blur', function(e) {
                hiddenInput.style.display = 'none';
                // optional notification: keyboard dismissed
                if (_onGameEvent) { _onGameEvent({ event: 'GX_EVENT_KEYBOARD_DISMISSED' }); }
            });
        }

        // make sure it's visible and placed inside viewport (use provided coords if any)
        hiddenInput.style.display = 'block';
        if (typeof cx === 'number' && typeof cy === 'number') {
            // try to position input near touch (use small offset so it's inside viewport)
            hiddenInput.style.left = Math.max(0, Math.floor(cx)) + 'px';
            hiddenInput.style.top = Math.max(0, Math.floor(cy)) + 'px';
        } else {
            // default position (top-left)
            hiddenInput.style.left = '4px';
            hiddenInput.style.top = '4px';
        }

        // ensure the DOM has updated and then focus (setTimeout improves reliability on Android)
        // try immediate focus first (should work in most modern browsers)
        try { hiddenInput.focus(); } catch (ex) {}
        // fallback: re-focus shortly after to cover browser timing quirks
        setTimeout(function() {
            try { hiddenInput.focus(); } catch (ex) {}
        }, 50);
    }

    function _hideInput() {
        var hiddenInput = document.getElementById("gx-hidden-input");
        if (hiddenInput) {
            try { hiddenInput.blur(); } catch (ex) {}
            hiddenInput.style.display = 'none';
        }
    }

    async function _registerGameEvents(fnEventCallback) {
        _onGameEvent = fnEventCallback;

        // wait for all of the resources to load
        while (!GX.resourcesLoaded()) {
            await _sleep(100);
        }
    }

    function __newFont() {
        return { eid:0, charSpacing:0, lineSpacing: 0}
    }
    
    function _qbBoolean(value) {
        return value ? -1 : 0;
    }

    function _reset() {
        // stop any sounds that are currently playing
        _soundStopAll();
        _framerate = 60;
        _bg = [];
        _images = [];
        _entities = [];
        _entity_animations = [];
        _scene = {};
        _tileset = {};
        _tileset_tiles = [];
        _tileset_animations = [];
        _map = {};
        _map_layers = [];
        _map_layer_info = [];
        _map_loading = false;
        _gravity = 9.8 * 8;
        _terminal_velocity = 300;

        _fonts = new Array(2);
        _fonts[0] = { eid:0, charSpacing:0, lineSpacing: 0};
        _fonts[1] = { eid:0, charSpacing:0, lineSpacing: 0};
        _font_charmap = new Array(2).fill(new Array(256).fill({x:0,y:0}));
        _fontCreateDefault(GX.FONT_DEFAULT);
        _fontCreateDefault(GX.FONT_DEFAULT_BLACK);

        _fullscreenFlag = false;
        __debug = {
            enabled: false,
            font: 1 // GX.FONT_DEFAULT
        };
        _sounds = [];
        _sound_muted = false;
        _mouseButtons = [0,0,0];
        _mouseWheelFlag = 0;
        _mousePos = { x:0, y:0 };
        _mouseInputFlag = false;
    
        _vfsCwd = _vfs.rootDirectory();

        // javascript specific
        _onGameEvent = null;
        _pressedKeys = {};

        // Reset touch controls
        _touchControls = {
            up: false,
            down: false,
            left: false,
            right: false,
            action: false
        };
    }

    // Scene Functions
    function _sceneCreate(width, height) {
        _canvas = document.getElementById("gx-canvas");
        if (!_canvas) {
		    _canvas = document.createElement("canvas");
            _canvas.id = "gx-canvas";
            document.getElementById("gx-container").appendChild(_canvas);

            /* ---------- REPLACEMENT: in _sceneCreate() after creating _canvas ---------- */
            /* IMPORTANT: replace the existing touch listeners which call event.preventDefault()
            with these safer handlers that rely on touch-action: none instead. */

            _canvas.style.touchAction = 'none';    // prevents scroll/pan without using preventDefault
            _canvas.setAttribute('tabindex','0');  // allow focus if needed

            _canvas.addEventListener("mousemove", function(event) {
                _mousePos.x = event.offsetX;
                _mousePos.y = event.offsetY;
                _mouseInputFlag = true;
            });

            _canvas.addEventListener("mousedown", function(event) {
                event.preventDefault();
                if (event.button == 0) { _mouseButtons[0] = -1; }
                else if (event.button == 1) { _mouseButtons[2] = -1; }
                else if (event.button == 2) { _mouseButtons[1] = -1; }
                _mouseInputFlag = true;
            });

            _canvas.addEventListener("mouseup", function(event) {
                if (event.button == 0) { _mouseButtons[0] = 0; }
                else if (event.button == 1) { _mouseButtons[2] = 0; }
                else if (event.button == 2) { _mouseButtons[1] = 0; }
                _mouseInputFlag = true;
            });

            _canvas.addEventListener("wheel", function(event) {
                event.preventDefault();
                var move = event.deltaY;
                if (move > 0) { move = 1; }
                else if (move < 0) { move = -1; }
                _mouseWheelFlag += move;
                _mouseInputFlag = true;
            });

            _canvas.addEventListener("contextmenu", function(event) {
                event.preventDefault();
            });

            // touch handlers: DO NOT call preventDefault() here
            _canvas.addEventListener("touchmove", function(event) {
                // For touchmove we *may* still want to prevent default scroll, but because
                // touch-action: none is set on the canvas that is not needed.
                var touch = event.touches[0];
                var rect = event.target.getBoundingClientRect();
                _touchPos.x = touch.pageX - rect.left;
                _touchPos.y = touch.pageY - rect.top;
                _touchInputFlag = true;
                if (_bindTouchToMouse) {
                    _mousePos = _touchPos;
                    _mouseInputFlag = true;
                }
            });

            _canvas.addEventListener("touchstart", function(event) {
                var touch = event.touches[0];
                var rect = event.target.getBoundingClientRect();
                _touchPos.x = touch.pageX - rect.left;
                _touchPos.y = touch.pageY - rect.top;
                _touchInputFlag = true;
                if (_bindTouchToMouse) {
                    _mouseButtons[0] = -1;
                    _mouseInputFlag = true;
                    _mousePos = _touchPos;
                }
            });

            _canvas.addEventListener("touchend", function(event) {
                // changedTouches contains the final touch coordinates
                var rect = event.target.getBoundingClientRect();
                if (event.changedTouches && event.changedTouches.length) {
                    var touch = event.changedTouches[0];
                    _touchPos.x = touch.pageX - rect.left;
                    _touchPos.y = touch.pageY - rect.top;
                }
                _touchInputFlag = false;
                if (_bindTouchToMouse) {
                    _mouseButtons[0] = 0;
                    _mouseInputFlag = true;
                }
                // NOTE: if you want to show the keyboard on tap, call GX.showInput(_touchPos.x + rect.left, _touchPos.y + rect.top)
                // from your game logic (or enable the code below to open input automatically on tap)
                // Example auto-open (commented out to avoid always opening keyboard on every tap):
                // setTimeout(function(){ GX.showInput(_touchPos.x + rect.y, _touchPos.y + rect.top); }, 0);
            });

            document.addEventListener("fullscreenchange", function(event) {
                if (document.fullscreenElement) {
                    _fullscreenFlag = true;
                    _scene.prevScaleX = _scene.scaleX;
                    _scene.prevScaleY = _scene.scaleY;
                    var widthFactor = screen.width / _scene.width;
                    var heightFactor = screen.height / _scene.height;
                    var factor = Math.min(widthFactor, heightFactor);
                    var offsetX = 0;
                    var offsetY = 0;
                    if (widthFactor > heightFactor) {
                        offsetX = (screen.width - _scene.width * factor) / 2;
                    }
                    else {
                        offsetY = (screen.height - _scene.height * factor) / 2;
                    }
                    
                    _scene.scaleX = factor;
                    _scene.scaleY = factor;
                    _scene.offsetX = offsetX;
                    _scene.offsetY = offsetY;
                }
                else {
                    _fullscreenFlag = false;
                    _scene.scaleX = _scene.prevScaleX;
                    _scene.scaleY = _scene.prevScaleY;
                    _scene.offsetX = 0;
                    _scene.offsetY = 0;
                }
            });

        }
        _canvas.width = width;
        _canvas.height = height;
        _ctx = _canvas.getContext("2d");

        var footer = document.getElementById("gx-footer");
        if (footer) {
            footer.style.width = width;
        }
        
        _scene.width = width;
        _scene.height = height;
        _scene.x = 0;
        _scene.y = 0;
        _scene.scaleX = 1;
        _scene.scaleY = 1;
        _scene.offsetX = 0;
        _scene.offsetY = 0;
        _scene.frame = 0;
        _scene.followMode = GX.SCENE_FOLLOW_NONE;
        _scene.followEntity = null;
        _scene.constrainMode = GX.SCENE_CONSTRAIN_NONE;
        _scene.active = false;

        _customEvent(GX.EVENT_INIT);
    }

    // Resize the scene with the specified pixel width and height.
    function _sceneResize(swidth, sheight) {
        _scene.width = swidth;
        _scene.height = sheight;
        _canvas.width = _scene.width;
        _canvas.height = _scene.height;
        if (_scene.scaleX != 1) {
            _ctx.imageSmoothingEnabled = false;
            _ctx.scale(_scene.scaleX, _scene.scaleY);
        }
        _updateSceneSize();
    }

    function _updateSceneSize() {
        if (GX.tilesetWidth() < 1 || GX.tilesetHeight() < 1) { return; }
    
        if (GX.mapIsometric()) {
            _scene.columns = Math.floor(GX.sceneWidth() / GX.tilesetWidth())
            _scene.rows = GX.sceneHeight() / (GX.tilesetWidth() / 4)
        }
        else {
            _scene.columns = Math.floor(GX.sceneWidth() / GX.tilesetWidth());
            _scene.rows = Math.floor(GX.sceneHeight() / GX.tilesetHeight());
        }
    }

    // Scale the scene by the specified scale factor.
    function _sceneScale (scale) {
        var lastScale = _scene.scaleX;
        _scene.scaleX = scale;
        _scene.scaleY = scale;
        _canvas.width = _scene.width * _scene.scaleX;
        _canvas.height = _scene.height * _scene.scaleY;
        _ctx.imageSmoothingEnabled = false;
        if (lastScale > 1) { _ctx.scale(1/lastScale, 1/lastScale); }
        _ctx.scale(_scene.scaleX, _scene.scaleY);

        var footer = document.getElementById("gx-footer");
        if (footer) {
            footer.style.width = _canvas.width;
        }
    }

    function _sceneX() { return _scene.x; }
    function _sceneY() { return _scene.y; }
    function _sceneWidth() { return _scene.width; }
    function _sceneHeight() { return _scene.height; }
    function _sceneColumns() { return _scene.columns; }
    function _sceneRows() { return _scene.rows; }
    function _sceneActive() { return _scene.active; } // Added public method for scene active state

    // Draw the scene.
    function _sceneDraw() {
        if (_map_loading) { return; }
        var frame = _scene.frame % GX.frameRate() + 1;

		_ctx.clearRect(0, 0, GX.sceneWidth(), GX.sceneHeight());

        for (var bi = 1; bi <= _bg.length; bi++) {
            _backgroundDraw(bi);
        }

        _customDrawEvent(GX.EVENT_DRAWBG);

        _entities_active = [];
        for (var ei=1; ei <= _entities.length; ei++) {
            var e = _entities[ei-1];
            if (!e.screen) {
                if (_rectCollide(e.x, e.y, e.width, e.height, GX.sceneX(), GX.sceneY(), GX.sceneWidth(), GX.sceneHeight())) {
                    _entities_active.push(ei);
                }
            }
        }

        GX.mapDraw();

        _customDrawEvent(GX.EVENT_DRAWMAP);

        _drawEntityLayer(0);

        for (var ei = 1; ei <= _entities.length; ei++) {
            var e = _entities[ei-1];
            if (e.screen) {
                _entityDraw(e);
                if (e.animate > 0) {
                    if (frame % (GX.frameRate() / e.animate) == 0) {
                        GX.entityFrameNext(ei);
                    }
                }
            }
        }

        _customDrawEvent(GX.EVENT_DRAWSCREEN);
        if (GX.debug()) { _debugFrameRate(); }

        _customEvent(GX.EVENT_PAINTBEFORE);
        _customEvent(GX.EVENT_PAINTAFTER);
    }
    
    async function _sceneUpdate() {
        _scene.frame++;
        if (_map_loading) { return; }

        _customEvent(GX.EVENT_UPDATE);

        await _sceneMoveEntities();

        var sx, sy;
        if (_scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_POS ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_NEG) {
            sx = (GX.entityX(_scene.followEntity) + GX.entityWidth(_scene.followEntity) / 2) - GX.sceneWidth() / 2;
            if (sx < GX.sceneX() && _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_POS ||
                sx > GX.sceneX() && _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_NEG) {
            } else {
                GX.scenePos(sx, GX.sceneY());
            }
        }
        if (_scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_Y) {
            sy = (GX.entityY(_scene.followEntity) + GX.entityHeight(_scene.followEntity) / 2) - GX.sceneHeight() / 2;
            GX.scenePos(GX.sceneX(), sy);
        }

        if (_scene.constrainMode == GX.SCENE_CONSTRAIN_TO_MAP) {
            var mwidth = GX.mapColumns() * GX.tilesetWidth();
            var mheight = GX.mapRows() * GX.tilesetHeight();
            sx = GX.sceneX();
            if (sx < 0) {
                sx = 0
            } else if (sx + GX.sceneWidth() > mwidth) {
                sx = mwidth - GX.sceneWidth();
                if (sx < 0) { sx = 0; }
            }

            sy = GX.sceneY();
            if (sy < 0) {
                sy = 0;
            } else if (sy + GX.sceneHeight() > mheight) {
                sy = mheight - GX.sceneHeight();
                if (sy < 0) { sy = 0; }
            }
            GX.scenePos(sx, sy);
        }
    }

    // Start the game loop.
    async function _sceneStart() {

        _scene.frame = 0;
        _scene.active = true;

        setTimeout(_sceneLoad, 10);

        while (_scene.active) {
            await _sleep(100);
        }
    }

    function _resourcesLoaded() {
        for (var i=0; i < _images.length; i++) {
            if (!_images[i].complete) {
                return false;
            }
        }
        return true;
    }

    function _sceneLoad() {
        if (!_resourcesLoaded()) {
            setTimeout(_sceneLoad, 50);
            return;
        }
        window.requestAnimationFrame(_sceneLoop);
    }

    async function _sceneLoop() {
        if (!_scene.active) { return; }

        await GX.sceneUpdate();
        GX.sceneDraw();

        window.requestAnimationFrame(_sceneLoop);
    }

    // Stop the game loop.
    function _sceneStop() {
        _scene.active = false;
    }

    function _sceneFollowEntity (eid, mode) {
        _scene.followEntity = eid;
        _scene.followMode = mode;
    }

    function _sceneConstrain(mode) {
        _scene.constrainMode = mode;
    }

    // Moves the scene position by the number of pixels specified by the dx and dy values.
    function _sceneMove (dx, dy) {
        _scene.x = GX.sceneX() + dx;
        _scene.y = GX.sceneY() + dy;
    }

    // Positions the scene at the specified x and y coordinates.
    function _scenePos (x, y) {
        _scene.x = x;
        _scene.y = y;
    }

    // Event functions
    function _customEvent (eventType) {
        var e = {};
        e.event = eventType
        if (_onGameEvent) {
            _onGameEvent(e);
        }
    }

    function _customDrawEvent (eventType) {
        _customEvent(eventType)
    }

    function _keyDown(key) {
        // Check touch controls if on mobile
        if (_isMobileDevice) {
            switch (key) {
                case GX.KEY_UP: return _qbBoolean(_touchControls.up);
                case GX.KEY_DOWN: return _qbBoolean(_touchControls.down);
                case GX.KEY_LEFT: return _qbBoolean(_touchControls.left);
                case GX.KEY_RIGHT: return _qbBoolean(_touchControls.right);
                case GX.KEY_SPACEBAR:
                case GX.KEY_ENTER:
                    return _qbBoolean(_touchControls.action);
                default:
                    // Fallback to physical/virtual keyboard events for other keys
                    return _qbBoolean(_pressedKeys[key]);
            }
        }
        return _qbBoolean(_pressedKeys[key]);
    }

    // Frame Functions
    // Gets or sets the current frame rate (expressed in frames-per-second or FPS).
    function _frameRate (frameRate) {
        if (frameRate != undefined) {
            _framerate = frameRate;
        }
        return _framerate;
    }

    // Returns the current frame.
    function _frame() {
        return _scene.frame;
    }

    // Image Functions
    function _imageLoad(filename, callbackFn) {
        for (var i=0; i < _images.length; i++) {
            if (filename == _images[i].src) {
                return i;
            }
        }
        var img = new Image();
        if (callbackFn != undefined) {
            img.onload = function() { 
                callbackFn(img);
            }
        }

        var file = _vfs.getNode(filename, _vfsCwd);
        if (file && file.type == _vfs.FILE) {
            _vfs.getDataURL(file).then((dataUrl) => {
                img.src = dataUrl;
            });
        }
        else {
            img.src = filename;
        }
        _images.push(img);
        return _images.length;
    }
    
    function _image(imgId) {
        return _images[imgId-1];
    }
    
    function _spriteDraw(i, x, y, seq, frame, swidth, sheight) {
        _spriteDrawScaled(i, x, y, swidth, sheight, seq, frame, swidth, sheight);
    }
    
    function _spriteDrawScaled(i, x, y, dwidth, dheight, seq, frame, swidth, sheight) {
        var xoffset, yoffset;
        xoffset = (frame - 1) * swidth;
        yoffset = (seq - 1) * sheight;
        _ctx.drawImage(_image(i), xoffset, yoffset, swidth, sheight, x, y, dwidth, dheight);
    }
    
    // Background functions
    // Adds a new background image to the current scene.
    function _backgroundAdd (imageFilename, mode) {
        var bg = {};
        bg.mode = mode;
        bg.x = 0;
        bg.y = 0;
        bg.wrapFactor = 1;
        bg.image = _imageLoad(imageFilename);
        
        _bg.push(bg);
        return _bg.length;
    }

    function _backgroundWrapFactor(bi, wrapFactor) { // Corrected function name
        _bg[bi-1].wrapFactor = wrapFactor;
    }

    function _backgroundDraw (bi) {
        bi--;

        if (_bg[bi].mode == GX.BG_STRETCH) {
            _ctx.drawImage(_image(_bg[bi].image), 0, 0, _scene.width, _scene.height);
        }

        else if (_bg[bi].mode == GX.BG_SCROLL) {
            var img = _image(_bg[bi].image);
            var factor = GX.sceneWidth() / GX.sceneHeight();
            var h = img.height;
            var w = h * factor;
            var xfactor = GX.sceneX() / (GX.mapColumns() * GX.tilesetWidth())
            var x = xfactor * (img.width - w); 
            _ctx.drawImage(img, x, 0, w, h, 0, 0, GX.sceneWidth(), GX.sceneHeight());
        }

        else if (_bg[bi].mode == GX.BG_WRAP) {
            _backgroundDrawWrap(bi);
        }
    }

    function _backgroundDrawWrap(bi) {
        var img;
        var x, y, x2, y2, xx, yy, w, h;
        var wrapFactor;

        img = _image(_bg[bi].image);
        wrapFactor = _bg[bi].wrapFactor;

        x = Math.floor((GX.sceneX() * wrapFactor) % img.width);
        y = Math.floor((GX.sceneY() * wrapFactor) % img.height);
        if (x < 0) { x = img.width + x; }
        if (y < 0) { y = img.height + y; }
        x2 = GX.sceneWidth() + x;
        y2 = GX.sceneHeight() + y;

        _ctx.drawImage(img, x, y, GX.sceneWidth(), GX.sceneHeight(), 0, 0, GX.sceneWidth(), GX.sceneHeight());

        if (x2 > img.width) {
            w = x2 - img.width;
            xx = GX.sceneWidth() - w;

            _ctx.drawImage(img, 0, y, w, GX.sceneHeight(), xx, 0, w, GX.sceneHeight());
        }

        if (y2 > img.height) {
            h = y2 - img.height;
            yy = GX.sceneHeight() - h;

            _ctx.drawImage(img, x, 0, GX.sceneWidth(), h, 0, yy, GX.sceneWidth(), h);
        }

        if (x2 > img.width && y2 > img.height) {
            w = x2 - img.width;
            h = y2 - img.height;
            xx = GX.sceneWidth() - w;
            yy = GX.sceneHeight() - h;

            _ctx.drawImage(img, 0, 0, w, h, xx, yy, w, h);
        }
    }

    // Removes all background images from the scene.
    function _backgroundClear() {
        _bg.length = 0;
    }

    // Sound Methods
    function _soundClose (sid) {
        _sounds[sid-1].pause();
        _sounds[sid-1] = undefined;
    }

    async function _soundLoad (filename) {
        var file = _vfs.getNode(filename, _vfsCwd);
        if (file && file.type == _vfs.FILE) {
            var dataUrl = await _vfs.getDataURL(file);
            var a = new Audio(dataUrl);
            _sounds.push(a);
        }
        else {
            var a = new Audio(filename);
            _sounds.push(a);
        }

        return _sounds.length;
    }

    function _soundPlay (sid) {
        if (!GX.soundMuted()) {
            _sounds[sid-1].loop = false;
            _sounds[sid-1].play();
        }
    }

    function _soundRepeat (sid) {
        if (!GX.soundMuted()) {
            _sounds[sid-1].loop = true;
            _sounds[sid-1].play();
        }
    }

    function _soundVolume (sid, v) {
        _sounds[sid-1].volume = v / 100;
    }

    function _soundPause (sid) {
        _sounds[sid-1].pause();
    }

    function _soundStop (sid) {
        _sounds[sid-1].pause();
        _sounds[sid-1].currentTime = 0;
    }

    function _soundStopAll () {
        for (var i=0; i < _sounds.length; i++) {
            if (_sounds[i]) {
                _soundStop(i+1);
            }
        }
    }

    function _soundMuted (muted) {
        if (muted != undefined) {
            _sound_muted = muted;
        }
        return _qbBoolean(_sound_muted);
    }
    
    // Entity Functions
    function _entityCreate (imageFilename, ewidth, height, seqFrames, uid) {
        var newent = {};
        newent.x = 0;
        newent.y = 0;
        newent.vx = 0;
        newent.vy = 0;
        newent.jumpstart = 0;
        newent.height = height;
        newent.width = ewidth;
        newent.sequences = 1;
        newent.image = _imageLoad(imageFilename, function() {
            newent.sequences = Math.floor(_images[newent.image-1].height / height);
        });
        newent.spriteFrame = 1;
        newent.spriteSeq = 1;
        newent.seqFrames = seqFrames;
        newent.hidden = false;
        newent.animateMode = GX.ANIMATE_LOOP;
        newent.coLeft = 0;
        newent.coTop = 0;
        newent.coRight = 0;
        newent.coBottom = 0;
        newent.applyGravity = false;
        newent.sequences = 0;
        newent.mapLayer = 0;

        _entities.push(newent);
        
        var animation = [];
        _entity_animations.push(animation);
        
        return _entities.length;
    }
    
    function _screenEntityCreate (imageFilename, ewidth, height, seqFrames, uid) {
        var eid = _entityCreate(imageFilename, ewidth, height, seqFrames, uid);
        _entities[eid-1].screen = true;
        return eid;
    }

    function _entityDraw (ent) {
        if (ent.hidden) { return; }
        var x, y;
        if (ent.screen) {
            x = ent.x
            y = ent.y
        } else {
            x = ent.x - GX.sceneX()
            y = ent.y - GX.sceneY()
    	}
        GX.spriteDraw(ent.image, x, y, ent.spriteSeq, ent.spriteFrame, ent.width, ent.height);
    }    

    function _entityAnimate (eid, seq, a) {
        _entities[eid-1].animate = a;
        _entities[eid-1].spriteSeq = seq;
        _entities[eid-1].seqFrames = _entityGetFrames(eid, seq);
        _entities[eid-1].prevFrame = -1;
        if (_entities[eid-1].spriteFrame > _entities[eid-1].seqFrames) {
            _entities[eid-1].spriteFrame = 1;
        }
    }

    function _entityGetFrames (eid, seq) {
        var a = _entity_animations[eid-1];
        if (a[seq-1] == undefined) {
            return _entities[eid-1].seqFrames;
        }
        else {
            return a[seq-1].frames;
        }
    }

    function _entityAnimateStop (eid) {
        _entities[eid-1].animate = 0;
    }

    function _entityAnimateMode (eid, mode) {
        if (mode != undefined) {
        	_entities[eid-1].animateMode = mode;
        }
        return _entities[eid-1].animateMode;
    }

    function _entityMove (eid, x, y) {
        if (eid == undefined || eid < 1) { return; }
        _entities[eid-1].x += x;
        _entities[eid-1].y += y;
    }

	function _entityPos (eid, x, y) {
        _entities[eid-1].x = x;
        _entities[eid-1].y = y;
    }

    function _entityVX (eid, vx) {
        if (vx != undefined) {
            _entities[eid-1].vx = vx;
        }
        return _entities[eid-1].vx;
    }

    function _entityVY (eid, vy) {
        if (vy != undefined) {
        	_entities[eid-1].vy = vy;
        }
        return _entities[eid-1].vy;
    }

    function _entityVisible (eid, visible) {
        if (visible != undefined) {
            _entities[eid-1].hidden = !visible;
        }
        return _qbBoolean(!_entities[eid-1].hidden);
    }

    function _entityX (eid) { return _entities[eid-1].x; }
    function _entityY (eid) { return _entities[eid-1].y; }
    function _entityWidth (eid) { return _entities[eid-1].width; }
    function _entityHeight (eid) { return _entities[eid-1].height; }
    
    function _entityFrameNext (eid) {
        if (_entities[eid-1].animateMode == GX.ANIMATE_SINGLE) {
            if (_entities[eid-1].spriteFrame + 1 > _entities[eid-1].seqFrames) {
                if (_entities[eid-1].spriteFrame != _entities[eid-1].prevFrame) {
                    // Fire animation complete event
                    var e = {};
                    e.event = GX.EVENT_ANIMATE_COMPLETE;
                    e.entity = eid;
                    if (_onGameEvent) {
                        _onGameEvent(e);
                    }
                    _entities[eid-1].prevFrame = _entities[eid-1].spriteFrame;
                }
                return;
            }
        }

        _entities[eid-1].prevFrame = _entities[eid-1].spriteFrame;
        _entities[eid-1].spriteFrame = _entities[eid-1].spriteFrame + 1;
        if (_entities[eid-1].spriteFrame > _entities[eid-1].seqFrames) {
            _entities[eid-1].spriteFrame = 1;
        }
    }

    function _entityFrameSet (eid, seq, frame) {
        _entities[eid-1].spriteSeq = seq;
        _entities[eid-1].seqFrames = _entityGetFrames(eid, seq);
        _entities[eid-1].spriteFrame = frame;
        _entities[eid-1].prevFrame = frame - 1;
    }

    function _entityFrame (eid) {
        return _entities[eid-1].spriteFrame;
    }

    function _entitySequence (eid) {
        return _entities[eid-1].spriteSeq;
    }

    function _entitySequences (eid) {
        return _entities[eid-1].sequences;
    }

    function _entityFrames (eid, seq, frames) {
        console.log(eid + ":" + seq + ":" + frames);
        if (frames != undefined) {
            _entity_animations[eid-1][seq-1] = { frames: frames };
        }
        return _entityGetFrames(eid, seq);
    }

    function _entityType (eid, etype) {
        if (etype != undefined) {
        	_entities[eid-1].type = etype;
        }
        return _entities[eid-1].type
	}

    function _entityMapLayer (eid, layer) {
        if (layer != undefined) {
            _entities[eid-1].mapLayer = layer;
        }
        return _entities[eid-1].mapLayer;
    }

    function _drawEntityLayer (layer) {
        var frame = _scene.frame % GX.frameRate() + 1;

        for (var i=0; i < _entities_active.length; i++) {
            var ei = _entities_active[i];
            var e = _entities[ei-1];
            if (e.mapLayer == layer) {
                _entityDraw(e);
                if (e.animate > 0) {
                    if (frame % (GX.frameRate() / e.animate) == 0) {
                        GX.entityFrameNext(ei);
                    }
                }
            }
        }
    }

    function _entityApplyGravity (eid, gravity) {
        if (gravity != undefined) {
            _entities[eid-1].applyGravity = gravity;
            _entities[eid-1].jumpstart = GX.frame();
        }
        return _entities[eid-1].applyGravity;
    }

    function _entityCollisionOffset (eid, left, top, right, bottom) {
        _entities[eid-1].coLeft = left;
        _entities[eid-1].coTop = top;
        _entities[eid-1].coRight = right;
        _entities[eid-1].coBottom = bottom;
    }

    function _entityCollisionOffsetLeft (eid) {
        return _entities[eid-1].coLeft;
    }

    function _entityCollisionOffsetTop (eid) {
        return _entities[eid-1].coTop;
    }

    function _entityCollisionOffsetRight (eid) {
        return _entities[eid-1].coRight;
    }

    function _entityCollisionOffsetBottom (eid) {
        return _entities[eid-1].coBottom;
    }

    // Map methods
    function _mapCreate (columns, rows, layers) {
        _map.columns = columns;
        _map.rows = rows;
        _map.layers = layers;
        _map.version = 2;
        _map.isometric = false;

        var layerSize = rows * columns;
        _map_layers = [];
        for (var i=0; i < layers; i++) {
            _map_layers.push(_mapLayerInit());
        }
        _map_layer_info = [];
        for (var i=0; i < layers; i++) {
            _map_layer_info.push({
                id: i+1,
                hidden: false
            });
        }
    }

    async function _mapLoad(filename) {
        try {
            var file = _vfs.getNode(filename, _vfsCwd);
            if (file && file.type == _vfs.FILE) {
                await _mapLoadV2(filename);
                return;
            }
            else {
                var tmpDir = _vfs.getNode("_gxtmp", _vfs.rootDirectory());
                if (!tmpDir) { tmpDir = _vfs.createDirectory("_gxtmp", _vfs.rootDirectory()); }
                file = _vfs.createFile(crypto.randomUUID(), tmpDir);  
                var res = await fetch(filename);
                _vfs.writeData(file, await res.arrayBuffer());
                await _mapLoadV2(_vfs.fullPath(file));
                _vfs.removeFile(file);
                return;
            }
        }
        catch (ex) {
            // if the load fails try falling back to the older JSON format
            _map_loading = true;
            var data = null;
            var file = _vfs.getNode(filename, _vfsCwd);
            if (file && file.type == _vfs.FILE) {
                data = JSON.parse(_vfs.readText(file));
            }
            else {
                data = await _getJSON(filename);
            }
            var parentPath = filename.substring(0, filename.lastIndexOf("/")+1);
            var imagePath = data.tileset.image.substring(data.tileset.image.lastIndexOf("/")+1); // <<< FIXED LINE
            GX.tilesetCreate(parentPath + imagePath, data.tileset.width, data.tileset.height, data.tileset.tiles, data.tileset.animations);
            GX.mapCreate(data.columns, data.rows, data.layers.length);
            if (data.isometric) {
                GX.mapIsometric(true);
            }
            for (var layer=0; layer < data.layers.length; layer++) {
                for (var row=0; row < GX.mapRows(); row++) {
                    for (var col=0; col < GX.mapColumns(); col++) {
                        GX.mapTile(col, row, layer+1, data.layers[layer][row * GX.mapColumns() + col]);
                    }
                }
            }
            _map_loading = false;
        }
    }

    async function _mapLoadV2(filename) {
        _map_loading = true;
        var vfs = GX.vfs();
        var fh = { file: vfs.getNode(filename, vfs.rootDirectory()), pos: 0 };
        var tmpDir = vfs.getNode("_gxtmp", vfs.rootDirectory());
        if (!tmpDir) { tmpDir = vfs.createDirectory("_gxtmp", vfs.rootDirectory()); }
        var version = readInt(fh);
        var columns = readInt(fh);
        var rows = readInt(fh);
        var layers = readInt(fh);
        var isometric = readInt(fh);
        var slen = readLong(fh);
        var data = vfs.readData(fh.file, fh.pos, slen)
        fh.pos += data.byteLength;
        // write the raw data out and read it back in as a string
        var ldataFile = vfs.createFile("layer.dat", tmpDir);
        vfs.writeData(ldataFile, data);
        ldataFile = vfs.getNode("layer.dat", tmpDir);
        var ldstr = vfs.readText(ldataFile);
        vfs.removeFile(ldataFile, tmpDir);
        // inflate the compressed data and write it to a temp file
        var ldata = pako.inflate(vfs.textToData(ldstr)); // Assuming pako is defined elsewhere or will be provided
        ldataFile = vfs.createFile("layer-i.dat", tmpDir);
        vfs.writeData(ldataFile, ldata);
        // read the data
        ldataFile = vfs.getNode("layer-i.dat", tmpDir);
        ldata = vfs.readData(ldataFile, 0, ldataFile.data.byteLength)
        ldata = new Int16Array(ldata);
        vfs.removeFile(ldataFile, tmpDir);
        // read the tileset data
        var tsVersion = readInt(fh);
        var tsFilename = readString(fh);
        var tsWidth = readInt(fh);
        var tsHeight = readInt(fh);
        var tsSize = readLong(fh);
        data = vfs.readData(fh.file, fh.pos, tsSize);
        var pngFile = vfs.createFile("tileset.png", tmpDir)
        vfs.writeData(pngFile, data);
        fh.pos += data.byteLength;
        fh.pos++; // read the tileset tiles data
        var asize = readInt(fh);
        var tiles = [];
        for (var i=0; i < 4; i++) { readInt(fh); }
        for (var i=1; i <= asize; i++) {
            readInt(fh); // not using id currently
            tiles.push([readInt(fh), readInt(fh), readInt(fh)]);
        }
        // read the tileset animations data
        asize = readInt(fh);
        var animations = [];
        for (var i=0; i < 3; i++) { readInt(fh); }
        for (var i=1; i <= asize; i++) {
            animations.push([readInt(fh), readInt(fh), readInt(fh)]);
        }
        GX.tilesetCreate("/_gxtmp/tileset.png", tsWidth, tsHeight, tiles, animations);
        GX.mapCreate(columns, rows, layers);
        if (isometric) { GX.mapIsometric(true); }
        var li = 0
        for (var l=0; l <= GX.mapLayers(); l++) {
            if (l > 0) { li++; }
            for (var row=0; row < GX.mapRows(); row++) {
                for (var col=0; col < GX.mapColumns(); col++) {
                    if (l > 0) { GX.mapTile(col, row, l, ldata[li]); }
                    li++;
                }
            }
        }
        function readInt(fh) {
            var data = vfs.readData(fh.file, fh.pos, 2);
            var value = (new DataView(data)).getInt16(0, true);
            fh.pos += data.byteLength;
            return value;
        }
        function readLong(fh) {
            var data = vfs.readData(fh.file, fh.pos, 4);
            var value = (new DataView(data)).getInt32(0, true);
            fh.pos += data.byteLength;
            return value;
        }
        function readString(fh) {
            var slen = readLong(fh);
            var data = vfs.readData(fh.file, fh.pos, slen)
            var value = String.fromCharCode.apply(null, new Uint8Array(data))
            fh.pos += data.byteLength;
            return value;
        }
        _map_loading = false;
    }
    
    async function _mapSave (filename) {
        var vfs = GX.vfs();
        var parentPath = vfs.getParentPath(filename);
        filename = vfs.getFileName(filename);
        // create the parent path
        var dirs = parentPath.split("/");
        var parentDir = vfs.rootDirectory();
        for (var i=0; i < dirs.length; i++) {
            if (dirs[i] == "") { continue; }
            var p = vfs.getNode(dirs[i], parentDir);
            if (!p) { p = vfs.getNode(dirs[i], parentDir); }
            parentDir = p;
        }
        var tmpDir = vfs.getNode("_gxtmp", vfs.rootDirectory());
        if (!tmpDir) { tmpDir = vfs.createDirectory("_gxtmp", vfs.rootDirectory()); }
        var file = vfs.createFile(filename, parentDir);
        var fh = { file: file, pos: 0 };
        writeInt(fh, 2); // version
        writeInt(fh, GX.mapColumns());
        writeInt(fh, GX.mapRows());
        writeInt(fh, GX.mapLayers());
        writeInt(fh, GX.mapIsometric());
        var size = (GX.mapLayers() + 1) * GX.mapColumns() * GX.mapRows() + GX.mapLayers();
        var ldata = new ArrayBuffer(size * 2 + 4);
        var dview = new DataView(ldata);
        var li = GX.mapColumns() * GX.mapRows() * 2 + 1;
        for (var l=1; l <= GX.mapLayers(); l++) {
            if (l > 1) { li+=2; }
            for (var row=0; row < GX.mapRows(); row++) {
                for (var col=0; col < GX.mapColumns(); col++) {
                    if (l == 0) { dview.setInt16(li+1, 0, true); }
                    else { dview.setInt16(li+1, GX.mapTile(col, row, l), true); }
                    li+=2;
                }
            }
        }
        var cdata = pako.deflate(ldata); // Assuming pako is defined elsewhere or will be provided
        writeLong(fh, cdata.byteLength);
        vfs.writeData(fh.file, cdata, fh.pos);
        fh.pos += cdata.byteLength;
        // write the tileset data
        writeInt(fh, 2); // version
        writeString(fh, "tileset.gxi");
        writeInt(fh, GX.tilesetWidth());
        writeInt(fh, GX.tilesetHeight());
        // write the tileset png data
        var tsfile = vfs.getNode(_tileset.filename);
        writeLong(fh, tsfile.data.byteLength);
        vfs.writeData(fh.file, tsfile.data, fh.pos); // <<< COMPLETED LINE
        fh.pos += tsfile.data.byteLength;

        function writeInt(fh, value) {
            var data = new ArrayBuffer(2);
            (new DataView(data)).setInt16(0, value, true);
            vfs.writeData(fh.file, data, fh.pos);
            fh.pos += data.byteLength;
        }
        function writeLong(fh, value) {
            var data = new ArrayBuffer(4);
            (new DataView(data)).setInt32(0, value, true);
            vfs.writeData(fh.file, data, fh.pos);
            fh.pos += data.byteLength;
        }
        function writeString(fh, str) {
            writeLong(fh, str.length);
            var data = new ArrayBuffer(str.length);
            var arr = new Uint8Array(data);
            for (var i=0; i < str.length; i++) {
                arr[i] = str.charCodeAt(i);
            }
            vfs.writeData(fh.file, data, fh.pos);
            fh.pos += data.byteLength;
        }
    }

    /* ---------- REPLACEMENT: updated _init() mobile keyboard handling ---------- */
    function _init() {
        _isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
        window.addEventListener("resize", function() {
            // Optional: Handle window resize event if needed
        });

        // Initialize keyboard input
        document.addEventListener("keydown", function(event) {
            // keep existing behavior: ignore global handlers when our hidden input is focused
            if (document.activeElement && document.activeElement.id == "gx-hidden-input") { return; }
            if (event.key != undefined) {
                _pressedKeys[event.key] = true;
            }
            if (_onGameEvent) {
                var e = {};
                e.event = GX.EVENT_KEY_DOWN;
                e.key = event.key;
                _onGameEvent(e);
            }
        });

        document.addEventListener("keyup", function(event) {
            if (document.activeElement && document.activeElement.id == "gx-hidden-input") { return; }
            if (event.key != undefined) {
                _pressedKeys[event.key] = false;
            }
            if (_onGameEvent) {
                var e = {};
                e.event = GX.EVENT_KEY_UP;
                e.key = event.key;
                _onGameEvent(e);
            }
        });

        // Ensure the hidden input exists (created by _showInput on demand); don't require markup.
        // This avoids "not found" warnings and centralizes input behavior.
        (function ensureHiddenInputExists() {
            var hiddenInput = document.getElementById("gx-hidden-input");
            if (!hiddenInput) {
                // create a minimal one; _showInput will fully initialize the handlers
                hiddenInput = document.createElement('input');
                hiddenInput.id = "gx-hidden-input";
                hiddenInput.type = "text";
                hiddenInput.style.display = 'none';
                document.body.appendChild(hiddenInput);
            }
        })();
    }    

    // Public API
    return {
        // Constants
        FONT_DEFAULT: 1,
        FONT_DEFAULT_BLACK: 2,
        BG_STRETCH: 1,
        BG_SCROLL: 2,
        BG_WRAP: 3,
        SCENE_FOLLOW_NONE: 0,
        SCENE_FOLLOW_ENTITY_CENTER: 1,
        SCENE_FOLLOW_ENTITY_CENTER_X: 2,
        SCENE_FOLLOW_ENTITY_CENTER_Y: 3,
        SCENE_FOLLOW_ENTITY_CENTER_X_POS: 4,
        SCENE_FOLLOW_ENTITY_CENTER_X_NEG: 5,
        SCENE_CONSTRAIN_NONE: 0,
        SCENE_CONSTRAIN_TO_MAP: 1,
        ANIMATE_LOOP: 1,
        ANIMATE_SINGLE: 2,
        // Events
        EVENT_INIT: 1,
        EVENT_UPDATE: 2,
        EVENT_DRAWBG: 3,
        EVENT_DRAWMAP: 4,
        EVENT_DRAWSCREEN: 5,
        EVENT_PAINTBEFORE: 6,
        EVENT_PAINTAFTER: 7,
        EVENT_KEY_DOWN: 8,
        EVENT_KEY_UP: 9,
        EVENT_KEY_TYPED: 10,
        EVENT_ANIMATE_COMPLETE: 11,
        // Keys
        KEY_UP: "ArrowUp",
        KEY_DOWN: "ArrowDown",
        KEY_LEFT: "ArrowLeft",
        KEY_RIGHT: "ArrowRight",
        KEY_SPACEBAR: " ",
        KEY_ENTER: "Enter",
        KEY_BACKSPACE: "Backspace",

        // Core / Init
        init: _init,
        registerGameEvents: _registerGameEvents,
        resourcesLoaded: _resourcesLoaded,
        reset: _reset,

        // Scene
        sceneCreate: _sceneCreate,
        sceneResize: _sceneResize,
        sceneScale: _sceneScale,
        sceneStart: _sceneStart,
        sceneStop: _sceneStop,
        sceneDraw: _sceneDraw,
        sceneUpdate: _sceneUpdate,
        sceneFollowEntity: _sceneFollowEntity,
        sceneConstrain: _sceneConstrain,
        sceneMove: _sceneMove,
        scenePos: _scenePos,
        sceneX: _sceneX,
        sceneY: _sceneY,
        sceneWidth: _sceneWidth,
        sceneHeight: _sceneHeight,
        sceneColumns: _sceneColumns,
        sceneRows: _sceneRows,
        sceneActive: _sceneActive, // Exposed scene active state

        // Frame
        frameRate: _frameRate,
        frame: _frame,

        // Input
        keyDown: _keyDown,
        mouseButtons: function(button) { return _mouseButtons[button-1]; },
        mouseWheel: function() { return _mouseWheelFlag; },
        mousePos: function() { return _mousePos; },
        showInput: _showInput,
        hideInput: _hideInput,

        // Images
        imageLoad: _imageLoad,
        image: _image,
        spriteDraw: _spriteDraw,
        spriteDrawScaled: _spriteDrawScaled,

        // Background
        backgroundAdd: _backgroundAdd,
        backgroundWrapFactor: _backgroundWrapFactor, // Corrected reference
        backgroundClear: _backgroundClear,

        // Sound
        soundLoad: _soundLoad,
        soundPlay: _soundPlay,
        soundRepeat: _soundRepeat,
        soundVolume: _soundVolume,
        soundPause: _soundPause,
        soundStop: _soundStop,
        soundStopAll: _soundStopAll,
        soundMuted: _soundMuted,

        // Entity
        entityCreate: _entityCreate,
        screenEntityCreate: _screenEntityCreate,
        entityPos: _entityPos,
        entityMove: _entityMove,
        entityVX: _entityVX,
        entityVY: _entityVY,
        entityVisible: _entityVisible,
        entityX: _entityX,
        entityY: _entityY,
        entityWidth: _entityWidth,
        entityHeight: _entityHeight,
        entityAnimate: _entityAnimate,
        entityAnimateStop: _entityAnimateStop,
        entityAnimateMode: _entityAnimateMode,
        entityFrameNext: _entityFrameNext,
        entityFrameSet: _entityFrameSet,
        entityFrame: _entityFrame,
        entitySequence: _entitySequence,
        entitySequences: _entitySequences,
        entityFrames: _entityFrames,
        entityType: _entityType,
        entityMapLayer: _entityMapLayer,
        entityApplyGravity: _entityApplyGravity,
        entityCollisionOffset: _entityCollisionOffset,
        entityCollisionOffsetLeft: _entityCollisionOffsetLeft,
        entityCollisionOffsetTop: _entityCollisionOffsetTop,
        entityCollisionOffsetRight: _entityCollisionOffsetRight,
        entityCollisionOffsetBottom: _entityCollisionOffsetBottom,

        // Map
        mapCreate: _mapCreate,
        mapLoad: _mapLoad,
        mapSave: _mapSave,
        mapColumns: function() { return _map.columns; },
        mapRows: function() { return _map.rows; },
        mapLayers: function() { return _map.layers; },
        mapIsometric: _mapIsometric,
        mapDraw: _mapDraw,
        mapTile: _mapTile,
        mapTileId: _mapTileId,
        mapTilePos: _mapTilePos,
        mapClear: _mapClear,

        // Tileset
        tilesetCreate: _tilesetCreate,
        tilesetWidth: function() { return _tileset.width; },
        tilesetHeight: function() { return _tileset.height; },
        tilesetTileType: _tilesetTileType,
        tilesetTileId: _tilesetTileId,

        // Misc
        gravity: function() { return _gravity; },
        terminalVelocity: function() { return _terminal_velocity; },
        vfs: function() { return _vfs; },
        debug: function(enabled, font) {
            if (enabled != undefined) { __debug.enabled = enabled; }
            if (font != undefined) { __debug.font = font; }
            return _qbBoolean(__debug.enabled);
        },
    }
}
    
// Consider moving these to separate optional js files
var GXSTR = new function() {
    this.lPad = function(str, padChar, padLength) {
        return String(str).padStart(padLength, padChar);
    }
    
    this.rPad = function(str, padChar, padLength) {
        return String(str).padEnd(padLength, padChar);
    }

    this.replace = function(str, findStr, replaceStr) {
        return String(str).replaceAll(findStr, replaceStr);
    }
};

GX.init();
