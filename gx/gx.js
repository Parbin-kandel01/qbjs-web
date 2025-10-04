var GX = new function() {
    // --- Internal VFS and Pako definitions (moved inside GX to prevent global conflicts) ---
    // Example VFS (Virtual File System) - You'll need a full implementation for this to work.
    // This is a placeholder to prevent 'VFS is not defined' errors if you don't have one.
    function VFS() {
        this.rootDirectory = function() { return { name: '/', type: 'directory', children: [] }; };
        this.getNode = function(path, cwd) {
            // Minimal placeholder logic for map loading to avoid errors
            if (path && path.includes("_gxtmp")) return { name: "_gxtmp", type: 'directory', children: [] };
            if (path && path.includes("layer.dat")) return { name: "layer.dat", type: 'file', data: new ArrayBuffer(0), byteLength: 0 };
            if (path && path.includes("layer-i.dat")) return { name: "layer-i.dat", type: 'file', data: new ArrayBuffer(0), byteLength: 0 };
            if (path && path.includes("tileset.png")) return { name: "tileset.png", type: 'file', data: new ArrayBuffer(0), byteLength: 0 };
            // For actual files, you'd need a proper VFS implementation
            return null;
        };
        this.createDirectory = function(name, parent) { return { name: name, type: 'directory', children: [] }; };
        this.createFile = function(name, parent) { return { name: name, type: 'file', data: new ArrayBuffer(0), byteLength: 0 }; };
        this.writeData = function(file, data, offset = 0) { file.data = data; file.byteLength = data.byteLength; };
        this.readText = function(file) { return new TextDecoder().decode(file.data); };
        this.readData = function(file, offset, length) { return file.data.slice(offset, offset + length); };
        this.textToData = function(text) { return new TextEncoder().encode(text).buffer; };
        this.removeFile = function(file, parent) { };
        this.getDataURL = async function(file) { return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; }; // Placeholder
        this.getParentPath = function(filename) { return ''; };
        this.getFileName = function(filename) { return filename; };
        this.fullPath = function(file) { return file.name; };
    }

    // Example pako (compression library) - You'll need to include the actual pako library.
    // This is a placeholder to prevent 'pako is not defined' errors.
    const pako = {
        inflate: function(data) { return data; }, // No actual inflation
        deflate: function(data) { return data; }  // No actual deflation
    };
    // --- End of internal VFS and Pako definitions ---


    var _canvas = null;
	var _ctx = null;
    var _framerate = 60;
    var _bg = [];
    var _images = [];
    var _entities = [];
    var _entities_active = [];
    var _entity_animations = [];
    var _scene = { // Initialize _scene with default properties to prevent undefined errors
        width: 0, height: 0, x: 0, y: 0,
        scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0,
        frame: 0, followMode: 0, followEntity: null,
        constrainMode: 0, active: false,
        columns: 0, rows: 0 // Added for _updateSceneSize
    };
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
        font: 1, // GX.FONT_DEFAULT
        tileBorderColor: undefined, // Initialize debug properties
        entityBorderColor: undefined,
        entityCollisionColor: undefined
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

    var _vfs = new VFS(); // Now VFS is defined within this scope
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
        _scene = { // Re-initialize _scene on reset
            width: 0, height: 0, x: 0, y: 0,
            scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0,
            frame: 0, followMode: 0, followEntity: null,
            constrainMode: 0, active: false,
            columns: 0, rows: 0
        };
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
            font: 1, // GX.FONT_DEFAULT
            tileBorderColor: undefined,
            entityBorderColor: undefined,
            entityCollisionColor: undefined
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

            _canvas.addEventListener("touchmove", function(event) {
                event.preventDefault();
                var touch = event.touches[0];
                var rect = event.target.getBoundingClientRect();
                _touchPos.x = touch.pageX - rect.x;
                _touchPos.y = touch.pageY - rect.y;
                _touchInputFlag = true;
                if (_bindTouchToMouse) {
                    _mousePos = _touchPos;
                    _mouseInputFlag = true;
                }
            });
    
            _canvas.addEventListener("touchstart", function(event) {
                event.preventDefault();
                var touch = event.touches[0];
                var rect = event.target.getBoundingClientRect();
                _touchPos.x = touch.pageX - rect.x;
                _touchPos.y = touch.pageY - rect.y;
                _touchInputFlag = true;
                if (_bindTouchToMouse) {
                    _mouseButtons[0] = -1;
                    _mouseInputFlag = true;
                    _mousePos = _touchPos;
                }
            });
    
            _canvas.addEventListener("touchend", function(event) {
                event.preventDefault();
                _touchInputFlag = false;
                if (_bindTouchToMouse) {
                    _mouseButtons[0] = 0;
                    _mouseInputFlag = true;
                }
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
        _scene.active = false; // Ensure active is set

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
            if (e && !e.screen) { // Check if entity 'e' exists
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
            if (e && e.screen) { // Check if entity 'e' exists
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
        // Ensure _ctx and _image(i) are valid
        if (!_ctx || !(_image(i) instanceof HTMLImageElement)) {
            console.warn("Cannot draw sprite: invalid context or image.", {imageID: i, image: _image(i)});
            return;
        }
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

    function _backgroundWrapFactor(bi, wrapFactor) {
        if (_bg[bi-1]) { // Check if background exists
            _bg[bi-1].wrapFactor = wrapFactor;
        }
    }

    function _backgroundDraw (bi) {
        bi--;
        if (!_bg[bi] || !_image(_bg[bi].image)) { // Check if background and its image exist
            return;
        }

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
        if (_sounds[sid-1]) { // Check if sound exists before pausing
            _sounds[sid-1].pause();
            _sounds[sid-1] = undefined;
        }
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
        if (!GX.soundMuted() && _sounds[sid-1]) { // Check if sound exists
            _sounds[sid-1].loop = false;
            _sounds[sid-1].play();
        }
    }

    function _soundRepeat (sid) {
        if (!GX.soundMuted() && _sounds[sid-1]) { // Check if sound exists
            _sounds[sid-1].loop = true;
            _sounds[sid-1].play();
        }
    }

    function _soundVolume (sid, v) {
        if (_sounds[sid-1]) { // Check if sound exists
            _sounds[sid-1].volume = v / 100;
        }
    }

    function _soundPause (sid) {
        if (_sounds[sid-1]) { // Check if sound exists
            _sounds[sid-1].pause();
        }
    }

    function _soundStop (sid) {
        if (_sounds[sid-1]) { // Check if sound exists
            _sounds[sid-1].pause();
            _sounds[sid-1].currentTime = 0;
        }
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
            // Ensure _images[newent.image-1] exists before accessing its properties
            if (_images[newent.image-1]) {
                newent.sequences = Math.floor(_images[newent.image-1].height / height);
            }
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
        // newent.sequences = 0; // This line seems to reset sequences after it's potentially set by imageLoad callback
        newent.mapLayer = 0;
        newent.screen = false; // Initialize screen property

        _entities.push(newent);
        
        var animation = [];
        _entity_animations.push(animation);
        
        return _entities.length;
    }
    
    function _screenEntityCreate (imageFilename, ewidth, height, seqFrames, uid) {
        var eid = _entityCreate(imageFilename, ewidth, height, seqFrames, uid);
        if (_entities[eid-1]) { // Ensure entity exists
            _entities[eid-1].screen = true;
        }
        return eid;
    }

    function _entityDraw (ent) {
        if (!ent || ent.hidden) { return; } // Check if ent exists
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
        if (!_entities[eid-1]) return; // Ensure entity exists
        _entities[eid-1].animate = a;
        _entities[eid-1].spriteSeq = seq;
        _entities[eid-1].seqFrames = _entityGetFrames(eid, seq);
        _entities[eid-1].prevFrame = -1;
        if (_entities[eid-1].spriteFrame > _entities[eid-1].seqFrames) {
            _entities[eid-1].spriteFrame = 1;
        }
    }

    function _entityGetFrames (eid, seq) {
        if (!_entities[eid-1]) return 0; // Ensure entity exists
        var a = _entity_animations[eid-1];
        if (a && a[seq-1] != undefined) { // Check if animation sequence exists
            return a[seq-1].frames;
        }
        else {
            return _entities[eid-1].seqFrames;
        }
    }

    function _entityAnimateStop (eid) {
        if (!_entities[eid-1]) return; // Ensure entity exists
        _entities[eid-1].animate = 0;
    }

    function _entityAnimateMode (eid, mode) {
        if (!_entities[eid-1]) return 0; // Ensure entity exists
        if (mode != undefined) {
        	_entities[eid-1].animateMode = mode;
        }
        return _entities[eid-1].animateMode;
    }

    function _entityMove (eid, x, y) {
        if (eid == undefined || eid < 1 || !_entities[eid-1]) { return; } // Ensure entity exists
        _entities[eid-1].x += x;
        _entities[eid-1].y += y;
    }

	function _entityPos (eid, x, y) {
        if (!_entities[eid-1]) return; // Ensure entity exists
        _entities[eid-1].x = x;
        _entities[eid-1].y = y;
    }

    function _entityVX (eid, vx) {
        if (!_entities[eid-1]) return 0; // Ensure entity exists
        if (vx != undefined) {
            _entities[eid-1].vx = vx;
        }
        return _entities[eid-1].vx;
    }

    function _entityVY (eid, vy) {
        if (!_entities[eid-1]) return 0; // Ensure entity exists
        if (vy != undefined) {
        	_entities[eid-1].vy = vy;
        }
        return _entities[eid-1].vy;
    }

    function _entityVisible (eid, visible) {
        if (!_entities[eid-1]) return 0; // Ensure entity exists
        if (visible != undefined) {
            _entities[eid-1].hidden = !visible;
        }
        return _qbBoolean(!_entities[eid-1].hidden);
    }

    function _entityX (eid) { return _entities[eid-1] ? _entities[eid-1].x : 0; } // Add checks
    function _entityY (eid) { return _entities[eid-1] ? _entities[eid-1].y : 0; }
    function _entityWidth (eid) { return _entities[eid-1] ? _entities[eid-1].width : 0; }
    function _entityHeight (eid) { return _entities[eid-1] ? _entities[eid-1].height : 0; }
    
    function _entityFrameNext (eid) {
        if (!_entities[eid-1]) return; // Ensure entity exists
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
        if (!_entities[eid-1]) return; // Ensure entity exists
        _entities[eid-1].spriteSeq = seq;
        _entities[eid-1].seqFrames = _entityGetFrames(eid, seq);
        _entities[eid-1].spriteFrame = frame;
        _entities[eid-1].prevFrame = frame - 1;
    }

    function _entityFrame (eid) {
        return _entities[eid-1] ? _entities[eid-1].spriteFrame : 0;
    }

    function _entitySequence (eid) {
        return _entities[eid-1] ? _entities[eid-1].spriteSeq : 0;
    }

    function _entitySequences (eid) {
        return _entities[eid-1] ? _entities[eid-1].sequences : 0;
    }

    function _entityFrames (eid, seq, frames) {
        if (!_entities[eid-1]) return 0; // Ensure entity exists
        // console.log(eid + ":" + seq + ":" + frames); // Removed console.log for cleaner code
        if (frames != undefined) {
            // Ensure _entity_animations[eid-1] exists and is an array
            if (!_entity_animations[eid-1]) {
                _entity_animations[eid-1] = [];
            }
            _entity_animations[eid-1][seq-1] = { frames: frames };
        }
        return _entityGetFrames(eid, seq);
    }

    function _entityType (eid, etype) {
        if (!_entities[eid-1]) return undefined; // Ensure entity exists
        if (etype != undefined) {
        	_entities[eid-1].type = etype;
        }
        return _entities[eid-1].type
	}

    function _entityMapLayer (eid, layer) {
        if (!_entities[eid-1]) return 0; // Ensure entity exists
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
            if (e && e.mapLayer == layer) { // Check if entity 'e' exists
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
        if (!_entities[eid-1]) return false; // Ensure entity exists
        if (gravity != undefined) {
            _entities[eid-1].applyGravity = gravity;
            _entities[eid-1].jumpstart = GX.frame();
        }
        return _entities[eid-1].applyGravity;
    }

    function _entityCollisionOffset (eid, left, top, right, bottom) {
        if (!_entities[eid-1]) return; // Ensure entity exists
        _entities[eid-1].coLeft = left;
        _entities[eid-1].coTop = top;
        _entities[eid-1].coRight = right;
        _entities[eid-1].coBottom = bottom;
    }

    function _entityCollisionOffsetLeft (eid) {
        return _entities[eid-1] ? _entities[eid-1].coLeft : 0;
    }

    function _entityCollisionOffsetTop (eid) {
        return _entities[eid-1] ? _entities[eid-1].coTop : 0;
    }

    function _entityCollisionOffsetRight (eid) {
        return _entities[eid-1] ? _entities[eid-1].coRight : 0;
    }

    function _entityCollisionOffsetBottom (eid) {
        return _entities[eid-1] ? _entities[eid-1].coBottom : 0;
    }

    // Map methods
    function _mapCreate (columns, rows, layers) {
        _map.columns = columns;
        _map.rows = rows;
        _map.layers = layers;
        _map.version = 2;
        _map.isometric = false;

        // var layerSize = rows * columns; // This variable is not used
        _map_layers = [];
        for (var i=0; i < layers; i++) {
            _map_layers.push(_mapLayerInit(columns, rows)); // Pass columns and rows to init
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
            console.warn("MapLoadV2 failed, attempting JSON fallback:", ex); // Added warning
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
            var imagePath = data.tileset.image.substring(data.tileset.image.lastIndexOf("/")+1);
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
        var fh = { 
            file: vfs.getNode(filename, vfs.rootDirectory()), 
            pos: 0 
        };
    
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
        var tsVersion = readInt(fh); // tsVersion is unused
        var tsFilename = readString(fh); // tsFilename is unused
        var tsWidth = readInt(fh);
        var tsHeight = readInt(fh);
        var tsSize = readLong(fh);
        
        data = vfs.readData(fh.file, fh.pos, tsSize);
        var pngFile = vfs.createFile("tileset.png", tmpDir)
        vfs.writeData(pngFile, data);
        fh.pos += data.byteLength;
    
        fh.pos++;
        
        // read the tileset tiles data
        var asize = readInt(fh);
        var tiles = [];
        for (var i=0; i < 4; i++) { readInt(fh); } // These reads are unused
        for (var i=1; i <= asize; i++) {
            readInt(fh); // not using id currently
            tiles.push([readInt(fh), readInt(fh), readInt(fh)]);
        }
    
        // read the tileset animations data
        asize = readInt(fh);
        var animations = [];
        for (var i=0; i < 3; i++) { readInt(fh); } // These reads are unused
        for (var i=1; i <= asize; i++) {
            animations.push([readInt(fh), readInt(fh), readInt(fh)]);
        }
    
        GX.tilesetCreate("/_gxtmp/tileset.png", tsWidth, tsHeight, tiles, animations);
        GX.mapCreate(columns, rows, layers);
        if (isometric) {
            GX.mapIsometric(true);
        }
        var li = 0
        for (var l=0; l <= GX.mapLayers(); l++) {
            if (l > 0) { li++; }
            for (var row=0; row < GX.mapRows(); row++) {
                for (var col=0; col < GX.mapColumns(); col++) {
                    if (l > 0) {
                        // Ensure ldata[li] is a valid index
                        if (li < ldata.length) {
                            GX.mapTile(col, row, l, ldata[li]);
                        } else {
                            console.warn(`_mapLoadV2: ldata index out of bounds at li=${li}`);
                            GX.mapTile(col, row, l, 0); // Default to empty tile
                        }
                    }
                    li++;
                }
            }
        }
        
        function readInt(fh) {
            if (!fh.file || fh.pos + 2 > fh.file.data.byteLength) { // Check bounds
                console.error("Attempted to read Int out of file bounds.");
                return 0;
            }
            var data = vfs.readData(fh.file, fh.pos, 2);
            var value = (new DataView(data)).getInt16(0, true);
            fh.pos += data.byteLength;
            return value;
        }
        
        function readLong(fh) {
            if (!fh.file || fh.pos + 4 > fh.file.data.byteLength) { // Check bounds
                console.error("Attempted to read Long out of file bounds.");
                return 0;
            }
            var data = vfs.readData(fh.file, fh.pos, 4);
            var value = (new DataView(data)).getInt32(0, true);
            fh.pos += data.byteLength;
            return value;
        }
        
        function readString(fh) {
            var slen = readLong(fh);
            if (!fh.file || fh.pos + slen > fh.file.data.byteLength) { // Check bounds
                console.error("Attempted to read String out of file bounds.");
                return "";
            }
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
            if (!p) { p = vfs.createDirectory(dirs[i], parentDir); } // Create if not found
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
        
        var size = (GX.mapLayers() || 0) * (GX.mapColumns() || 0) * (GX.mapRows() || 0); // Corrected size calculation, added checks
        var ldata = new ArrayBuffer(size * 2); // Each tile is Int16 (2 bytes)
        var dview = new DataView(ldata);
        var li = 0; // Index for dview
        for (var l=1; l <= GX.mapLayers(); l++) {
            for (var row=0; row < GX.mapRows(); row++) {
                for (var col=0; col < GX.mapColumns(); col++) {
                    dview.setInt16(li, GX.mapTile(col, row, l), true);
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
        var tsfile = _vfs.getNode(_tileset.filename, _vfsCwd); // Use _vfs.getNode with current working directory
        if (tsfile && tsfile.data) { // Ensure tsfile and its data exist
            writeLong(fh, tsfile.data.byteLength);
            vfs.writeData(fh.file, tsfile.data, fh.pos);
            fh.pos += tsfile.data.byteLength;
        } else {
            writeLong(fh, 0); // Write 0 if no tileset image data
            console.warn("Tileset image data not found for saving.");
        }
        fh.pos++; // This seems to be for padding or a separator

        // write the tileset tiles data  
        writeInt(fh, _tileset_tiles.length);
        for (var i=0; i < 4; i++) { writeInt(fh, 0); } // These are unused padding bytes
        for (var i=0; i < _tileset_tiles.length; i++) {
            writeInt(fh, 0); // Unused ID
            writeInt(fh, _tileset_tiles[i].animationId);
            writeInt(fh, _tileset_tiles[i].animationSpeed);
            writeInt(fh, _tileset_tiles[i].animationFrame);
        }

        // write the tileset animations data
        writeInt(fh, _tileset_animations.length);
        for (var i=0; i < 3; i++) { writeInt(fh, 0); } // Unused padding bytes
        for (var i=0; i < _tileset_animations.length; i++) {
            writeInt(fh, _tileset_animations[i].tileId);
            writeInt(fh, _tileset_animations[i].firstFrame);
            writeInt(fh, _tileset_animations[i].nextFrame);
        }
        
        function writeInt(fh, value) {
            var data = new Int16Array([value]).buffer;
            vfs.writeData(fh.file, data, fh.pos);
            fh.pos = fh.pos + data.byteLength
        }
        
        function writeLong(fh, value) {
            var data = new Int32Array([value]).buffer; 
            vfs.writeData(fh.file, data, fh.pos);
            fh.pos = fh.pos + data.byteLength
        }
        
        function writeString(fh, value) {
            var slen = value.length;
            writeLong(fh, slen);
            var data = vfs.textToData(value);
            vfs.writeData(fh.file, data, fh.pos);
            fh.pos = fh.pos + data.byteLength
        }
    }
    
    function _getJSON(url) {
        return fetch(url)
            .then((response)=>response.json())
            .then((responseJson)=>{return responseJson});
    }

    function _mapLayerInit(cols, rows) {
        // Use provided cols/rows or fallback to _map properties
        cols = cols !== undefined ? cols : _map.columns;
        rows = rows !== undefined ? rows : _map.rows;

        if (cols === undefined || rows === undefined || cols < 1 || rows < 1) {
            console.error("Invalid columns or rows for _mapLayerInit:", cols, rows);
            return []; // Return empty array to prevent further errors
        }

        var layerSize = rows * cols;
        var layerData = [];
        for (var i=0; i < layerSize; i++) {
            layerData.push({ tile: 0});
        }
        return layerData;
    }

    function _mapColumns() { return _map.columns || 0; } // Default to 0 if undefined
    function _mapRows() { return _map.rows || 0; }
    function _mapLayers() { return _map.layers || 0; }

    function _mapLayerVisible(layer, visible) {
        if (layer < 1 || layer > _map_layer_info.length) return 0; // Check bounds
        if (visible != undefined) {
            _map_layer_info[layer-1].hidden = !visible;
        }
        return _qbBoolean(!_map_layer_info[layer-1].hidden);
    }

    function _mapIsometric(iso) {
        if (iso != undefined) {
            _map.isometric = iso;
            _updateSceneSize();
        }
        return _qbBoolean(_map.isometric);
    }

    function _mapLayerAdd() {
        _map.layers = (_map.layers || 0) + 1; // Ensure _map.layers is initialized
        _map_layer_info.push({
            id: _map.layers,
            hidden: false
        });
        _map_layers.push(_mapLayerInit());
    }

    function _mapLayerInsert (beforeLayer) {
        if (beforeLayer < 1 || beforeLayer > GX.mapLayers()) { return; }

        GX.mapLayerAdd();
        for (var layer = GX.mapLayers(); layer > beforeLayer; layer--) {
            // Ensure source layer exists before copying
            if (_map_layers[layer - 2]) {
                _map_layers[layer-1] = structuredClone(_map_layers[layer - 2]); // Use structuredClone for deep copy
            } else {
                _map_layers[layer-1] = _mapLayerInit(); // Initialize if source is missing
            }
        }
        _map_layers[beforeLayer-1] = _mapLayerInit();
    }

    function _mapLayerRemove (removeLayer) {
        if (removeLayer < 1 || removeLayer > GX.mapLayers() || GX.mapLayers() < 2) { return; } // Use GX.mapLayers()

        _map_layer_info.splice(removeLayer - 1, 1); // Remove from info array
        _map_layers.splice(removeLayer - 1, 1); // Remove from data array
        _map.layers = GX.mapLayers() - 1; // Update count
        // Re-index layer IDs after removal
        for (let i = 0; i < _map_layer_info.length; i++) {
            _map_layer_info[i].id = i + 1;
        }
    }

    function _mapResize (columns, rows) {
        var tempMap = structuredClone(_map_layers);
        _map_layers = new Array(GX.mapLayers());

        var maxColumns = Math.min(columns, GX.mapColumns());
        var maxRows = Math.min(rows, GX.mapRows());

        for (var layer = 1; layer <= GX.mapLayers(); layer++) {
            _map_layers[layer-1] = _mapLayerInit(columns, rows);
            for (var row = 0; row < maxRows; row++) {
                for (var column = 0; column < maxColumns; column++) {
                    // Check if tempMap[layer-1] and its elements exist
                    if (tempMap[layer-1] && tempMap[layer-1][row * GX.mapColumns() + column]) {
                        _map_layers[layer-1][row * columns + column].tile = tempMap[layer-1][row * GX.mapColumns() + column].tile;
                    }
                }
            }
        }

        _map.columns = columns;
        _map.rows = rows;
        _updateSceneSize(); // Update scene columns/rows based on new map size
    }

    function _mapDraw() {
        if (_mapRows() < 1 || _mapColumns() < 1) { return; } // Check for valid map dimensions

        var tpos = {};
        var srow, scol, row, col;
        var layer;
        var yoffset, prow;
        var t, tx, ty;
        var rowOffset;
        var colOffset;

        var xoffset = GX.sceneX() % GX.tilesetWidth();
        var pcol = Math.floor(GX.sceneX() / GX.tilesetWidth());
        if (GX.mapIsometric()) {
            prow = Math.floor(GX.sceneY() / (GX.tilesetWidth() / 4));
            yoffset = GX.sceneY() % (GX.tilesetWidth() / 4);
        } else {
            prow = Math.floor(GX.sceneY() / GX.tilesetHeight());
            yoffset = GX.sceneY() % GX.tilesetHeight();
        }

        for (var li = 1; li <= GX.mapLayers(); li++) {
            if (_map_layer_info[li-1] && !_map_layer_info[li-1].hidden) { // Check if layer info exists
                layer = _map_layer_info[li-1].id;

                srow = 0;
                rowOffset = 0;

                // Iterate over visible rows and columns, adding +1 for partial tiles at edges
                for (row = prow; row <= prow + GX.sceneRows() + 1; row++) {
                    scol = 0;
                    if (!GX.mapIsometric()) {
                        colOffset = 0;
                    } else {
                        colOffset = 0;
                        if (row % 2 == 0) { colOffset = GX.tilesetWidth() / 2; }
                    }

                    if (GX.mapIsometric()) {
                        rowOffset = (row - prow + 1) * (GX.tilesetHeight() - GX.tilesetWidth() / 4);
                    }

                    for (col = pcol; col <= pcol + GX.sceneColumns() + 1; col++) {
                        t = GX.mapTile(col, row, layer);
                        if (t > 0) {
                            // var t1 = t; // t1 is unused
                            t = _tileFrame(t);
                            GX.tilesetPos(t, tpos);
                            tx = Math.floor(scol * GX.tilesetWidth() - xoffset - colOffset);
                            ty = Math.floor(srow * GX.tilesetHeight() - yoffset - rowOffset);
                            GX.spriteDraw(GX.tilesetImage(), tx, ty, tpos.y, tpos.x, GX.tilesetWidth(), GX.tilesetHeight());
                        }
                        scol = scol + 1;
                    }
                    srow = srow + 1;
                }
            }
            _drawEntityLayer(li);
        }

        // Animate tileset tiles
        for (t = 1; t <= GX.tilesetColumns() * GX.tilesetRows(); t++) {
            _tileFrameNext(t);
        }
    }

    function _mapTilePosAt (x, y, tpos) {
        if (!tpos) { tpos = {x:0, y:0}; } // Ensure tpos is an object
        if (!GX.mapIsometric()) {
            tpos.x = Math.floor((x + GX.sceneX()) / GX.tilesetWidth());
            tpos.y = Math.floor((y + GX.sceneY()) / GX.tilesetHeight());
        } else {
            var tileWidthHalf = GX.tilesetWidth() / 2;
            var tileHeightHalf = GX.tilesetHeight() / 2;
            // Prevent division by zero if tileHeightHalf is 0
            if (tileHeightHalf === 0) {
                tpos.y = 0;
            } else {
                tpos.y = (2 * y) / tileHeightHalf;
            }
            
            var sx = x / tileWidthHalf;

            var offset = 0;
            if (sx % 2 == 1) {
                offset = tileWidthHalf;
            }
            // Prevent division by zero if GX.tilesetWidth() is 0
            if (GX.tilesetWidth() === 0) {
                tpos.x = 0;
            } else {
                tpos.x = (x - offset) / GX.tilesetWidth();
            }
        }
        return tpos; // Return tpos for convenience
    }

    function _mapTile (col, row, layer, tile) {
        if (col < 0 || col >= GX.mapColumns() || row < 0 || row >= GX.mapRows() || layer < 1 || layer > GX.mapLayers()) { return 0; } // Added layer < 1 check
        var mpos = row * GX.mapColumns() + col;
        if (tile !== undefined) { // Use !== undefined to allow setting tile 0
            if (_map_layers[layer-1] && _map_layers[layer-1][mpos]) { // Check if layer and tile position exist
                _map_layers[layer-1][mpos].tile = tile;
            } else {
                console.warn(`_mapTile: Attempted to set tile at invalid position (col=${col}, row=${row}, layer=${layer})`);
            }
        }
        return _map_layers[layer-1] && _map_layers[layer-1][mpos] ? _map_layers[layer-1][mpos].tile : 0; // Return 0 if not found
    }

    function _mapVersion() {
        return _map.version || 0; // Default to 0 if undefined
    }

    // Tileset Methods
    async function _tilesetCreate (tilesetFilename, tileWidth, tileHeight, tiles, animations) {
        await GX.tilesetReplaceImage(tilesetFilename, tileWidth, tileHeight);

        _tileset_tiles = [];
        if (tiles != undefined) {
            for (var i=0; i < tiles.length; i++) {
                var tile = tiles[i];
                _tileset_tiles.push({
                    id: i+1,
                    animationId: tile[0],
                    animationSpeed: tile[1],
                    animationFrame: tile[2]
                });
            }
        }
        else {
            // Ensure tilesetColumns and tilesetRows are valid before loop
            const numTiles = (GX.tilesetColumns() || 0) * (GX.tilesetRows() || 0);
            for (var i=0; i < numTiles; i++) {
                _tileset_tiles.push({
                    id: i+1,
                    animationId: 0,
                    animationSpeed: 0,
                    animationFrame: 0
                });
            }
        }

        _tileset_animations = [];
        if (animations != undefined) {
            for (var i=0; i < animations.length; i++) {
                var animation = animations[i];
                _tileset_animations.push({
                    tileId: animation[0],
                    firstFrame: animation[1],
                    nextFrame: animation[2]
                });
            }
        }
    }

    async function _tilesetReplaceImage (tilesetFilename, tilewidth, tileheight) {
        _tileset.filename = tilesetFilename;
        _tileset.width = tilewidth;
        _tileset.height = tileheight;
        var imgLoaded = false;
        _tileset.image = _imageLoad(tilesetFilename, function(img) {
            // Ensure img.width and img.height are valid before division
            _tileset.columns = (img.width && GX.tilesetWidth() > 0) ? img.width / GX.tilesetWidth() : 0;
            _tileset.rows = (img.height && GX.tilesetHeight() > 0) ? img.height / GX.tilesetHeight() : 0;
            _updateSceneSize();
            imgLoaded = true;
        });
        var waitMillis = 0;
        while (!imgLoaded && waitMillis < 3000) {
            await GX.sleep(10);
            waitMillis += 10;
        }
    }

    function _tilesetPos (tilenum, p) {
        if (!p) { p = {x:0, y:0}; } // Ensure p is an object
        if (GX.tilesetColumns() == 0) {
            p.x = 0;
            p.y = 0;
        } else {
            p.y = Math.floor((tilenum - 1) / GX.tilesetColumns());
            p.y = p.y + 1;
            p.x = (tilenum - 1) % GX.tilesetColumns() + 1;
        }
        return p; // Return p for convenience
    }

    function _tilesetWidth() { return _tileset.width || 0; }
    function _tilesetHeight() { return _tileset.height || 0; }
    function _tilesetColumns() { return _tileset.columns || 0; }
    function _tilesetRows() { return _tileset.rows || 0; }
    function _tilesetFilename() { return _tileset.filename; }
    function _tilesetImage() { return _tileset.image; }

    function _tilesetAnimationCreate (tileId, animationSpeed) {
        if (tileId < 1 || tileId > _tileset_tiles.length) { return; } // Check bounds
        var frameId = _tileset_animations.length;
        _tileset_animations[frameId] = { tileId: 0, firstFrame: 0, nextFrame: 0 };
        _tileset_animations[frameId].tileId = tileId;
        _tileset_animations[frameId].firstFrame = frameId + 1;
        _tileset_tiles[tileId-1].animationId = frameId + 1;
        _tileset_tiles[tileId-1].animationSpeed = animationSpeed;
    }

    function _tilesetAnimationAdd (firstTileId, addTileId) {
        if (firstTileId < 1 || firstTileId > _tileset_tiles.length) { return; } // Check bounds
        var firstFrame = _tileset_tiles[firstTileId-1].animationId;
        if (firstFrame === 0) { // If first tile has no animation, create one
            _tilesetAnimationCreate(firstTileId, 1); // Default speed 1
            firstFrame = _tileset_tiles[firstTileId-1].animationId;
        }

        var lastFrame  = firstFrame;
        // Ensure _tileset_animations[lastFrame-1] exists before accessing nextFrame
        while (_tileset_animations[lastFrame-1] && _tileset_animations[lastFrame-1].nextFrame > 0) {
            lastFrame = _tileset_animations[lastFrame-1].nextFrame;
        }

        var frameId = _tileset_animations.length;
        _tileset_animations[frameId] = { tileId: 0, firstFrame: 0, nextFrame: 0 };
        _tileset_animations[frameId].tileId = addTileId;
        _tileset_animations[frameId].firstFrame = firstFrame;
        if (_tileset_animations[lastFrame-1]) { // Ensure lastFrame-1 exists
            _tileset_animations[lastFrame-1].nextFrame = frameId + 1;
        }
    }

    function _tilesetAnimationRemove (firstTileId) {
        if (firstTileId < 1 || firstTileId > _tileset_tiles.length) { return; } // Check bounds
        _tileset_tiles[firstTileId-1].animationId = 0;
        // Note: This doesn't clean up _tileset_animations array, just breaks the chain.
        // A more robust implementation might re-index or remove unused animation frames.
    }

    function _tilesetAnimationFrames (tileId, tileFrames /* QB Array */) {
        if (tileId < 0 || tileId > GX.tilesetRows() * GX.tilesetColumns() || tileId > _tileset_tiles.length) { return 0; } // Check bounds

        GX.resizeArray(tileFrames, [{l:0,u:0}], 0);
        var frameCount = 0;
        var frame = _tileset_tiles[tileId-1].animationId;
        while (frame > 0 && _tileset_animations[frame-1]) { // Check if animation frame exists
            frameCount = frameCount + 1
            GX.resizeArray(tileFrames, [{l:0,u:frameCount}], 0, true);
            GX.arrayValue(tileFrames, [frameCount]).value = _tileset_animations[frame-1].tileId;
            frame = _tileset_animations[frame-1].nextFrame;
            if (frameCount > 1000) { // Prevent infinite loop for malformed animations
                console.warn("Tileset animation loop detected or too long for tileId:", tileId);
                break;
            }
        }
        return frameCount;
    }

    function _tilesetAnimationSpeed (tileId, speed) {
        if (tileId < 1 || tileId > _tileset_tiles.length) { return 0; } // Check bounds
        if (speed != undefined) {
            _tileset_tiles[tileId-1].animationSpeed = speed;
        }
        return _tileset_tiles[tileId-1].animationSpeed;
    }

    function _tileFrame (tileId) {
        if (tileId < 0 || tileId > _tileset_tiles.length || !_tileset_tiles[tileId-1]) { return tileId; } // Check bounds and existence
        if (_tileset_tiles[tileId-1].animationId == 0) { return tileId; }

        var currFrame = _tileset_tiles[tileId-1].animationId;
        if (_tileset_tiles[tileId-1].animationFrame > 0) {
            currFrame = _tileset_tiles[tileId-1].animationFrame;
        }
        
        // Ensure _tileset_animations[currFrame-1] exists
        return _tileset_animations[currFrame-1] ? _tileset_animations[currFrame-1].tileId : tileId;
    }

    function _tileFrameNext (tileId) {
        if (tileId < 0 || tileId > _tileset_tiles.length || !_tileset_tiles[tileId-1]) { return; } // Check bounds and existence
        if (_tileset_tiles[tileId-1].animationId == 0) { return; }

        var frame = GX.frame() % GX.frameRate() + 1;
        var firstFrame = _tileset_tiles[tileId-1].animationId;
        var animationSpeed = _tileset_tiles[tileId-1].animationSpeed;

        if (animationSpeed <= 0) animationSpeed = 1; // Prevent division by zero or negative speed

        if (frame % Math.round(GX.frameRate() / animationSpeed) == 0) {
            var currFrame = firstFrame;
            if (_tileset_tiles[tileId-1].animationFrame > 0) {
                currFrame = _tileset_tiles[tileId-1].animationFrame;
            }

            // Ensure _tileset_animations[currFrame-1] exists
            var nextFrame = _tileset_animations[currFrame-1] ? _tileset_animations[currFrame-1].nextFrame : 0;
            if (nextFrame == 0) {
                nextFrame = firstFrame;
            }

            _tileset_tiles[tileId-1].animationFrame = nextFrame;
        }
    }    

    // Miscellaneous Private Methods
    function _entityCollide (eid1, eid2) {
        // Ensure both entities exist before checking collision
        if (!_entities[eid1-1] || !_entities[eid2-1]) return 0;

        return _rectCollide(
            GX.entityX(eid1), GX.entityY(eid1), GX.entityWidth(eid1), GX.entityHeight(eid1),
            GX.entityX(eid2), GX.entityY(eid2), GX.entityWidth(eid2), GX.entityHeight(eid2));
    }
    
    function _rectCollide(r1x1, r1y1, r1w, r1h, r2x1, r2y1, r2w, r2h) {
        var r1x2 = r1x1 + r1w;
        var r1y2 = r1y1 + r1h;
        var r2x2 = r2x1 + r2w;
        var r2y2 = r2y1 + r2h;

        var collide = 0;
        if (r1x2 >= r2x1) {
            if (r1x1 <= r2x2) {
                if (r1y2 >= r2y1) {
                    if (r1y1 <= r2y2) {
                        collide = -1;
                    }
                }
            }
        }
        return collide;
    }

    async function _sceneMoveEntities() {
        var frameFactor = 1 / GX.frameRate();
        if (frameFactor === Infinity || isNaN(frameFactor)) frameFactor = 0; // Prevent division by zero if framerate is 0

        for (var eid = 1; eid <= _entities.length; eid++) {
            if (_entities[eid-1] && !_entities[eid-1].screen) { // Check if entity exists
                await _sceneMoveEntity(eid);

                if (GX.entityVX(eid)) {
                    _entities[eid-1].x = GX.entityX(eid) + GX.entityVX(eid) * frameFactor;
                }
                if (GX.entityVY(eid)) {
                    _entities[eid-1].y = GX.entityY(eid) + GX.entityVY(eid) * frameFactor;
                }
            }
        }
    }

    async function _sceneMoveEntity(eid) {
        if (!_entities[eid-1]) return; // Ensure entity exists

        var tpos = {};
        var centity = { id: 0 };
        var tmove = 0;
        var testx = 0;
        var testy = 0 ;

        // Test upward movement
        if (GX.entityVY(eid) < 0) {
            testy = Math.round(GX.entityVY(eid) / GX.frameRate());
            if (testy > -1) { testy = -1; }
            tmove = Math.round(await _entityTestMove(eid, 0, testy, tpos, centity));
            if (tmove == 0) {
                if (GX.entityApplyGravity(eid)) {
                    GX.entityVY(eid, GX.entityVY(eid) * -.5);
                } else {
                    GX.entityVY(eid, 0);
                }

                if (centity.id > 0 && _entities[centity.id-1]) { // Check if centity exists
                    GX.entityPos(eid, GX.entityX(eid), GX.entityY(centity.id) - GX.entityCollisionOffsetBottom(centity.id) + GX.entityHeight(centity.id) - GX.entityCollisionOffsetTop(eid));
                } else if (tpos.y > -1) { // Only apply if tpos.y is valid
                    GX.entityPos(eid, GX.entityX(eid), (tpos.y + 1) * GX.tilesetHeight() - GX.entityCollisionOffsetTop(eid));
                }
            }
        }

        if (!GX.entityApplyGravity(eid)) {
            // Test downward movement
            if (GX.entityVY(eid) > 0) {
                testy = Math.round(GX.entityVY(eid) / GX.frameRate());
                if (testy < 1) { testy = 1; }
                tmove = Math.round(await _entityTestMove(eid, 0, testy, tpos, centity));
                if (tmove == 0) {
                    GX.entityVY(eid, 0);

                    if (centity.id > 0 && _entities[centity.id-1]) { // Check if centity exists
                        GX.entityPos(eid, GX.entityX(eid), GX.entityY(centity.id) + GX.entityCollisionOffsetTop(centity.id) - GX.entityHeight(eid) + GX.entityCollisionOffsetBottom(eid));
                    }
                    if (tpos.y > -1) { // Only apply if tpos.y is valid
                        GX.entityPos(eid, GX.entityX(eid), tpos.y * GX.tilesetHeight() - GX.entityHeight(eid) + GX.entityCollisionOffsetBottom(eid));
                    }
                }
            }
        } else {

            // Apply gravity
            testy = Math.round(GX.entityVY(eid) / GX.frameRate());
            if (testy < 1) { testy = 1; }
            tmove = Math.round(await _entityTestMove(eid, 0, testy, tpos, centity));
            if (tmove == 1) {
                var t = (GX.frame() - _entities[eid-1].jumpstart) / GX.frameRate();
                var g = _gravity * t ** 2 / 2;
                if (g < 1) { g = 1; }
                _entities[eid-1].vy = GX.entityVY(eid) + g;
                if (GX.entityVY(eid) > _terminal_velocity) { GX.entityVY(eid, _terminal_velocity); }

            } else if (GX.entityVY(eid) >= 0) {
                _entities[eid-1].jumpstart = GX.frame();
                if (GX.entityVY(eid) != 0) {
                    GX.entityVY(eid, 0);

                    if (centity.id > 0 && _entities[centity.id-1]) { // Check if centity exists
                        GX.entityPos(eid, GX.entityX(eid), GX.entityY(centity.id) + GX.entityCollisionOffsetTop(centity.id) - GX.entityHeight(eid) + GX.entityCollisionOffsetBottom(eid));
                    }
                    else if (tpos.y > -1) { // Only apply if tpos.y is valid
                        GX.entityPos(eid, GX.entityX(eid), tpos.y * GX.tilesetHeight() - GX.entityHeight(eid) + GX.entityCollisionOffsetBottom(eid));
                    }
                }
            }
        }

        if (GX.entityVX(eid) > 0) {
            // Test right movement
            testx = Math.round(GX.entityVX(eid) / GX.frameRate());
            if (testx < 1) { testx = 1 };
            tmove = Math.round(await _entityTestMove(eid, testx, 0, tpos, centity));
            if (tmove == 0) {
                GX.entityVX(eid, 0);

                if (centity.id > 0 && _entities[centity.id-1]) { // Check if centity exists
                    GX.entityPos(eid, GX.entityX(centity.id) + GX.entityCollisionOffsetLeft(centity.id) - GX.entityWidth(eid) + GX.entityCollisionOffsetRight(eid), GX.entityY(eid));
                }
                if (tpos.x > -1) { // Only apply if tpos.x is valid
                    GX.entityPos(eid, tpos.x * GX.tilesetWidth() - GX.entityWidth(eid) + GX.entityCollisionOffsetRight(eid), GX.entityY(eid));
                }
            }

        } else if (GX.entityVX(eid) < 0) {
            // Test left movement
            testx = Math.round(GX.entityVX(eid) / GX.frameRate());
            if (testx > -1) { testx = -1 };
            tmove = Math.round(await _entityTestMove(eid, testx, 0, tpos, centity));
            if (tmove == 0) {
                GX.entityVX(eid, 0);

                if (centity.id > 0 && _entities[centity.id-1]) { // Check if centity exists
                    GX.entityPos(eid, GX.entityX(centity.id) + GX.entityWidth(centity.id) - GX.entityCollisionOffsetRight(centity.id) - GX.entityCollisionOffsetLeft(eid), GX.entityY(eid));
                }
                if (tpos.x > -1) { // Only apply if tpos.x is valid
                    GX.entityPos(eid, (tpos.x + 1) * GX.tilesetWidth() - GX.entityCollisionOffsetLeft(eid), GX.entityY(eid));
                }
            }
        }
    }

    async function _entityTestMove (entity, mx, my, tpos, collisionEntity) {
        if (!_entities[entity-1]) return 1; // If entity doesn't exist, allow movement

        tpos.x = -1;
        tpos.y = -1;

        // var tcount = 0; // tcount is unused
        var tiles = [];
        _entityCollisionTiles(entity, mx, my, tiles); // Removed tcount as it's unused

        var move = 1;

        // Test for tile collision
        // var tile = 0; // tile is unused
        for (var i = 0; i < tiles.length; i++) {
            var e = {};
            e.entity = entity;
            e.event = GX.EVENT_COLLISION_TILE;
            e.collisionTileX = tiles[i].x;
            e.collisionTileY = tiles[i].y;
            e.collisionResult = false;
            
            if (_onGameEvent) {
                await _onGameEvent(e);
            }
            if (e.collisionResult) {
                move = 0;
                tpos.x = tiles[i].x;
                tpos.y = tiles[i].y;
            }
        }

        // Test for entity collision
        var entities = [];
        var ecount = _entityCollision(entity, mx, my, entities);
        for (var i=0; i < ecount; i++) {
            var e = {};
            e.entity = entity;
            e.event = GX.EVENT_COLLISION_ENTITY;
            e.collisionEntity = entities[i];
            e.collisionResult = false;
            if (_onGameEvent) {
                await _onGameEvent(e);
            }
            if (e.collisionResult) {
                move = 0;
                collisionEntity.id = entities[i];
            }
        }

        return move;
    }

    function _entityCollide (eid1, eid2) {
        // Ensure both entities exist before checking collision
        if (!_entities[eid1-1] || !_entities[eid2-1]) return 0;

        return _rectCollide( 
            GX.entityX(eid1) + GX.entityCollisionOffsetLeft(eid1), 
            GX.entityY(eid1) + GX.entityCollisionOffsetTop(eid1), 
            GX.entityWidth(eid1) - GX.entityCollisionOffsetLeft(eid1) - GX.entityCollisionOffsetRight(eid1) - 1,
            GX.entityHeight(eid1) - GX.entityCollisionOffsetTop(eid1) - GX.entityCollisionOffsetBottom(eid1) - 1,
            GX.entityX(eid2) + GX.entityCollisionOffsetLeft(eid2),
            GX.entityY(eid2) + GX.entityCollisionOffsetTop(eid2),
            GX.entityWidth(eid2) - GX.entityCollisionOffsetLeft(eid2) - GX.entityCollisionOffsetRight(eid2) - 1,
            GX.entityHeight(eid2) - GX.entityCollisionOffsetTop(eid2) - GX.entityCollisionOffsetBottom(eid2)-1);
    }

    function _entityCollision(eid, movex, movey, entities) {
        var ecount = 0;
        if (!_entities[eid-1]) return 0; // Ensure the primary entity exists

        for (var i = 1; i <= _entities.length; i++) {
            if (i != eid && _entities[i-1]) { // Check if the other entity exists
                if (_rectCollide(GX.entityX(eid) + GX.entityCollisionOffsetLeft(eid) + movex, 
                    GX.entityY(eid) + GX.entityCollisionOffsetTop(eid) + movey, 
                    GX.entityWidth(eid) - GX.entityCollisionOffsetLeft(eid) - GX.entityCollisionOffsetRight(eid) - 1,
                    GX.entityHeight(eid) - GX.entityCollisionOffsetTop(eid) - GX.entityCollisionOffsetBottom(eid) - 1,
                    GX.entityX(i) + GX.entityCollisionOffsetLeft(i),
                    GX.entityY(i) + GX.entityCollisionOffsetTop(i),
                    GX.entityWidth(i) - GX.entityCollisionOffsetLeft(i) - GX.entityCollisionOffsetRight(i) - 1,
                    GX.entityHeight(i) - GX.entityCollisionOffsetTop(i) - GX.entityCollisionOffsetBottom(i)-1)) {
                    ecount = ecount + 1;
                    entities.push(i);
                }
            }
        }
        return ecount;
    }

    function _entityCollisionTiles(entity, movex, movey, tiles) { // Removed unused tcount parameter
        var tx = 0;
        var ty = 0;
        var tx0 = 0;
        var txn = 0;
        var ty0 = 0;
        var tyn = 0;
        var x = 0;
        var y = 0;
        // var i = 0; // i is unused

        if (!_entities[entity-1]) return; // Ensure entity exists

        if (movex != 0) {
            var startx = Math.round(-1 + GX.entityCollisionOffsetLeft(entity));
            if (movex > 0) { 
                startx = Math.round(GX.entityWidth(entity) + movex - GX.entityCollisionOffsetRight(entity));
            }
            tx = Math.floor((GX.entityX(entity) + startx) / GX.tilesetWidth())

            // tcount = 0; // tcount is unused
            ty0 = 0;
            var current_tcount = 0; // Use a local variable for counting unique ty values
            for (y = GX.entityY(entity) + GX.entityCollisionOffsetTop(entity); y <= GX.entityY(entity) + GX.entityHeight(entity) - 1 - GX.entityCollisionOffsetBottom(entity); y++) {
                ty = Math.floor(y / GX.tilesetHeight());
                if (current_tcount == 0) { ty0 = ty; }
                if (ty != tyn) {
                    current_tcount = current_tcount + 1;
                }
                tyn = ty;
            }

            for (ty = ty0; ty <= tyn; ty++) {
                tiles.push({
                    x: tx,
                    y: ty
                });
            }
        }

        if (movey != 0) {
            var starty = Math.round(-1 + GX.entityCollisionOffsetTop(entity));
            if (movey > 0) { 
                starty = Math.round(GX.entityHeight(entity) + movey - GX.entityCollisionOffsetBottom(entity));
            }
            ty = Math.floor((GX.entityY(entity) + starty) / GX.tilesetHeight());

            // tcount = 0; // tcount is unused
            tx0 = 0;
            var current_tcount = 0; // Use a local variable for counting unique tx values
            for (x = GX.entityX(entity) + GX.entityCollisionOffsetLeft(entity); x <= GX.entityX(entity) + GX.entityWidth(entity) - 1 - GX.entityCollisionOffsetRight(entity); x++) {
                tx = Math.floor(x / GX.tilesetWidth());
                if (current_tcount == 0) { tx0 = tx; }
                if (tx != txn) {
                    current_tcount = current_tcount + 1;
                }
                txn = tx;
            }

            for (tx = tx0; tx <= txn; tx++) {
                tiles.push({
                    x: tx,
                    y: ty
                })
            }
        }
    }

    function _fullScreen(fullscreenFlag, smooth) {
        if (fullscreenFlag != undefined) {
            if (fullscreenFlag) {
                if (!_canvas) { // Ensure canvas exists
                    console.warn("Cannot go fullscreen: canvas element not found.");
                    return _qbBoolean(_fullscreenFlag);
                }
                if (!smooth) {
                    _canvas.style.imageRendering = "pixelated";
                }
                else {
                    _canvas.style.imageRendering = undefined;
                }
        
                if (_canvas.requestFullscreen) {
                    _canvas.requestFullscreen();
                    _fullscreenFlag = true;
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    _fullscreenFlag = false;
                }
            }
        }
        return _qbBoolean(_fullscreenFlag);
    }

    // Bitmap Font Methods
    function _fontCreate(filename, charWidth, charHeight, charref) {
        var font = {
            eid: GX.entityCreate(filename, charWidth, charHeight, 1),
            charSpacing: 0,
            lineSpacing: 0
        };

        GX.entityVisible(font.eid, false);
        _fonts.push(font);
        _font_charmap.push(new Array(256).fill({x:0,y:0}));
        var fid = _fonts.length;

        _fontMapChars(fid, charref);

        return fid;
    }

    function _fontWidth (fid) {
        if (!_fonts[fid-1]) return 0; // Check font existence
        return GX.entityWidth(_fonts[fid-1].eid);
    }

    function _fontHeight (fid) {
        if (!_fonts[fid-1]) return 0; // Check font existence
        return GX.entityHeight(_fonts[fid-1].eid);
    }

    function _fontCharSpacing (fid, charSpacing) {
        if (!_fonts[fid-1]) return 0; // Check font existence
        if (charSpacing != undefined) {
            _fonts[fid-1].charSpacing = charSpacing;
        }
        return _fonts[fid-1].charSpacing;
    }

    function _fontLineSpacing (fid, lineSpacing) {
        if (!_fonts[fid-1]) return 0; // Check font existence
        if (lineSpacing != undefined) {
            _fonts[fid-1].lineSpacing = lineSpacing;
        }
        return _fonts[fid-1].lineSpacing;
    }

    function _drawText (fid, sx, sy, s) {
        if (s == undefined || !_fonts[fid-1]) { return; } // Check font existence
        var x = sx;
        var y = sy;
        var font = _fonts[fid-1];
        var e = _entities[font.eid-1];

        if (!e) return; // Ensure entity for font exists

        for (var i = 0; i < s.length; i++) {
            var a = s.charCodeAt(i);
            if (a == 10) { // Line feed, move down to the next line
                x = sx;
                y = y + e.height + font.lineSpacing;
            } else if (a != 13) { // Ignore Carriage Return
                if (a != 32) { // Space character, nothing to draw
                    // Ensure _font_charmap[fid-1] and its character mapping exist
                    var cpos = _font_charmap[fid-1] && _font_charmap[fid-1][a] ? _font_charmap[fid-1][a] : {x:0,y:0};
                    GX.spriteDraw(e.image, x, y, cpos.y, cpos.x, e.width, e.height);
                }
                x = x + e.width + font.charSpacing;
            }
        }
    }

    function _fontMapChars (fid, charref) {
        if (!_fonts[fid-1]) return; // Check font existence
        var cx = 1;
        var cy = 1;
        for (var i = 0; i < charref.length; i++) {
            var a = charref.charCodeAt(i);
            if (a == 10) {
                cx = 1;
                cy = cy + 1;
            } else {
                if (a >= 33 && a <= 256) {
                    // Ensure _font_charmap[fid-1] is initialized
                    if (!_font_charmap[fid-1]) {
                        _font_charmap[fid-1] = new Array(256).fill({x:0,y:0});
                    }
                    _font_charmap[fid-1][a] = {x: cx, y: cy};
                }
                cx = cx + 1;
            }
        }
    }

    function _fontCreateDefault (fid) {
        if (!_fonts[fid-1]) { // Ensure font slot exists
            _fonts[fid-1] = { eid:0, charSpacing:0, lineSpacing: 0};
            _font_charmap[fid-1] = new Array(256).fill({x:0,y:0});
        }

        var filename = null;
        if (fid == GX.FONT_DEFAULT_BLACK) {
            filename = "gx/__gx_font_default_black.png";
        } else {
            filename = "gx/__gx_font_default.png";
        }

        _fonts[fid-1].eid = GX.entityCreate(filename, 6, 8, 1);
        GX.entityVisible(_fonts[fid-1].eid, false);
        _fontMapChars(fid, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~`!@#$%^&*()_-+={}[]|\\,./<>?:;\"'");
        GX.fontLineSpacing(fid, 1);
    }

    // Input Device Methods
    function _mouseInput() {
        var mi = _mouseInputFlag;
        _mouseInputFlag = false;
        return mi;
    }

    function _mouseX() {
        return Math.round((_mousePos.x - _scene.offsetX) / _scene.scaleX);
    }

    function _mouseY() {
        return Math.round((_mousePos.y - _scene.offsetY) / _scene.scaleY);
    }

    function _mouseButton(button) {
        if (button < 1 || button > _mouseButtons.length) return 0; // Check bounds
        return _mouseButtons[button-1];
    }

    function _mouseWheel() {
        var mw = _mouseWheelFlag;
        _mouseWheelFlag = 0;
        return mw;
    }

    function _touchInput() {
        var ti = _touchInputFlag;
        _touchInputFlag = false;
        return ti;
    }

    function _touchX() {
        return _touchPos.x;
    }

    function _touchY() {
        return _touchPos.y;
    }
    
    function _enableTouchMouse(enable) {
        _bindTouchToMouse = enable;
    }

    function _deviceInputTest(di) {
        if (!di) return _qbBoolean(false); // Ensure di exists
        if (di.deviceType == GX.DEVICE_KEYBOARD) {
            if (di.inputType == GX.DEVICE_BUTTON) {
                return GX.keyDown(di.inputId);
            }
        }
        return _qbBoolean(false);
    }

    function _keyInput (k, di) {
        if (!di) { // Initialize di if it's not passed or is undefined
            di = {};
        }
        di.deviceId = GX.DEVICE_KEYBOARD;
        di.deviceType = GX.DEVICE_KEYBOARD;
        di.inputType = GX.DEVICE_BUTTON;
        di.inputId = k;
        di.inputValue = -1;
    }

    function _keyButtonName (inputId ) {
        var k;
        switch (inputId) {
            case GX.KEY_ESC: k = "Esc"; break;
            case GX.KEY_1: k = "1"; break;
            case GX.KEY_2: k = "2"; break;
            case GX.KEY_3: k = "3"; break;
            case GX.KEY_4: k = "4"; break;
            case GX.KEY_5: k = "5"; break;
            case GX.KEY_6: k = "6"; break;
            case GX.KEY_7: k = "7"; break;
            case GX.KEY_8: k = "8"; break;
            case GX.KEY_9: k = "9"; break;
            case GX.KEY_0: k = "0"; break;
            case GX.KEY_DASH: k = "-"; break;
            case GX.KEY_EQUALS: k = "="; break;
            case GX.KEY_BACKSPACE: k = "Bksp"; break;
            case GX.KEY_TAB: k = "Tab"; break;
            case GX.KEY_Q: k = "Q"; break;
            case GX.KEY_W: k = "W"; break;
            case GX.KEY_E: k = "E"; break;
            case GX.KEY_R: k = "R"; break;
            case GX.KEY_T: k = "T"; break;
            case GX.KEY_Y: k = "Y"; break;
            case GX.KEY_U: k = "U"; break;
            case GX.KEY_I: k = "I"; break;
            case GX.KEY_O: k = "O"; break;
            case GX.KEY_P: k = "P"; break;
            case GX.KEY_LBRACKET: k = "["; break;
            case GX.KEY_RBRACKET: k = "]"; break;
            case GX.KEY_ENTER: k = "Enter"; break;
            case GX.KEY_LCTRL: k = "LCtrl"; break;
            case GX.KEY_A: k = "A"; break;
            case GX.KEY_S: k = "S"; break;
            case GX.KEY_D: k = "D"; break;
            case GX.KEY_F: k = "F"; break;
            case GX.KEY_G: k = "G"; break;
            case GX.KEY_H: k = "H"; break;
            case GX.KEY_J: k = "J"; break;
            case GX.KEY_K: k = "K"; break;
            case GX.KEY_L: k = "L"; break;
            case GX.KEY_SEMICOLON: k = ";"; break;
            case GX.KEY_QUOTE: k = "'"; break;
            case GX.KEY_BACKQUOTE: k = "`"; break;
            case GX.KEY_LSHIFT: k = "LShift"; break;
            case GX.KEY_BACKSLASH: k = "\\"; break;
            case GX.KEY_Z: k = "Z"; break;
            case GX.KEY_X: k = "X"; break;
            case GX.KEY_C: k = "C"; break;
            case GX.KEY_V: k = "V"; break;
            case GX.KEY_B: k = "B"; break;
            case GX.KEY_N: k = "N"; break;
            case GX.KEY_M: k = "M"; break;
            case GX.KEY_COMMA: k = ","; break;
            case GX.KEY_PERIOD: k = "."; break;
            case GX.KEY_SLASH: k = "Slash"; break;
            case GX.KEY_RSHIFT: k = "RShift"; break;
            case GX.KEY_NUMPAD_MULTIPLY: k = "NPad *"; break;
            case GX.KEY_SPACEBAR: k = "Space"; break;
            case GX.KEY_CAPSLOCK: k = "CapsLk"; break;
            case GX.KEY_F1: k = "F1"; break;
            case GX.KEY_F2: k = "F2"; break;
            case GX.KEY_F3: k = "F3"; break;
            case GX.KEY_F4: k = "F4"; break;
            case GX.KEY_F5: k = "F5"; break;
            case GX.KEY_F6: k = "F6"; break;
            case GX.KEY_F7: k = "F7"; break;
            case GX.KEY_F8: k = "F8"; break;
            case GX.KEY_F9: k = "F9"; break;
            case GX.KEY_F10: k = "F10"; break;
            case GX.KEY_PAUSE: k = "Pause"; break;
            case GX.KEY_SCRLK: k = "ScrLk"; break;
            case GX.KEY_NUMPAD_7: k = "Numpad 7"; break;
            case GX.KEY_NUMPAD_8: k = "Numpad 8"; break;
            case GX.KEY_NUMPAD_9: k = "Numpad 9"; break;
            case GX.KEY_NUMPAD_MINUS: k = "-"; break;
            case GX.KEY_NUMPAD_4: k = "Numpad 4"; break;
            case GX.KEY_NUMPAD_5: k = "Numpad 5"; break;
            case GX.KEY_NUMPAD_6: k = "Numpad 6"; break;
            case GX.KEY_NUMPAD_PLUS: k = "+"; break;
            case GX.KEY_NUMPAD_1: k = "Numpad 1"; break;
            case GX.KEY_NUMPAD_2: k = "Numpad 2"; break;
            case GX.KEY_NUMPAD_3: k = "Numpad 3"; break;
            case GX.KEY_NUMPAD_0: k = "Numpad 0"; break;
            case GX.KEY_NUMPAD_PERIOD: k = "Numpad ."; break;
            case GX.KEY_F11: k = "F11"; break;
            case GX.KEY_F12: k = "F12"; break;
            case GX.KEY_NUMPAD_ENTER: k = "Numpad Enter"; break;
            case GX.KEY_RCTRL: k = "RCtrl"; break;
            case GX.KEY_NUMPAD_DIVIDE: k = "Numpad /"; break;
            case GX.KEY_NUMLOCK: k = "NumLk"; break;
            case GX.KEY_HOME: k = "Home"; break;
            case GX.KEY_UP: k = "Up"; break;
            case GX.KEY_PAGEUP: k = "PgUp"; break;
            case GX.KEY_LEFT: k = "Left"; break;
            case GX.KEY_RIGHT: k = "Right"; break;
            case GX.KEY_END: k = "End"; break;
            case GX.KEY_DOWN: k = "Down"; break;
            case GX.KEY_PAGEDOWN: k = "PgDn"; break;
            case GX.KEY_INSERT: k = "Ins"; break;
            case GX.KEY_DELETE: k = "Del"; break;
            case GX.KEY_LWIN: k = "LWin"; break;
            case GX.KEY_RWIN: k = "RWin"; break;
            case GX.KEY_MENU: k = "Menu"; break;
            case GX.KEY_LALT: k = "LAlt"; break;
            case GX.KEY_RALT: k = "RAlt"; break;
            default: k = inputId; break; // Fallback for unknown keys
        }
        return k;
    }

    // Debugging Methods
    function _debug(enabled) {
        if (enabled != undefined) {
            __debug.enabled = enabled;
        }
        return _qbBoolean(__debug.enabled);
    }

    function _debugFont(font) {
        if (font != undefined) {
            __debug.font = font;
        }
        return __debug.font;
    }

    function _debugTileBorderColor(c) {
        if (c != undefined) {
            __debug.tileBorderColor = c; // Use __debug
        }
        return __debug.tileBorderColor;
    }

    function _debugEntityBorderColor(c) {
        if (c != undefined) {
            __debug.entityBorderColor = c; // Use __debug
        }
        return __debug.entityBorderColor;
    }

    function _debugEntityCollisionColor(c) {
        if (c != undefined) {
            __debug.entityCollisionColor = c; // Use __debug
        }
        return __debug.entityCollisionColor;
    }

    function _debugFrameRate() {
        var frame = String(GX.frame());
        var frameRate = String(GX.frameRate());
        // Pad frameRate with spaces if it's shorter than frame for alignment
        frameRate = frameRate.padStart(frame.length - frameRate.length, " ");

        // Ensure GX.debugFont() returns a valid font ID
        const debugFontId = GX.debugFont();
        if (debugFontId > 0 && _fonts[debugFontId - 1]) {
            GX.drawText(debugFontId, GX.sceneWidth() - (frame.length + 6) * 6 - 1, 1, "FRAME:" + frame);
            GX.drawText(debugFontId, GX.sceneWidth() - (frameRate.length + 4) * 6 - 1, 9, "FPS:" + frameRate);
        } else {
            console.warn("Debug font not initialized or invalid.");
        }
    }

    function _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    function _init() {
        _vfsCwd = _vfs.rootDirectory();

        _fontCreateDefault(GX.FONT_DEFAULT);
        _fontCreateDefault(GX.FONT_DEFAULT_BLACK);

        addEventListener("keyup", function(event) { 
            const activeElement = document.activeElement;
            const isTypingIntoInput = (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA'));

            if (_scene.active && !isTypingIntoInput) {
                event.preventDefault();
            }
            if (!isTypingIntoInput) {
                _pressedKeys[event.code] = false;
            }
        });
        addEventListener("keydown", function(event) { 
            const activeElement = document.activeElement;
            const isTypingIntoInput = (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA'));

            if (_scene.active && !isTypingIntoInput) {
                event.preventDefault();
            }
            if (!isTypingIntoInput) {
                _pressedKeys[event.code] = true;
            }
        });

        _isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
        if (_isMobileDevice) {
            console.log("Mobile device detected. Initializing touch controls.");
            document.body.addEventListener('touchstart', function(e) {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.tagName !== 'BODY' &&
                    activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    activeElement.blur();
                }
            }, { passive: false });

            const setupTouchButton = (id, controlKey) => {
                const button = document.getElementById(id);
                if (button) {
                    button.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        _touchControls[controlKey] = true;
                    }, { passive: false });
                    button.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        _touchControls[controlKey] = false;
                    }, { passive: false });
                    button.addEventListener('touchcancel', (e) => {
                        e.preventDefault();
                        _touchControls[controlKey] = false;
                    }, { passive: false });
                    button.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        _touchControls[controlKey] = true;
                    });
                    button.addEventListener('mouseup', (e) => {
                        e.preventDefault();
                        _touchControls[controlKey] = false;
                    });
                    button.addEventListener('mouseleave', (e) => {
                        if (e.buttons === 1) {
                            _touchControls[controlKey] = false;
                        }
                    });
                } else {
                    console.warn(`Touch control button with ID '${id}' not found.`);
                }
            };

            setupTouchButton('touch-up', 'up');
            setupTouchButton('touch-down', 'down');
            setupTouchButton('touch-left', 'left');
            setupTouchButton('touch-right', 'right');
            setupTouchButton('touch-action', 'action');

            const touchControlsContainer = document.getElementById('touch-controls');
            if (touchControlsContainer) {
                touchControlsContainer.style.display = 'block';
            }
        } else {
            const touchControlsContainer = document.getElementById('touch-controls');
            if (touchControlsContainer) {
                touchControlsContainer.style.display = 'none';
            }
        }
    }

    this.ctx = function() { return _ctx; };
    this.canvas = function() { return _canvas; };
    this.vfs = function() { return _vfs; };
    this.vfsCwd = function(cwd) {
        if (cwd != undefined) {
            _vfsCwd = cwd;
        }
        return _vfsCwd;
    };

    this.frame = _frame;
    this.frameRate = _frameRate;

    this.sceneColumns = _sceneColumns;
    this.sceneConstrain = _sceneConstrain;
    this.sceneCreate = _sceneCreate;
    this.sceneDraw = _sceneDraw;
    this.sceneFollowEntity = _sceneFollowEntity;
    this.sceneHeight = _sceneHeight;
    this.sceneMove = _sceneMove;
    this.scenePos = _scenePos;
    this.sceneResize = _sceneResize;
    this.sceneRows = _sceneRows;
    this.sceneScale = _sceneScale;
    this.sceneStart = _sceneStart;
    this.sceneStop = _sceneStop;
    this.sceneUpdate = _sceneUpdate;
    this.sceneWidth = _sceneWidth;
    this.sceneX = _sceneX;
    this.sceneY = _sceneY;
        
    this.spriteDraw = _spriteDraw;
    this.spriteDrawScaled = _spriteDrawScaled;

    this.backgroundAdd = _backgroundAdd;
    this.backgroundWrapFactor = _backgroundWrapFactor;
    this.backgroundClear = _backgroundClear;

    this.soundClose = _soundClose;
    this.soundLoad = _soundLoad;
    this.soundPlay = _soundPlay;
    this.soundRepeat = _soundRepeat;
    this.soundPause = _soundPause;
    this.soundStop = _soundStop;
    this.soundStopAll = _soundStopAll;
    this.soundVolume = _soundVolume;
    this.soundMuted = _soundMuted;

    this.entityCreate = _entityCreate;
    this.screenEntityCreate = _screenEntityCreate;
    this.entityAnimate = _entityAnimate;
	this.entityAnimateStop = _entityAnimateStop;
    this.entityAnimateMode = _entityAnimateMode;
    this.entityX = _entityX;
    this.entityY = _entityY;
    this.entityWidth = _entityWidth;
    this.entityHeight = _entityHeight;
    this.entityMove = _entityMove;
	this.entityPos =  _entityPos;
    this.entityVX = _entityVX;
    this.entityVY = _entityVY;
	this.entityFrameNext = _entityFrameNext;
    this.entityFrame = _entityFrame;
    this.entityFrames = _entityFrames;
    this.entityFrameSet = _entityFrameSet;
    this.entityType = _entityType;
    this.entityMapLayer = _entityMapLayer;
    this.entityCollisionOffset = _entityCollisionOffset;
    this.entityCollisionOffsetLeft = _entityCollisionOffsetLeft;
    this.entityCollisionOffsetTop = _entityCollisionOffsetTop;
    this.entityCollisionOffsetRight = _entityCollisionOffsetRight;
    this.entityCollisionOffsetBottom = _entityCollisionOffsetBottom;
    this.entityCollide = _entityCollide;
    this.entityApplyGravity = _entityApplyGravity;
    this.entityVisible = _entityVisible;

    this.entityFrame = _entityFrame;
    this.entitySequence = _entitySequence;
    this.entitySequences = _entitySequences;
    this.entityFrames = _entityFrames;

    this.mapColumns = _mapColumns;
    this.mapCreate = _mapCreate;
    this.mapLoad = _mapLoad;
    this.mapDraw = _mapDraw;
    this.mapSave = _mapSave;
    this.mapIsometric = _mapIsometric;
    this.mapLayerAdd = _mapLayerAdd;
    this.mapLayerInsert = _mapLayerInsert;
    this.mapLayerRemove = _mapLayerRemove;
    this.mapLayerInit = _mapLayerInit;
    this.mapLayerVisible = _mapLayerVisible;
    this.mapLayers = _mapLayers;
    this.mapResize = _mapResize;
    this.mapRows = _mapRows;
    this.mapTile = _mapTile;

    this.tilesetColumns = _tilesetColumns;
    this.tilesetCreate = _tilesetCreate;
    this.tilesetFilename = _tilesetFilename;
    this.tilesetHeight = _tilesetHeight;
    this.tilesetImage = _tilesetImage;
    this.tilesetPos = _tilesetPos;
    this.tilesetRows = _tilesetRows;
    this.tilesetWidth = _tilesetWidth;
    this.tilesetReplaceImage = _tilesetReplaceImage;
    this.tilesetAnimationCreate = _tilesetAnimationCreate;
    this.tilesetAnimationAdd = _tilesetAnimationAdd;
    this.tilesetAnimationRemove = _tilesetAnimationRemove;
    this.tilesetAnimationFrames = _tilesetAnimationFrames;
    this.tilesetAnimationSpeed = _tilesetAnimationSpeed;

    this.fontCharSpacing = _fontCharSpacing;
    this.fontCreate = _fontCreate;
    this.fontHeight = _fontHeight;
    this.fontLineSpacing = _fontLineSpacing;
    this.fontWidth = _fontWidth;
    this.drawText = _drawText;

    this.deviceInputTest = _deviceInputTest;
    this.keyInput = _keyInput;
    this.keyButtonName = _keyButtonName;
    this.mouseX = _mouseX;
    this.mouseY = _mouseY;
    this.mouseButton = _mouseButton;
    this.mouseWheel = _mouseWheel;
    this._mouseInput = _mouseInput;
    this.touchX = _touchX;
    this.touchY = _touchY
    this._enableTouchMouse = _enableTouchMouse;
    this._touchInput = _touchInput;

    this.debug = _debug;
    this.debugFont = _debugFont;
    this.debugEntityBorderColor = _debugEntityBorderColor;
    this.debugEntityCollisionColor = _debugEntityCollisionColor;
    this.debugTileBorderColor = _debugTileBorderColor;

    this.fullScreen = _fullScreen;
    this.keyDown = _keyDown;

    this.init = _init;
    this.reset = _reset;
    this.sleep = _sleep;
    this.registerGameEvents = _registerGameEvents;
    this.resourcesLoaded = _resourcesLoaded;
    
    this.sceneActive = function() { return _scene.active; }

    // constants
    this.TRUE = -1;
    this.FALSE = 0;

    this.EVENT_INIT = 1;
    this.EVENT_UPDATE = 2;
    this.EVENT_DRAWBG = 3;
    this.EVENT_DRAWMAP = 4;
    this.EVENT_DRAWSCREEN = 5;
    this.EVENT_MOUSEINPUT = 6;
    this.EVENT_PAINTBEFORE = 7;
    this.EVENT_PAINTAFTER = 8;
    this.EVENT_COLLISION_TILE = 9;
    this.EVENT_COLLISION_ENTITY = 10;
    this.EVENT_PLAYER_ACTION = 11;
    this.EVENT_ANIMATE_COMPLETE = 12;
    this.EVENT_KEY_TYPED = 13; // New event for virtual keyboard input

    this.ANIMATE_LOOP = 0;
    this.ANIMATE_SINGLE = 1;

    this.BG_STRETCH = 1;
    this.BG_SCROLL = 2;
    this.BG_WRAP = 3;

    this.KEY_ESC = 'Escape';
    this.KEY_1 = 'Digit1';
    this.KEY_2 = 'Digit2';
    this.KEY_3 = 'Digit3';
    this.KEY_4 = 'Digit4';
    this.KEY_5 = 'Digit5';
    this.KEY_6 = 'Digit6';
    this.KEY_7 = 'Digit7';
    this.KEY_8 = 'Digit8';
    this.KEY_9 = 'Digit9';
    this.KEY_0 = 'Digit0';
    this.KEY_DASH = 'Minus';
    this.KEY_EQUALS = 'Equal';
    this.KEY_BACKSPACE = 'Backspace';
    this.KEY_TAB = 'Tab';
    this.KEY_Q = 'KeyQ';
    this.KEY_W = 'KeyW';
    this.KEY_E = 'KeyE';
    this.KEY_R = 'KeyR';
    this.KEY_T = 'KeyT';
    this.KEY_Y = 'KeyY';
    this.KEY_U = 'KeyU';
    this.KEY_I = 'KeyI';
    this.KEY_O = 'KeyO';
    this.KEY_P = 'KeyP';
    this.KEY_LBRACKET = 'BracketLeft';
    this.KEY_RBRACKET = 'BracketRight';
    this.KEY_ENTER = 'Enter';
    this.KEY_LCTRL = 'ControlLeft';
    this.KEY_A = 'KeyA';
    this.KEY_S = 'KeyS';
    this.KEY_D = 'KeyD';
    this.KEY_F = 'KeyF';
    this.KEY_G = 'KeyG';
    this.KEY_H = 'KeyH';
    this.KEY_J = 'KeyJ';
    this.KEY_K = 'KeyK';
    this.KEY_L = 'KeyL';
    this.KEY_SEMICOLON = 'Semicolon';
    this.KEY_QUOTE = 'Quote';
    this.KEY_BACKQUOTE = 'Backquote';
    this.KEY_LSHIFT = 'ShiftLeft';
    this.KEY_BACKSLASH = 'Backslash';
    this.KEY_Z = 'KeyZ';
    this.KEY_X = 'KeyX';
    this.KEY_C = 'KeyC';
    this.KEY_V = 'KeyV';
    this.KEY_B = 'KeyB';
    this.KEY_N = 'KeyN';
    this.KEY_M = 'KeyM';
    this.KEY_COMMA = 'Comma';
    this.KEY_PERIOD = 'Period';
    this.KEY_SLASH = 'Slash';
    this.KEY_RSHIFT = 'ShiftRight';
    this.KEY_NUMPAD_MULTIPLY = 'NumpadMultiply';
    this.KEY_SPACEBAR = 'Space';
    this.KEY_CAPSLOCK = 'CapsLock';
    this.KEY_F1 = 'F1';
    this.KEY_F2 = 'F2';
    this.KEY_F3 = 'F3';
    this.KEY_F4 = 'F4';
    this.KEY_F5 = 'F5';
    this.KEY_F6 = 'F6';
    this.KEY_F7 = 'F7';
    this.KEY_F8 = 'F8';
    this.KEY_F9 = 'F9';
    this.KEY_F10 = 'F10';
    this.KEY_PAUSE = 'Pause';
    this.KEY_SCRLK = 'ScrollLock';
    this.KEY_NUMPAD_7 = 'Numpad7';
    this.KEY_NUMPAD_8 = 'Numpad8';
    this.KEY_NUMPAD_9 = 'Numpad9';
    this.KEY_NUMPAD_MINUS = 'NumpadSubtract';
    this.KEY_NUMPAD_4 = 'Numpad4';
    this.KEY_NUMPAD_5 = 'Numpad5';
    this.KEY_NUMPAD_6 = 'Numpad6';
    this.KEY_NUMPAD_PLUS = 'NumpadAdd';
    this.KEY_NUMPAD_1 = 'Numpad1';
    this.KEY_NUMPAD_2 = 'Numpad2';
    this.KEY_NUMPAD_3 = 'Numpad3';
    this.KEY_NUMPAD_0 = 'Numpad0';
    this.KEY_NUMPAD_PERIOD = 'NumpadDecimal';
    this.KEY_F11 = 'F11';
    this.KEY_F12 = 'F12';
    this.KEY_NUMPAD_ENTER = 'NumpadEnter';
    this.KEY_RCTRL = 'ControlRight';
    this.KEY_NUMPAD_DIVIDE = 'NumpadDivide';
    this.KEY_NUMLOCK = 'NumLock';
    this.KEY_HOME = 'Home';
    this.KEY_UP = 'ArrowUp';
    this.KEY_PAGEUP = 'PageUp';
    this.KEY_LEFT = 'ArrowLeft';
    this.KEY_RIGHT = 'ArrowRight';
    this.KEY_END = 'End';
    this.KEY_DOWN = 'ArrowDown';
    this.KEY_PAGEDOWN = 'PageDown';
    this.KEY_INSERT = 'Insert';
    this.KEY_DELETE = 'Delete';
    this.KEY_LWIN = 'MetaLeft';
    this.KEY_RWIN = 'MetaRight';
    this.KEY_MENU = 'ContextMenu';
    this.KEY_LALT = "AltLeft";
    this.KEY_RALT = "AltRight";

    this.ACTION_MOVE_LEFT = 1;
    this.ACTION_MOVE_RIGHT = 2;
    this.ACTION_MOVE_UP = 3;
    this.ACTION_MOVE_DOWN = 4;
    this.ACTION_JUMP = 5;
    this.ACTION_JUMP_RIGHT = 6;
    this.ACTION_JUMP_LEFT = 7;

    this.SCENE_FOLLOW_NONE = 0;
    this.SCENE_FOLLOW_ENTITY_CENTER = 1;
    this.SCENE_FOLLOW_ENTITY_CENTER_X = 2;
    this.SCENE_FOLLOW_ENTITY_CENTER_Y = 3;
    this.SCENE_FOLLOW_ENTITY_CENTER_X_POS = 4;
    this.SCENE_FOLLOW_ENTITY_CENTER_X_NEG = 5;

    this.SCENE_CONSTRAIN_NONE = 0;
    this.SCENE_CONSTRAIN_TO_MAP = 1;

    this.FONT_DEFAULT = 1;
    this.FONT_DEFAULT_BLACK = 2;

    this.DEVICE_KEYBOARD = 1;
    this.DEVICE_MOUSE = 2;
    this.DEVICE_CONTROLLER = 3;
    this.DEVICE_BUTTON = 4;
    this.DEVICE_AXIS = 5;
    this.DEVICE_WHEEL = 6;

    this.TYPE_ENTITY = 1;
    this.TYPE_FONT = 2;

    this.CR = "\r";
    this.LF = "\n";
    this.CRLF = "\r\n"

    // Array handling methods
    this.initArray = function(dimensions, obj) {
        var a = {};
        if (dimensions && dimensions.length > 0) {
            a._dimensions = dimensions;
        }
        else {
            a._dimensions = [{l:0,u:1}];
        }
        a._newObj = { value: obj };
        return a;
    };

    this.resizeArray = function(a, dimensions, obj, preserve) {
       if (!preserve) {
            var props = Object.getOwnPropertyNames(a);
            for (var i = 0; i < props.length; i++) {
                if (props[i] != "_newObj" && typeof a[props[i]] !== 'function') { // Don't delete functions
                    delete a[props[i]];
                }
            }
        }
        if (dimensions && dimensions.length > 0) {
            a._dimensions = dimensions;
        }
        else {
            a._dimensions = [{l:0,u:1}];
        }
    };

    this.arrayValue = function(a, indexes) {
        var value = a;
        for (var i=0; i < indexes.length; i++) {
            if (value[indexes[i]] == undefined) {
                if (i == indexes.length-1) {
                    value[indexes[i]] = JSON.parse(JSON.stringify(a._newObj));
                }
                else {
                    value[indexes[i]] = {};
                }
            }
            value = value[indexes[i]];
        }

        return value;
    };

    // ----------------------------------------------------
    // Hidden input system for mobile soft keyboard
    // ----------------------------------------------------
    var hiddenInput = null; // Initialize as null, will be assigned in _init

    // Internal function: set mode
    function GXSetInputMode(mode) {
        if (!hiddenInput) {
            console.warn("GX: hiddenInput not initialized. Call GX.init() first.");
            return;
        }
        if (mode === "number") {
            hiddenInput.type = "number";
            hiddenInput.inputMode = "numeric";
        } else {
            hiddenInput.type = "text";
            hiddenInput.inputMode = "text";
        }
        hiddenInput.focus(); // ensure keyboard appears
    }

    // Public API for console INPUT
    this.requestNumberInput = function () {
        GXSetInputMode("number");
    };

    this.requestTextInput = function () {
        GXSetInputMode("text");
    };

    // Add this to your _init function to set up the hidden input listeners
    var originalInit = this.init;
    this.init = function() {
        originalInit(); // Call the original _init function first

        hiddenInput = document.getElementById("gx-hidden-input");
        if (hiddenInput) {
            // When canvas is touched, focus the hidden input to bring up the keyboard
            // This is now handled by the canvas's touchstart event listener already present
            // in _sceneCreate, which calls _mouseButtons[0] = -1 and _mouseInputFlag = true.
            // We need to ensure that if a touch happens, the hiddenInput gets focus.
            // The existing canvas touchstart prevents default, so we need to explicitly focus.
            // However, directly focusing on touchstart might interfere with game input.
            // A better approach is to only focus when an input is *requested* by the game.
            // So, the `GX.requestNumberInput()` and `GX.requestTextInput()` functions will handle focusing.

            // Listen for actual text typed
            hiddenInput.addEventListener("input", (e) => {
                const value = e.target.value;
                if (value.length > 0) {
                    const char = value[value.length - 1]; // last typed character

                    // Send character to GX game event system
                    if (_onGameEvent) {
                        _onGameEvent({
                            event: GX.EVENT_KEY_TYPED,
                            key: char
                        });
                    }

                    e.target.value = ""; // reset so only new chars are sent
                }
            });

            // Handle blur event for the hidden input
            hiddenInput.addEventListener("blur", () => {
                // Optional: You might want to send an event to your game when the keyboard is dismissed
                // e.g., _onGameEvent({ event: "KEYBOARD_DISMISSED" });
            });

        } else {
            console.warn("GX: Hidden input element with ID 'gx-hidden-input' not found. Mobile virtual keyboard input will not work.");
        }
    };
};    
    
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
