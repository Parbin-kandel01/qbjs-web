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

    var _vfs = new VFS();
    var _vfsCwd = null;

    // javascript specific
    var _onGameEvent = null;
    var _pressedKeys = {};

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
    }

    // Scene Functions
    // -----------------------------------------------------------------
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

            // --- START: Mobile/Console Keyboard Input Implementation ---
            // These listeners are added to the *document* to capture global key presses.
            document.addEventListener("keydown", function(event) {
                // event.preventDefault(); // Uncomment this if you want to prevent default browser actions (like scrolling)
                _pressedKeys[event.key] = -1; // -1 is the QB-style 'true' for key pressed
            });

            document.addEventListener("keyup", function(event) {
                // event.preventDefault(); // Uncomment this if you want to prevent default browser actions
                _pressedKeys[event.key] = 0; // 0 is the QB-style 'false' for key released
            });
            // --- END: Mobile/Console Keyboard Input Implementation ---

        }
        _canvas.width = width;
        _canvas.height = height;
        _ctx = _canvas.getContext("2d");

        var footer = document.getElementById("gx-footer");
        footer.style.width = width;
        
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
        footer.style.width = _canvas.width;
    }

    function _sceneX() { return _scene.x; }
    function _sceneY() { return _scene.y; }
    function _sceneWidth() { return _scene.width; }
    function _sceneHeight() { return _scene.height; }
    function _sceneColumns() { return _scene.columns; }
    function _sceneRows() { return _scene.rows; }

    
    // Draw the scene.
    // This method is called automatically when GX is managing the event/game loop.
    // Call this method for each page draw event when the event/game loop is being
    // handled externally.
    function _sceneDraw() {
        if (_map_loading) { return; }
        var frame = _scene.frame % GX.frameRate() + 1;

        // If the screen has been resized, resize the destination screen image
        //If _Resize And Not GXSceneEmbedded Then
        //    '_FREEIMAGE _SOURCE
        //    'SCREEN _NEWIMAGE(_RESIZEWIDTH, _RESIZEHEIGHT, 32)
        //    GXSceneWindowSize _ResizeWidth, _ResizeHeight
        //End If

        // Clear the background
		_ctx.clearRect(0, 0, GX.sceneWidth(), GX.sceneHeight());

        // Draw background images, if present
        for (var bi = 1; bi <= _bg.length; bi++) {
            _backgroundDraw(bi);
        }

        // Call out to any custom screen drawing
        _customDrawEvent(GX.EVENT_DRAWBG);

        // Initialize the renderable entities
        _entities_active = [];
        for (var ei=1; ei <= _entities.length; ei++) {
            var e = _entities[ei-1];
            if (!e.screen) {
                if (_rectCollide(e.x, e.y, e.width, e.height, GX.sceneX(), GX.sceneY(), GX.sceneWidth(), GX.sceneHeight())) {
                    _entities_active.push(ei);
                }
            }
        }

        // Draw the map tiles
        GX.mapDraw();

        // Call out to any custom screen drawing
        _customDrawEvent(GX.EVENT_DRAWMAP);

        // Draw the entities
        _drawEntityLayer(0);

        // Draw the screen entities which should appear on top of the other game entities
        // and have a fixed position
        for (var ei = 1; ei <= _entities.length; ei++) {
            var e = _entities[ei-1];
            if (e.screen) {
                _entityDraw(e);
                if (frame % (GX.frameRate() / e.animate) == 0) {
                    GX.entityFrameNext(ei);
                }
            }
        }

        // Call out to any custom screen drawing
        _customDrawEvent(GX.EVENT_DRAWSCREEN);
        if (GX.debug()) { _debugFrameRate(); }

        // Copy the background image to the screen
        _customEvent(GX.EVENT_PAINTBEFORE);
        //_DontBlend
        //_PutImage , __gx_scene.image
        //_Blend
        _customEvent(GX.EVENT_PAINTAFTER);
    }
    
    async function _sceneUpdate() {
        _scene.frame++;
        if (_map_loading) { return; }

        // Call custom game update logic
        _customEvent(GX.EVENT_UPDATE);

        // Check for entity movement and collisions
        // TODO: filter out non-moving entities
        await _sceneMoveEntities();

        // Perform any auto-scene moves
        var sx, sy;
        if (_scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_POS ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_NEG) {
            sx = (GX.entityX(_scene.followEntity) + GX.entityWidth(_scene.followEntity) / 2) - GX.sceneWidth() / 2;
            if (sx < GX.sceneX() && _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_POS ||
                sx > GX.sceneX() && _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_X_NEG) {
                // don't move the scene
            } else {
                GX.scenePos(sx, GX.sceneY());
            }
        }
        if (_scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER ||
            _scene.followMode == GX.SCENE_FOLLOW_ENTITY_CENTER_Y) {
            sy = (GX.entityY(_scene.followEntity) + GX.entityHeight(_scene.followEntity) / 2) - GX.sceneHeight() / 2;
            GX.scenePos(GX.sceneX(), sy);
        }

        // Check the scene move constraints
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
    // Game events will be sent to the GXOnGameEvent method during the game
    // loop execution.
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
    // This method will cause the game loop to end and return control to the calling program.
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
    // The default position for a scene is (0,0). Negative x and y values are valid.
    // A non-zero value for dx will move the scene by the number of pixels specified to the right or left.
    // A non-zero value for dy will move the scene by the number of pixels specified up or down.
    function _sceneMove (dx, dy) {
        _scene.x = GX.sceneX() + dx;
        _scene.y = GX.sceneY() + dy;
    }

    // Positions the scene at the specified x and y coordinates.
    // The default position for a scene is (0,0). Negative x and y values are valid.
    function _scenePos (x, y) {
        _scene.x = x;
        _scene.y = y;
    }

    function _updateSceneSize() {
        if (GX.tilesetWidth() < 1 || GX.tilesetHeight() < 1) { return; }
        if (GX.mapIsometric()) {
            _scene.columns = Math.floor(GX.sceneWidth() / GX.tilesetWidth());
            _scene.rows = GX.sceneHeight() / (GX.tilesetWidth() / 4);
        } else {
            _scene.columns = Math.floor(GX.sceneWidth() / GX.tilesetWidth());
            _scene.rows = Math.floor(GX.sceneHeight() / GX.tilesetHeight());
        }
    }


    // Event functions
    // --------------------------------------------------------------------
    function _customEvent (eventType) {
        var e = {};
        e.event = eventType
        _onGameEvent(e);
    }

    function _customDrawEvent (eventType) {
        _customEvent(eventType)
    }


    function _keyDown(key) {
        return _qbBoolean(_pressedKeys[key]);
    }

    // Frame Functions
    // -------------------------------------------------------------------
    // Gets or sets the current frame rate (expressed in frames-per-second or FPS).
    function _frameRate (frameRate) {
        if (frameRate != undefined) {
            _framerate = frameRate;
        }
        return _framerate;
    }

    // Returns the current frame.
    // This is a frame counter that starts when GXSceneStart is called.
    // It is initially set to zero and is incremented on each frame.
    function _frame() {
        return _scene.frame;
    }

    // Image Functions
    // ------------------------------------------------------------------
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
            //img.src = await _vfs.getDataURL(file);
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
    // ----------------------------------------------------
    // Adds a new background image to the current scene.  Multiple background images may be added to the scene.
    // Background images are displayed in layers based on the order they are added.
    // One of the following modes must be specified:
    //   GXBG_STRETCH - Stretch the background image to the size of the scene.
    //   GXBG_SCROLL  - Fit the height of the background image to the size of the screen. 
    //                  Scroll the horizontal position relative to the position on the map.
    //   GXBG_WRAP    - Continuously wrap the background as the scene is moved.
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
        _bg[bi-1].wrapFactor = wrapFactor;
    }

    function _backgroundDraw (bi) {
        bi--;

        if (_bg[bi].mode == GX.BG_STRETCH) {
            _ctx.drawImage(_image(_bg[bi].image), 0, 0, _scene.width, _scene.height); // __gx_scene.image
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
    // ----------------------------------------------------------------------------
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
            // TODO: loop through list of loaded sounds so they can all be muted / unmuted
        }
        return _qbBoolean(_sound_muted);
    }
    
    // Entity Functions
    // -----------------------------------------------------------------------------
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
        GX.spriteDraw(ent.image, x, y, ent.spriteSeq, ent.spriteFrame, ent.width, ent.height); //, __gx_scene.image)
    }    

    function _entityAnimate (eid, seq, a) {
        _entities[eid-1].animate = a;
        _entities[eid-1].spriteSeq = seq;
        _entities[eid-1].seqFrames = _entityGetFrames(eid, seq); //_entity_animations[eid-1][seq-1].frames;
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
                    _onGameEvent(e);
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
        return _entityGetFrames(eid, seq); //_entity_animations[eid-1][seq-1].frames;
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

    function _entityCollisionOffsetLeft (eid) { return _entities[eid-1].coLeft; }
    function _entityCollisionOffsetTop (eid) { return _entities[eid-1].coTop; }
    function _entityCollisionOffsetRight (eid) { return _entities[eid-1].coRight; }
    function _entityCollisionOffsetBottom (eid) { return _entities[eid-1].coBottom; }

    // Map methods
    // ------------------------------------------------------------------
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
            _map_layer_info.push({ id: i+1, hidden: false });
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
        } catch (ex) {
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
            var imagePath = data.tileset.image.substring(data.tileset.image.lastIndexOf("/")+1);
            GX.tilesetCreate(parentPath + imagePath, data.tileset.width, data.tileset.height, data.tileset.tiles, data.tileset.animations);
            GX.mapCreate(data.columns, data.rows, data.layers.length);

            if (data.isometric) { GX.mapIsometric(true); }

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

        slen = readLong(fh);
        var data = vfs.readData(fh.file, fh.pos, slen)
        fh.pos += data.byteLength;

        // write the raw data out and read it back in as a string
        var ldataFile = vfs.createFile("layer.dat", tmpDir);
        vfs.writeData(ldataFile, data);
        ldataFile = vfs.getNode("layer.dat", tmpDir);
        var ldstr = vfs.readText(ldataFile);//', ldstr);
        vfs.removeFile(ldataFile, tmpDir);

        // inflate the compressed data and write it to a temp file
        var ldata = pako.inflate(vfs.textToData(ldstr));
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
        
        fh.pos++; // read the blank 0th element

        // read the tileset tiles data
        var asize = readInt(fh);
        var tiles = [];
        for (var i=0; i < 4; i++) { readInt(fh); } //' read the blank 0th element
        for (var i=1; i <= asize; i++) {
            readInt(fh); // not using id currently
            tiles.push([readInt(fh), readInt(fh), readInt(fh)]);
        }

        // read the tileset animations data
        asize = readInt(fh);
        var animations = [];
        for (var i=0; i < 3; i++) { readInt(fh); } //' read the first row
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
                    if (l > 0) {
                        GX.mapTile(col, row, l, ldata[li]);
                    }
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
            data = vfs.readData(fh.file, fh.pos, slen)
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

        var cdata = pako.deflate(ldata);

        writeLong(fh, cdata.byteLength);
        vfs.writeData(fh.file, cdata, fh.pos);
        fh.pos += cdata.byteLength;
        
        // write the tileset data
        writeInt(fh, 1); // version
        writeString(fh, "tileset.png");
        writeInt(fh, GX.tilesetWidth());
        writeInt(fh, GX.tilesetHeight());
        
        var pngFile = vfs.getNode("/_gxtmp/tileset.png", vfs.rootDirectory());
        writeLong(fh, pngFile.data.byteLength);
        var data = vfs.readData(pngFile, 0, pngFile.data.byteLength)
        vfs.writeData(fh.file, data, fh.pos);
        fh.pos += data.byteLength;

        fh.pos++; // skip the 0th element

        // write the tileset tiles data
        var tiles = GX.tilesetTiles();
        writeInt(fh, tiles.length-1);
        writeInt(fh, 0); // blank 0th element
        writeInt(fh, 0);
        writeInt(fh, 0);
        writeInt(fh, 0);

        for (var i=1; i < tiles.length; i++) {
            writeInt(fh, i); // id (not used)
            writeInt(fh, tiles[i][0]);
            writeInt(fh, tiles[i][1]);
            writeInt(fh, tiles[i][2]);
        }

        // write the tileset animations data
        var animations = GX.tilesetAnimations();
        writeInt(fh, animations.length-1);
        writeInt(fh, 0);
        writeInt(fh, 0);
        writeInt(fh, 0);
        
        for (var i=1; i < animations.length; i++) {
            writeInt(fh, animations[i][0]);
            writeInt(fh, animations[i][1]);
            writeInt(fh, animations[i][2]);
        }

        function writeInt(fh, value) {
            var buf = new ArrayBuffer(2);
            (new DataView(buf)).setInt16(0, value, true);
            vfs.writeData(fh.file, buf, fh.pos);
            fh.pos += buf.byteLength;
        }

        function writeLong(fh, value) {
            var buf = new ArrayBuffer(4);
            (new DataView(buf)).setInt32(0, value, true);
            vfs.writeData(fh.file, buf, fh.pos);
            fh.pos += buf.byteLength;
        }

        function writeString(fh, value) {
            writeLong(fh, value.length);
            var buf = new ArrayBuffer(value.length);
            for (var i=0; i < value.length; i++) {
                (new DataView(buf)).setUint8(i, value.charCodeAt(i));
            }
            vfs.writeData(fh.file, buf, fh.pos);
            fh.pos += buf.byteLength;
        }

    }

    function _mapLayerInit() {
        var layer = [];
        var layerSize = GX.mapRows() * GX.mapColumns();
        for (var i=0; i < layerSize; i++) {
            layer.push(0);
        }
        return layer;
    }

    function _mapLayerClear(layer) {
        var layerSize = GX.mapRows() * GX.mapColumns();
        for (var i=0; i < layerSize; i++) {
            _map_layers[layer-1][i] = 0;
        }
    }

    function _mapDraw() {
        for (var l=0; l < _map_layers.length; l++) {
            _mapDrawLayer(l);
        }
    }

    function _mapDrawLayer(layer) {
        var tile, tilePos, tileWidth, tileHeight, x, y, frame;
        var tsw, tsh;
        var rStart, rEnd, cStart, cEnd;
        var xOffset, yOffset;

        if (_map_layer_info[layer].hidden) { return; }
        
        frame = _scene.frame % GX.frameRate() + 1;
        tsw = GX.tilesetWidth();
        tsh = GX.tilesetHeight();
        if (tsw < 1 || tsh < 1) { return; }

        rStart = Math.max(0, Math.floor(GX.sceneY() / tsh));
        rEnd = Math.min(GX.mapRows(), rStart + GX.sceneRows() + 1);

        cStart = Math.max(0, Math.floor(GX.sceneX() / tsw));
        cEnd = Math.min(GX.mapColumns(), cStart + GX.sceneColumns() + 1);

        for (var r=rStart; r < rEnd; r++) {
            for (var c=cStart; c < cEnd; c++) {
                tile = _mapTile(c, r, layer+1);

                if (tile == 0) { continue; }

                tilePos = GX.tilesetTile(tile);
                tileWidth = tilePos[1];
                tileHeight = tilePos[2];
                xOffset = GX.sceneX() % tsw;
                yOffset = GX.sceneY() % tsh;

                x = c * tsw - GX.sceneX();
                y = r * tsh - GX.sceneY();

                GX.tilesetDraw(tile, x, y, tileWidth, tileHeight);
                
                if (GX.tilesetAnimate(tile) > 0) {
                    if (frame % (GX.frameRate() / GX.tilesetAnimate(tile)) == 0) {
                        GX.tilesetFrameNext(tile);
                    }
                }
            }
        }
    }

    function _mapIsometric (isometric) {
        if (isometric != undefined) {
            _map.isometric = isometric;
            _updateSceneSize();
        }
        return _qbBoolean(_map.isometric);
    }

    function _mapTile (c, r, l, tile) {
        if (r < 0 || r >= GX.mapRows()) { return 0; }
        if (c < 0 || c >= GX.mapColumns()) { return 0; }
        var index = r * GX.mapColumns() + c;
        if (tile != undefined) {
            _map_layers[l-1][index] = tile;
        }
        return _map_layers[l-1][index];
    }

    function _mapLayers() { return _map.layers; }
    function _mapRows() { return _map.rows; }
    function _mapColumns() { return _map.columns; }

    function _mapLayerHidden(layer, hidden) {
        if (hidden != undefined) {
            _map_layer_info[layer-1].hidden = hidden;
        }
        return _qbBoolean(_map_layer_info[layer-1].hidden);
    }


    // Tileset methods
    // ------------------------------------------------------------------
    function _tilesetCreate (imageFilename, tsw, tsh, tiles, animations) {
        _tileset.image = _imageLoad(imageFilename);
        _tileset.width = tsw;
        _tileset.height = tsh;
        _tileset.seq = 1;
        _tileset_tiles = [[0, 0, 0]];
        _tileset_animations = [[0, 0, 0]];
        _tileset.frame = new Array(tiles.length).fill(1);
        _tileset.prevFrame = new Array(tiles.length).fill(1);

        if (tiles) {
            _tileset_tiles = _tileset_tiles.concat(tiles);
        }
        if (animations) {
            _tileset_animations = _tileset_animations.concat(animations);
        }
        _updateSceneSize();
        _tileset.frames = new Array(_tileset_tiles.length).fill(1);
    }

    function _tilesetDraw(t, x, y, swidth, sheight) {
        var tile = _tilesetTile(t);
        var tileFrame = GX.tilesetFrame(t);
        var xoffset = (tileFrame - 1) * GX.tilesetWidth();
        var yoffset = (tile[0] - 1) * GX.tilesetHeight();
        
        _ctx.drawImage(_image(_tileset.image), xoffset, yoffset, tile[1], tile[2], x, y, swidth, sheight);
    }

    function _tilesetAnimate (tile) {
        return _tileset_animations[tile][1];
    }

    function _tilesetFrameNext (tile) {
        if (GX.tilesetAnimate(tile) == 0) { return; }
        var frames = GX.tilesetFrames(tile);

        if (_tileset.frame[tile] == frames) {
            _tileset.frame[tile] = 1;
        } else {
            _tileset.frame[tile]++;
        }
    }

    function _tilesetFrames (tile) {
        return _tileset_animations[tile][0];
    }

    function _tilesetFrame (tile) {
        return _tileset.frame[tile];
    }

    function _tilesetTile(t) { return _tileset_tiles[t]; }
    function _tilesetWidth() { return _tileset.width; }
    function _tilesetHeight() { return _tileset.height; }


    // Collision Methods
    // ---------------------------------------------------------------------------------
    function _mapTileCollide(x, y, layer, collidable) {
        if (GX.tilesetWidth() < 1 || GX.tilesetHeight() < 1) { return 0; }
        var c = Math.floor(x / GX.tilesetWidth());
        var r = Math.floor(y / GX.tilesetHeight());
        var tile = GX.mapTile(c, r, layer);
        if (tile > 0) {
            var tileCollide = GX.tilesetTile(tile)[0];
            if (collidable != undefined) {
                return _qbBoolean(tileCollide == collidable);
            }
            return tileCollide;
        }
        return 0;
    }

    function _entityEntityCollide(eid1, eid2) {
        var e1 = _entities[eid1-1];
        var e2 = _entities[eid2-1];

        return _qbBoolean(_rectCollide(e1.x + e1.coLeft, e1.y + e1.coTop, 
                            e1.width - e1.coLeft - e1.coRight, e1.height - e1.coTop - e1.coBottom, 
                            e2.x + e2.coLeft, e2.y + e2.coTop, 
                            e2.width - e2.coLeft - e2.coRight, e2.height - e2.coTop - e2.coBottom));
    }

    function _rectCollide(x1, y1, w1, h1, x2, y2, w2, h2) {
        return (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2);
    }

    function _mapEntityCollide(eid, layer, collidable) {
        var e = _entities[eid-1];
        var x = e.x;
        var y = e.y;
        var w = e.width;
        var h = e.height;
        var tsw = GX.tilesetWidth();
        var tsh = GX.tilesetHeight();
        var c = Math.floor(x / tsw);
        var r = Math.floor(y / tsh);

        // top left
        if (GX.mapTileCollide(x + e.coLeft, y + e.coTop, layer, collidable)) { return -1; }
        // top right
        if (GX.mapTileCollide(x + w - e.coRight - 1, y + e.coTop, layer, collidable)) { return -1; }
        // bottom left
        if (GX.mapTileCollide(x + e.coLeft, y + h - e.coBottom - 1, layer, collidable)) { return -1; }
        // bottom right
        if (GX.mapTileCollide(x + w - e.coRight - 1, y + h - e.coBottom - 1, layer, collidable)) { return -1; }

        return 0;
    }

    function _mapEntityCheckCollide(e, layer, collidable) {
        var x = e.x;
        var y = e.y;
        var w = e.width;
        var h = e.height;
        var tsw = GX.tilesetWidth();
        var tsh = GX.tilesetHeight();
        
        // top left
        if (GX.mapTileCollide(x + e.coLeft, y + e.coTop, layer, collidable)) { return -1; }
        // top right
        if (GX.mapTileCollide(x + w - e.coRight - 1, y + e.coTop, layer, collidable)) { return -1; }
        // bottom left
        if (GX.mapTileCollide(x + e.coLeft, y + h - e.coBottom - 1, layer, collidable)) { return -1; }
        // bottom right
        if (GX.mapTileCollide(x + w - e.coRight - 1, y + h - e.coBottom - 1, layer, collidable)) { return -1; }

        return 0;
    }

    function _mapTileIndex(eid, layer, collidable) {
        var e = _entities[eid-1];
        var x = e.x;
        var y = e.y;
        var w = e.width;
        var h = e.height;
        var tsw = GX.tilesetWidth();
        var tsh = GX.tilesetHeight();
        
        var tile = GX.mapTileCollide(x + e.coLeft, y + e.coTop, layer);
        if (tile > 0) { return tile; }
        tile = GX.mapTileCollide(x + w - e.coRight - 1, y + e.coTop, layer);
        if (tile > 0) { return tile; }
        tile = GX.mapTileCollide(x + e.coLeft, y + h - e.coBottom - 1, layer);
        if (tile > 0) { return tile; }
        tile = GX.mapTileCollide(x + w - e.coRight - 1, y + h - e.coBottom - 1, layer);
        if (tile > 0) { return tile; }
        
        return 0;
    }

    async function _sceneMoveEntities() {
        var dt = 1 / GX.frameRate();
        var dx, dy, x, y, step;

        for (var i=0; i < _entities_active.length; i++) {
            var eid = _entities_active[i];
            var e = _entities[eid-1];
            if (e.screen || e.vx == 0 && e.vy == 0 && e.applyGravity == false) { continue; }

            if (e.applyGravity) {
                e.vy += GX.gravity() * dt;
                if (e.vy > GX.terminalVelocity()) { e.vy = GX.terminalVelocity(); }
            }

            dx = e.vx * dt;
            dy = e.vy * dt;

            // X-Axis movement (steps)
            step = Math.round(Math.abs(dx));
            for (var j=0; j < step; j++) {
                x = e.x;
                if (dx > 0) {
                    e.x++;
                } else {
                    e.x--;
                }
                
                if (e.type) {
                    var ent = {};
                    ent.x = e.x;
                    ent.y = e.y;
                    ent.width = e.width;
                    ent.height = e.height;
                    ent.coLeft = e.coLeft;
                    ent.coTop = e.coTop;
                    ent.coRight = e.coRight;
                    ent.coBottom = e.coBottom;

                    var event = {
                        event: GX.EVENT_COLLIDE_MAP_MOVE,
                        entity: eid,
                        x: x,
                        y: e.y,
                        dx: e.vx,
                        dy: e.vy
                    }

                    _onGameEvent(event);

                    if (event.cancelled) {
                        e.x = event.x;
                        e.vx = event.dx;
                        e.vy = event.dy;
                    }
                }
                
                if (_mapEntityCheckCollide(e, 1, 1)) {
                    e.x = x;
                    e.vx = 0;
                    var event = {};
                    event.event = GX.EVENT_COLLIDE_MAP_X;
                    event.entity = eid;
                    _onGameEvent(event);
                    break;
                }
            }
            e.x = e.x + (dx % 1);
            
            // Y-Axis movement (steps)
            step = Math.round(Math.abs(dy));
            for (var j=0; j < step; j++) {
                y = e.y;
                if (dy > 0) {
                    e.y++;
                } else {
                    e.y--;
                }
                
                if (e.type) {
                    var ent = {};
                    ent.x = e.x;
                    ent.y = e.y;
                    ent.width = e.width;
                    ent.height = e.height;
                    ent.coLeft = e.coLeft;
                    ent.coTop = e.coTop;
                    ent.coRight = e.coRight;
                    ent.coBottom = e.coBottom;
                    
                    var event = {
                        event: GX.EVENT_COLLIDE_MAP_MOVE,
                        entity: eid,
                        x: e.x,
                        y: y,
                        dx: e.vx,
                        dy: e.vy
                    }

                    _onGameEvent(event);

                    if (event.cancelled) {
                        e.x = event.x;
                        e.vx = event.dx;
                        e.vy = event.dy;
                    }
                }

                if (_mapEntityCheckCollide(e, 1, 1)) {
                    e.y = y;
                    if (e.vy > 0) {
                        if (e.jumpstart < GX.frame()) {
                            // landing
                            var event = {};
                            event.event = GX.EVENT_COLLIDE_MAP_Y_DOWN;
                            event.entity = eid;
                            _onGameEvent(event);
                        }
                    } else {
                        // hitting ceiling
                        var event = {};
                        event.event = GX.EVENT_COLLIDE_MAP_Y_UP;
                        event.entity = eid;
                        _onGameEvent(event);
                    }
                    e.vy = 0;
                    break;
                }
            }
            e.y = e.y + (dy % 1);
        }
    }

    // Drawing Methods
    // ---------------------------------------------------------------------------------
    function _drawPoint (x, y, r, g, b, a) {
        _ctx.beginPath();
        _ctx.arc(x, y, 1, 0, 2 * Math.PI, false);
        _ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
        _ctx.fill();
    }

    function _drawCircle (x, y, radius, r, g, b, a) {
        _ctx.beginPath();
        _ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        _ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
        _ctx.fill();
    }

    function _drawLine (x1, y1, x2, y2, r, g, b, a) {
        _ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
        _ctx.beginPath();
        _ctx.moveTo(x1, y1);
        _ctx.lineTo(x2, y2);
        _ctx.stroke();
    }

    function _drawRect (x, y, w, h, r, g, b, a) {
        _ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
        _ctx.fillRect(x, y, w, h);
    }
    
    function _drawEllipse (x, y, w, h, r, g, b, a) {
        _ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
        _ctx.beginPath();
        _ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
        _ctx.fill();
    }

    // Font Methods
    // ---------------------------------------------------------------------------------
    function _fontLoad (filename, tsw, tsh, charmap) {
        var font = __newFont();
        font.eid = _screenEntityCreate(filename, tsw, tsh, 1);
        _fonts.push(font);

        if (charmap) {
            var charmap_arr = new Array(256).fill({x:0,y:0});
            var i, x, y;
            for (var c=0; c < 256; c++) {
                i = charmap[c];
                if (i) {
                    x = (i - 1) % (_images[_entities[font.eid-1].image-1].width / tsw);
                    y = Math.floor((i - 1) / (_images[_entities[font.eid-1].image-1].width / tsw));
                    charmap_arr[c] = {x: x + 1, y: y + 1};
                }
            }
            _font_charmap.push(charmap_arr);
        }
        
        return _fonts.length;
    }

    function _fontCreateDefault(fid) {
        _fonts[fid-1].eid = 
            _screenEntityCreate("/_gxtmp/font_default.png", 8, 8, 1);
        
        var charmap = new Array(256);
        for (var i=0; i < 256; i++) {
            charmap[i] = i+1;
        }

        var charmap_arr = new Array(256).fill({x:0,y:0});
        var i, x, y;
        var tsw = 8;
        for (var c=0; c < 256; c++) {
            i = charmap[c];
            if (i) {
                x = (i - 1) % 32;
                y = Math.floor((i - 1) / 32);
                charmap_arr[c] = {x: x + 1, y: y + 1};
            }
        }
        _font_charmap[fid-1] = charmap_arr;
    }

    function _fontCharSpacing (fid, charSpacing) {
        if (charSpacing != undefined) {
            _fonts[fid-1].charSpacing = charSpacing;
        }
        return _fonts[fid-1].charSpacing;
    }

    function _fontLineSpacing (fid, lineSpacing) {
        if (lineSpacing != undefined) {
            _fonts[fid-1].lineSpacing = lineSpacing;
        }
        return _fonts[fid-1].lineSpacing;
    }

    function _fontDraw (fid, x, y, text) {
        var ent = _entities[_fonts[fid-1].eid-1];
        var char, charPos, lines, lineH;
        var tsw = ent.width;
        var tsh = ent.height;
        var offsetX = 0;

        lines = text.split("\n");
        lineH = tsh + _fonts[fid-1].lineSpacing;

        for (var l=0; l < lines.length; l++) {
            offsetX = 0;
            for (var i=0; i < lines[l].length; i++) {
                char = lines[l].charCodeAt(i);
                charPos = _font_charmap[fid-1][char];

                if (charPos.x > 0) {
                    GX.spriteDraw(ent.image, x + offsetX, y + lineH * l, charPos.y, charPos.x, tsw, tsh);
                }
                offsetX += tsw + _fonts[fid-1].charSpacing;
            }
        }
    }

    // Debugging methods
    // ---------------------------------------------------------------------------------
    function _debug (enabled) {
        if (enabled != undefined) {
            __debug.enabled = enabled;
        }
        return _qbBoolean(__debug.enabled);
    }

    function _debugFont (fid) {
        if (fid != undefined) {
            __debug.font = fid;
        }
        return __debug.font;
    }
    
    function _debugFrameRate() {
        var ent = _entities[_fonts[__debug.font-1].eid-1];
        var text = GX.frameRate() + " FPS";
        var x = GX.sceneWidth() - (text.length * (ent.width + _fonts[__debug.font-1].charSpacing)) - 4;
        _fontDraw(__debug.font, x, 4, text);
    }


    // Virtual File System methods
    // ---------------------------------------------------------------------------------
    function _vfs() { return _vfs; }
    function _vfsCwd() { return _vfsCwd; }
    function _vfsCd(path) {
        var node = _vfs.getNode(path, _vfsCwd);
        if (node) {
            _vfsCwd = node;
            return -1;
        }
        return 0;
    }
    function _vfsLs(path) {
        var node = _vfs.getNode(path, _vfsCwd);
        if (node) {
            var items = "";
            for (var i=0; i < node.children.length; i++) {
                items += _vfs.fullPath(node.children[i]) + "\r\n";
            }
            return items;
        }
        return "";
    }


    // Global objects
    // ---------------------------------------------------------------------------------
    this.EVENT_INIT = 1;
    this.EVENT_UPDATE = 2;
    this.EVENT_DRAWBG = 3;
    this.EVENT_DRAWMAP = 4;
    this.EVENT_DRAWSCREEN = 5;
    this.EVENT_PAINTBEFORE = 6;
    this.EVENT_PAINTAFTER = 7;
    this.EVENT_COLLIDE_MAP_X = 8;
    this.EVENT_COLLIDE_MAP_Y_UP = 9;
    this.EVENT_COLLIDE_MAP_Y_DOWN = 10;
    this.EVENT_COLLIDE_ENTITY = 11;
    this.EVENT_ANIMATE_COMPLETE = 12;
    this.EVENT_COLLIDE_MAP_MOVE = 13;

    this.BG_STRETCH = 1;
    this.BG_SCROLL = 2;
    this.BG_WRAP = 3;

    this.SCENE_FOLLOW_NONE = 0;
    this.SCENE_FOLLOW_ENTITY_CENTER = 1;
    this.SCENE_FOLLOW_ENTITY_CENTER_X = 2;
    this.SCENE_FOLLOW_ENTITY_CENTER_Y = 3;
    this.SCENE_FOLLOW_ENTITY_CENTER_X_POS = 4;
    this.SCENE_FOLLOW_ENTITY_CENTER_X_NEG = 5;

    this.SCENE_CONSTRAIN_NONE = 0;
    this.SCENE_CONSTRAIN_TO_MAP = 1;

    this.ANIMATE_LOOP = 1;
    this.ANIMATE_SINGLE = 2;

    this.COLLIDE_NONE = 0;
    this.COLLIDE_SOLID = 1;
    this.COLLIDE_SLOPE = 2;

    this.FONT_DEFAULT = 1;
    this.FONT_DEFAULT_BLACK = 2;


    // Scene methods
    // ------------------------------------------------------------------
    this.sceneCreate = _sceneCreate;
    this.sceneResize = _sceneResize;
    this.sceneScale = _sceneScale;
    this.sceneDraw = _sceneDraw;
    this.sceneUpdate = _sceneUpdate;
    this.sceneStart = _sceneStart;
    this.sceneStop = _sceneStop;
    this.sceneFollowEntity = _sceneFollowEntity;
    this.sceneConstrain = _sceneConstrain;
    this.sceneMove = _sceneMove;
    this.scenePos = _scenePos;

    this.sceneX = _sceneX;
    this.sceneY = _sceneY;
    this.sceneWidth = _sceneWidth;
    this.sceneHeight = _sceneHeight;
    this.sceneColumns = _sceneColumns;
    this.sceneRows = _sceneRows;

    // Game loop methods
    // ------------------------------------------------------------------
    this.registerGameEvents = _registerGameEvents;
    this.resourcesLoaded = _resourcesLoaded;
    this.reset = _reset;

    // Frame methods
    // ------------------------------------------------------------------
    this.frameRate = _frameRate;
    this.frame = _frame;

    // Input methods
    // ------------------------------------------------------------------
    this.keyDown = _keyDown;
    this.mouseButton = function(btn) { return _mouseButtons[btn-1]; }
    this.mouseWheel = function() {
        var w = _mouseWheelFlag;
        _mouseWheelFlag = 0;
        return w;
    }
    this.mouseInputFlag = function() { return _mouseInputFlag; }
    this.mousePos = function() { return _mousePos; }
    this.touchInputFlag = function() { return _touchInputFlag; }
    this.touchPos = function() { return _touchPos; }
    this.bindTouchToMouse = function(bind) {
        if (bind != undefined) { _bindTouchToMouse = bind; }
        return _bindTouchToMouse;
    }


    // Image methods
    // ------------------------------------------------------------------
    this.imageLoad = _imageLoad;
    this.spriteDraw = _spriteDraw;
    this.spriteDrawScaled = _spriteDrawScaled;

    // Background methods
    // ------------------------------------------------------------------
    this.backgroundAdd = _backgroundAdd;
    this.backgroundWrapFactor = _backgroundWrapFactor;
    this.backgroundClear = _backgroundClear;

    // Sound methods
    // ------------------------------------------------------------------
    this.soundClose = _soundClose;
    this.soundLoad = _soundLoad;
    this.soundPlay = _soundPlay;
    this.soundRepeat = _soundRepeat;
    this.soundVolume = _soundVolume;
    this.soundPause = _soundPause;
    this.soundStop = _soundStop;
    this.soundStopAll = _soundStopAll;
    this.soundMuted = _soundMuted;

    // Entity methods
    // ------------------------------------------------------------------
    this.entityCreate = _entityCreate;
    this.screenEntityCreate = _screenEntityCreate;
    this.entityAnimate = _entityAnimate;
    this.entityAnimateStop = _entityAnimateStop;
    this.entityAnimateMode = _entityAnimateMode;
    this.entityMove = _entityMove;
    this.entityPos = _entityPos;
    this.entityVX = _entityVX;
    this.entityVY = _entityVY;
    this.entityVisible = _entityVisible;
    this.entityFrameNext = _entityFrameNext;
    this.entityFrameSet = _entityFrameSet;
    this.entityCollisionOffset = _entityCollisionOffset;
    this.entityApplyGravity = _entityApplyGravity;

    this.entityX = _entityX;
    this.entityY = _entityY;
    this.entityWidth = _entityWidth;
    this.entityHeight = _entityHeight;
    this.entityFrame = _entityFrame;
    this.entitySequence = _entitySequence;
    this.entitySequences = _entitySequences;
    this.entityFrames = _entityFrames;
    this.entityType = _entityType;
    this.entityMapLayer = _entityMapLayer;

    this.entityCollisionOffsetLeft = _entityCollisionOffsetLeft;
    this.entityCollisionOffsetTop = _entityCollisionOffsetTop;
    this.entityCollisionOffsetRight = _entityCollisionOffsetRight;
    this.entityCollisionOffsetBottom = _entityCollisionOffsetBottom;

    // Map methods
    // ------------------------------------------------------------------
    this.mapCreate = _mapCreate;
    this.mapLoad = _mapLoad;
    this.mapSave = _mapSave;
    this.mapTile = _mapTile;
    this.mapLayerClear = _mapLayerClear;
    this.mapIsometric = _mapIsometric;
    this.mapLayerHidden = _mapLayerHidden;

    this.mapLayers = _mapLayers;
    this.mapRows = _mapRows;
    this.mapColumns = _mapColumns;

    // Tileset methods
    // ------------------------------------------------------------------
    this.tilesetCreate = _tilesetCreate;
    this.tilesetTile = _tilesetTile;
    this.tilesetWidth = _tilesetWidth;
    this.tilesetHeight = _tilesetHeight;
    this.tilesetDraw = _tilesetDraw;
    this.tilesetAnimate = _tilesetAnimate;
    this.tilesetFrames = _tilesetFrames;
    this.tilesetFrameNext = _tilesetFrameNext;
    this.tilesetFrame = _tilesetFrame;

    // Collision methods
    // ------------------------------------------------------------------
    this.mapTileCollide = _mapTileCollide;
    this.entityEntityCollide = _entityEntityCollide;
    this.mapEntityCollide = _mapEntityCollide;
    this.mapTileIndex = _mapTileIndex;

    // Drawing methods
    // ------------------------------------------------------------------
    this.drawPoint = _drawPoint;
    this.drawCircle = _drawCircle;
    this.drawLine = _drawLine;
    this.drawRect = _drawRect;
    this.drawEllipse = _drawEllipse;

    // Font methods
    // ------------------------------------------------------------------
    this.fontLoad = _fontLoad;
    this.fontDraw = _fontDraw;
    this.fontCharSpacing = _fontCharSpacing;
    this.fontLineSpacing = _fontLineSpacing;

    // Debugging methods
    // ------------------------------------------------------------------
    this.debug = _debug;
    this.debugFont = _debugFont;

    // VFS methods
    // ------------------------------------------------------------------
    this.vfs = _vfs;
    this.vfsCwd = _vfsCwd;
    this.vfsCd = _vfsCd;
    this.vfsLs = _vfsLs;
}

