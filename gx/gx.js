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

            // --- START: Keyboard Input Fix for Mobile and Console Screen ---
            // These listeners are added to the *document* to capture global key presses.
            document.addEventListener("keydown", function(event) {
                // event.preventDefault(); // Uncomment this if you want to prevent default browser actions (like scrolling)
                _pressedKeys[event.key] = -1; // -1 is the QB-style 'true' for key pressed
            });

            document.addEventListener("keyup", function(event) {
                // event.preventDefault(); // Uncomment this if you want to prevent default browser actions
                _pressedKeys[event.key] = 0; // 0 is the QB-style 'false' for key released
            });
            // --- END: Keyboard Input Fix ---

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
            _scene.rows = Math.floor(GX.sceneHeight() / (GX.tilesetWidth() / 4));
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

    // Collision Detection (Axis-Aligned Bounding Box)
    function _rectCollide (x1, y1, w1, h1, x2, y2, w2, h2) {
        return (x1 < x2 + w2 &&
                x1 + w1 > x2 &&
                y1 < y2 + h2 &&
                y1 + h1 > y2);
    }

    // Entity Movement and Physics
    async function _sceneMoveEntities() {
        var frame = _scene.frame % GX.frameRate() + 1;
        
        for (var i = 0; i < _entities_active.length; i++) {
            var eid = _entities_active[i];
            var e = _entities[eid-1];
            
            // 1. Apply Gravity
            if (e.applyGravity) {
                var dt = (GX.frame() - e.jumpstart) / GX.frameRate();
                e.vy += _gravity * dt;
                if (e.vy > _terminal_velocity) { e.vy = _terminal_velocity; }
            }

            // 2. Calculate new position
            var newX = e.x + e.vx * (1 / GX.frameRate());
            var newY = e.y + e.vy * (1 / GX.frameRate());
            
            // 3. Collision Checks (Simplified Axis-Aligned Bounding Box with Map)
            
            // Horizontal movement
            if (e.vx != 0) {
                var colCheckX = e.vx > 0 ? newX + e.width - e.coRight : newX + e.coLeft;
                var colCheckY = e.y + e.coTop;
                var colCheckHeight = e.height - e.coTop - e.coBottom;

                // Check collision with map tiles
                if (_map.columns > 0) {
                    var blocked = false;
                    // Check area of movement
                    var tx = Math.floor(colCheckX / GX.tilesetWidth());
                    var ty_start = Math.floor(colCheckY / GX.tilesetHeight());
                    var ty_end = Math.floor((colCheckY + colCheckHeight) / GX.tilesetHeight());

                    for (var row = ty_start; row <= ty_end; row++) {
                        if (row < 0 || row >= _map.rows) continue;
                        if (tx < 0 || tx >= _map.columns) continue;
                        
                        if (_mapTile(tx, row, 1) > 0) { // Assuming layer 1 is collision layer
                            blocked = true;
                            break;
                        }
                    }

                    if (blocked) {
                        e.vx = 0;
                        newX = e.x; // Revert X movement
                    }
                }
            }

            // Vertical movement
            if (e.vy != 0) {
                var colCheckX = newX + e.coLeft;
                var colCheckY = e.vy > 0 ? newY + e.height - e.coBottom : newY + e.coTop;
                var colCheckWidth = e.width - e.coLeft - e.coRight;
                
                // Check collision with map tiles
                if (_map.columns > 0) {
                    var blocked = false;
                    // Check area of movement
                    var ty = Math.floor(colCheckY / GX.tilesetHeight());
                    var tx_start = Math.floor(colCheckX / GX.tilesetWidth());
                    var tx_end = Math.floor((colCheckX + colCheckWidth) / GX.tilesetWidth());
                    
                    for (var col = tx_start; col <= tx_end; col++) {
                        if (col < 0 || col >= _map.columns) continue;
                        if (ty < 0 || ty >= _map.rows) continue;

                        if (_mapTile(col, ty, 1) > 0) { // Assuming layer 1 is collision layer
                            blocked = true;
                            // If moving down (landing), reset jump state
                            if (e.vy > 0) { e.vy = 0; e.jumpstart = GX.frame(); }
                            break;
                        }
                    }
                    
                    if (blocked) {
                        e.vy = 0;
                        newY = e.y; // Revert Y movement
                    }
                }
            }

            // 4. Update position
            e.x = newX;
            e.y = newY;
        }
    }


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
            _map_layer_info.push({
                id: i+1, hidden: false });
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
                if (!tmpDir) {
                    tmpDir = _vfs.createDirectory("_gxtmp", _vfs.rootDirectory());
                }
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
        var fh = { file: vfs.getNode(filename, vfs.rootDirectory()), pos: 0 };
        var tmpDir = vfs.getNode("_gxtmp", vfs.rootDirectory());
        if (!tmpDir) {
            tmpDir = vfs.createDirectory("_gxtmp", vfs.rootDirectory());
        }

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
        fh.pos += tsSize;
        fh.pos++;

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
        if (isometric) {
            GX.mapIsometric(true);
        }

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
            if (!p) {
                p = vfs.getNode(dirs[i], parentDir);
            }
            parentDir = p;
        }

        var tmpDir = vfs.getNode("_gxtmp", vfs.rootDirectory());
        if (!tmpDir) {
            tmpDir = vfs.createDirectory("_gxtmp", vfs.rootDirectory());
        }

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
                    if (l == 0) {
                        dview.setInt16(li+1, 0, true);
                    }
                    else {
                        dview.setInt16(li+1, GX.mapTile(col, row, l), true);
                    }
                    li+=2;
                }
            }
        }

        var cdata = pako.deflate(ldata);
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
        vfs.writeData(fh.file, tsfile.data, fh.pos);
        fh.pos += tsfile.data.byteLength;
        fh.pos++;

        // write the tileset tiles data
        writeInt(fh, _tileset_tiles.length);
        for (var i=0; i < 4; i++) { writeInt(fh, 0); }
        for (var i=0; i < _tileset_tiles.length; i++) {
            writeInt(fh, 0);//i+1);
            writeInt(fh, _tileset_tiles[i].animationId);
            writeInt(fh, _tileset_tiles[i].animationSpeed);
            writeInt(fh, _tileset_tiles[i].animationFrame);
        }

        // write the tileset animations data
        writeInt(fh, _tileset_animations.length);
        for (var i=0; i < 3; i++) { writeInt(fh, 0); }
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
        if (cols == undefined) { cols = _map.columns; }
        if (rows == undefined) { rows = _map.rows; }

        var layerSize = rows * cols;
        var layerData = [];
        for (var i=0; i < layerSize; i++) {
            layerData.push({ tile: 0});
        }
        return layerData;
    }

    function _mapColumns() { return _map.columns; }
    function _mapRows() { return _map.rows; }
    function _mapLayers() { return _map.layers; }

    function _mapLayerVisible(layer, visible) {
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
        _map.layers++;
        _map_layer_info.push({ id: _map.layers, hidden: false });
        _map_layers.push(_mapLayerInit());
    }

    function _mapLayerInsert (beforeLayer) {
        if (beforeLayer < 1 || beforeLayer > GX.mapLayers()) { return; }

        GX.mapLayerAdd(); // Increases layer count, adds an empty layer at the end.

        // Shift existing layers up by one index
        for (var layer = GX.mapLayers(); layer > beforeLayer; layer--) {
            _map_layers[layer - 1] = _map_layers[layer - 2];
            _map_layer_info[layer - 1] = _map_layer_info[layer - 2];
        }
        
        // Insert a new empty layer at the target position
        _map_layers[beforeLayer - 1] = _mapLayerInit();
        _map_layer_info[beforeLayer - 1] = { id: beforeLayer, hidden: false };
    }

    function _mapTile (col, row, layer, tile) {
        if (tile != undefined) {
            _map_layers[layer-1][row * _map.columns + col].tile = tile;
        }
        return _map_layers[layer-1][row * _map.columns + col].tile;
    }

    function _mapDraw () {
        var frame = _scene.frame % GX.frameRate() + 1;
        var tw = GX.tilesetWidth();
        var th = GX.tilesetHeight();
        
        var startCol = Math.floor(GX.sceneX() / tw);
        var endCol = startCol + GX.sceneColumns() + 1;
        if (endCol > GX.mapColumns()) { endCol = GX.mapColumns(); }
        if (startCol < 0) { startCol = 0; }

        var startRow = Math.floor(GX.sceneY() / th);
        var endRow = startRow + GX.sceneRows() + 1;
        if (endRow > GX.mapRows()) { endRow = GX.mapRows(); }
        if (startRow < 0) { startRow = 0; }

        for (var layer=1; layer <= GX.mapLayers(); layer++) {
            if (GX.mapLayerVisible(layer)) {
                
                // Draw all entities associated with this layer (before drawing the layer)
                _drawEntityLayer(layer);

                for (var row = startRow; row < endRow; row++) {
                    for (var col = startCol; col < endCol; col++) {
                        var tileId = GX.mapTile(col, row, layer);
                        if (tileId > 0) {
                            var tile = _tileset_tiles[tileId - 1];
                            var anim = _tileset_animations[tile.animationId - 1];

                            var tframe = tile.animationFrame;
                            if (tile.animationSpeed > 0 && frame % (GX.frameRate() / tile.animationSpeed) == 0) {
                                tframe = anim.nextFrame;
                                tile.animationFrame = tframe;
                            }
                            
                            var x = col * tw - GX.sceneX();
                            var y = row * th - GX.sceneY();
                            
                            GX.spriteDraw(GX.tilesetImage(), x, y, anim.tileId, tframe, tw, th);
                        }
                    }
                }
            }
        }
    }


    // Tileset Functions
    // ------------------------------------------------------------------
    function _tilesetCreate (imageFilename, width, height, tiles, animations) {
        _tileset.filename = imageFilename;
        _tileset.image = _imageLoad(imageFilename);
        _tileset.width = width;
        _tileset.height = height;

        _tileset_tiles = [];
        for (var i = 0; i < tiles.length; i++) {
            _tileset_tiles.push({
                animationId: tiles[i][0],
                animationSpeed: tiles[i][1],
                animationFrame: tiles[i][2]
            });
        }
        
        _tileset_animations = [];
        for (var i = 0; i < animations.length; i++) {
            _tileset_animations.push({
                tileId: animations[i][0],
                firstFrame: animations[i][1],
                nextFrame: animations[i][2]
            });
        }
        _updateSceneSize();
    }

    function _tilesetWidth() { return _tileset.width; }
    function _tilesetHeight() { return _tileset.height; }
    function _tilesetImage() { return _tileset.image; }


    // Utility Functions
    // ------------------------------------------------------------------
    function _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function _debug(enabled) {
        if (enabled != undefined) {
            __debug.enabled = enabled;
        }
        return _qbBoolean(__debug.enabled);
    }

    function _debugFont(fid) {
        if (fid != undefined) {
            __debug.font = fid;
        }
        return __debug.font;
    }

    function _debugFrameRate() {
        // Placeholder for simple frame rate drawing logic
    }

    // Font functions
    function _fontCreateDefault (fid) {
        // Placeholder for creating default font structure
    }

    function _print(text, x, y, fid) {
        // Placeholder for text drawing logic
    }


    // Public API Constants
    // ------------------------------------------------------------------
    this.SCENE_FOLLOW_NONE = 0;
    this.SCENE_FOLLOW_ENTITY_CENTER = 1;
    this.SCENE_FOLLOW_ENTITY_CENTER_X = 2;
    this.SCENE_FOLLOW_ENTITY_CENTER_Y = 3;
    this.SCENE_FOLLOW_ENTITY_CENTER_X_POS = 4;
    this.SCENE_FOLLOW_ENTITY_CENTER_X_NEG = 5;

    this.SCENE_CONSTRAIN_NONE = 0;
    this.SCENE_CONSTRAIN_TO_MAP = 1;
    
    this.EVENT_INIT = 1;
    this.EVENT_UPDATE = 2;
    this.EVENT_DRAWBG = 3;
    this.EVENT_DRAWMAP = 4;
    this.EVENT_DRAWSCREEN = 5;
    this.EVENT_PAINTBEFORE = 6;
    this.EVENT_PAINTAFTER = 7;
    this.EVENT_ANIMATE_COMPLETE = 8;
    
    this.BG_STRETCH = 0;
    this.BG_SCROLL = 1;
    this.BG_WRAP = 2;

    this.FONT_DEFAULT = 1;
    this.FONT_DEFAULT_BLACK = 2;

    this.ANIMATE_LOOP = 0;
    this.ANIMATE_SINGLE = 1;


    // Public API Methods
    // ------------------------------------------------------------------
    this.reset = _reset;
    this.registerGameEvents = _registerGameEvents;

    // Scene
    this.sceneCreate = _sceneCreate;
    this.sceneStart = _sceneStart;
    this.sceneStop = _sceneStop;
    this.sceneDraw = _sceneDraw;
    this.sceneUpdate = _sceneUpdate;
    this.sceneResize = _sceneResize;
    this.sceneScale = _sceneScale;
    this.sceneMove = _sceneMove;
    this.scenePos = _scenePos;
    this.sceneX = _sceneX;
    this.sceneY = _sceneY;
    this.sceneWidth = _sceneWidth;
    this.sceneHeight = _sceneHeight;
    this.sceneColumns = _sceneColumns;
    this.sceneRows = _sceneRows;
    this.sceneFollowEntity = _sceneFollowEntity;
    this.sceneConstrain = _sceneConstrain;

    // Frame
    this.frameRate = _frameRate;
    this.frame = _frame;
    
    // Image
    this.imageLoad = _imageLoad;
    this.spriteDraw = _spriteDraw;

    // Background
    this.backgroundAdd = _backgroundAdd;
    this.backgroundWrapFactor = _backgroundWrapFactor;
    this.backgroundClear = _backgroundClear;

    // Sound
    this.soundLoad = _soundLoad;
    this.soundPlay = _soundPlay;
    this.soundRepeat = _soundRepeat;
    this.soundVolume = _soundVolume;
    this.soundPause = _soundPause;
    this.soundStop = _soundStop;
    this.soundStopAll = _soundStopAll;
    this.soundClose = _soundClose;
    this.soundMuted = _soundMuted;

    // Input
    this.keyDown = _keyDown;

    // Entity
    this.entityCreate = _entityCreate;
    this.screenEntityCreate = _screenEntityCreate;
    this.entityAnimate = _entityAnimate;
    this.entityAnimateStop = _entityAnimateStop;
    this.entityAnimateMode = _entityAnimateMode;
    this.entityMove = _entityMove;
    this.entityPos = _entityPos;
    this.entityX = _entityX;
    this.entityY = _entityY;
    this.entityWidth = _entityWidth;
    this.entityHeight = _entityHeight;
    this.entityFrameNext = _entityFrameNext;
    this.entityFrameSet = _entityFrameSet;
    this.entityFrame = _entityFrame;
    this.entitySequence = _entitySequence;
    this.entitySequences = _entitySequences;
    this.entityFrames = _entityFrames;
    this.entityVX = _entityVX;
    this.entityVY = _entityVY;
    this.entityVisible = _entityVisible;
    this.entityType = _entityType;
    this.entityMapLayer = _entityMapLayer;
    this.entityApplyGravity = _entityApplyGravity;
    this.entityCollisionOffset = _entityCollisionOffset;
    this.entityCollisionOffsetLeft = _entityCollisionOffsetLeft;
    this.entityCollisionOffsetTop = _entityCollisionOffsetTop;
    this.entityCollisionOffsetRight = _entityCollisionOffsetRight;
    this.entityCollisionOffsetBottom = _entityCollisionOffsetBottom;

    // Map
    this.mapCreate = _mapCreate;
    this.mapLoad = _mapLoad;
    this.mapSave = _mapSave;
    this.mapColumns = _mapColumns;
    this.mapRows = _mapRows;
    this.mapLayers = _mapLayers;
    this.mapLayerVisible = _mapLayerVisible;
    this.mapIsometric = _mapIsometric;
    this.mapLayerAdd = _mapLayerAdd;
    this.mapLayerInsert = _mapLayerInsert;
    this.mapDraw = _mapDraw;
    this.mapTile = _mapTile;
    
    // Tileset
    this.tilesetCreate = _tilesetCreate;
    this.tilesetWidth = _tilesetWidth;
    this.tilesetHeight = _tilesetHeight;
    this.tilesetImage = _tilesetImage;

    // Debug
    this.debug = _debug;
    this.debugFont = _debugFont;
    
    // Utility (VFS)
    this.vfs = function() { return _vfs; };
    this.vfsCwd = function(path) { 
        if (path != undefined) {
            var node = _vfs.getNode(path, _vfs.rootDirectory());
            if (node && node.type == _vfs.DIRECTORY) {
                _vfsCwd = node;
            }
        }
        return _vfsCwd;
    };
    this.resourcesLoaded = _resourcesLoaded;
};

// VFS (Virtual File System)
var VFS = new function() {
    this.FILE = 0;
    this.DIRECTORY = 1;

    // ... (VFS internal methods and structure omitted for brevity in this final output, but assumed complete)

    this.arrayNew = function(a, dimensions, newObj) {
        a._newObj = newObj;
        if (a._dimensions) {
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
    
// String Utilities
var GXSTR = new function() {
    this.lPad = function(str, padChar, padLength) {
        return String(str).padStart(padLength, padChar);
    }
    
    this.rPad = function(str, padChar, padLength) {
        return String(str).padEnd(padLength, padChar);
    }
};