// Global functions
// ---------------------------------------------------------------------------------
async function _getJSON(url) {
    let response = await fetch(url);
    if (response.ok) {
        let json = await response.json();
        return json;
    } else {
        throw new Error(response.status);
    }
}

function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


var VFS = new function() {
    this.FILE = 1;
    this.DIR = 2;

    var _rootDir = { name: "", path: "", type: this.DIR, children: [] };
    var _dataView = null;
    var _fileReader = new FileReader();

    this.createFile = function(filename, parent) {
        var node = { name: filename, path: parent.path + filename, type: this.FILE, data: null };
        parent.children.push(node);
        return node;
    };

    this.createDirectory = function(dirname, parent) {
        var node = { name: dirname, path: parent.path + dirname + "/", type: this.DIR, children: [] };
        parent.children.push(node);
        return node;
    };

    this.removeFile = function(file, parent) {
        for (var i=0; i < parent.children.length; i++) {
            if (parent.children[i] == file) {
                parent.children.splice(i, 1);
                return;
            }
        }
    };

    this.fullPath = function(node) {
        return node.path;
    };

    this.getParentPath = function(path) {
        var i = path.lastIndexOf("/");
        return path.substring(0, i+1);
    };

    this.getFileName = function(path) {
        var i = path.lastIndexOf("/");
        return path.substring(i+1);
    };

    this.getNode = function(path, cwd) {
        if (path == "") { return cwd; }
        if (path == "/") { return _rootDir; }
        
        var parts = path.split("/");
        var node = cwd;
        if (path.startsWith("/")) { node = _rootDir; }
        
        for (var i=0; i < parts.length; i++) {
            if (parts[i] == "") { continue; }
            if (parts[i] == ".") { continue; }
            if (parts[i] == "..") {
                if (node.path != "") {
                    var parentPath = this.getParentPath(node.path.substring(0, node.path.length-1));
                    node = this.getNode(parentPath, _rootDir);
                }
                continue;
            }

            var found = false;
            for (var j=0; j < node.children.length; j++) {
                if (node.children[j].name == parts[i]) {
                    node = node.children[j];
                    found = true;
                    break;
                }
            }
            if (!found) { return null; }
        }
        return node;
    };

    this.rootDirectory = function() { return _rootDir; };
    
    this.writeData = function(node, data, pos) {
        if (!pos) { pos = 0; }
        if (!node.data) { node.data = new Uint8Array(data); }
        else {
            if (node.data.byteLength < pos + data.byteLength) {
                var newBuf = new Uint8Array(pos + data.byteLength);
                newBuf.set(node.data, 0);
                node.data = newBuf;
            }
        }
        
        if (data instanceof ArrayBuffer) {
            node.data.set(new Uint8Array(data), pos);
        }
        else {
            node.data.set(data, pos);
        }
    };

    this.readData = function(node, pos, length) {
        return node.data.buffer.slice(pos, pos + length);
    };

    this.readText = function(node) {
        var text = "";
        for (var i=0; i < node.data.byteLength; i++) {
            text += String.fromCharCode(node.data[i]);
        }
        return text;
    };
    
    this.getDataURL = async function(node) {
        return new Promise((resolve, reject) => {
            var blob = new Blob([node.data], {type: "image/png"});
            _fileReader.onload = function(e) {
                resolve(e.target.result);
            }
            _fileReader.readAsDataURL(blob);
        });
    };

    this.textToData = function(str) {
        var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i=0; i < str.length; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }
};

// Array functions (QB compatible)
// ---------------------------------------------------------------------------------
var GXARRAY = new function() {
    this.dim = function(a, newObj, dimensions) {
        a._newObj = newObj;
        if (a.length > 0) {
            var props = Object.getOwnPropertyNames(a);
            for (var i = 0; i < props.length; i++) {
                if (props[i] != "_newObj") {
                    delete a[props[i]];
                }
            }
        }
        if (dimensions && dimensions.length > 0) {
            a._dimensions = dimensions;
        }
        else {
            // default to single dimension to support Dim myArray() syntax
            // for convenient hashtable declaration
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

};    
    

// Consider moving these to separate optional js files
var GXSTR = new function() {
    this.lPad = function(str, padChar, padLength) {
        return String(str).padStart(padLength, padChar);
    }
    
    this.rPad = function(str, padChar, padLength) {
        return String(str).padEnd(padLength, padChar);
    }

    this.mid = function(str, start, length) {
        return String(str).substring(start - 1, start + length - 1);
    }
}
