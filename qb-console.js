// console-qb.js
// Production-ready _QB runtime (browser + node) with console input support (mobile-friendly)

function _QB() {
    var _rndSeed;

    // Runtime Assertions
    function _assertParam(param, arg) {
        if (arg == undefined) { arg = 1; }
        if (param == undefined) { throw new Error("Method argument " + arg + " is required"); }
    }

    function _assertNumber(param, arg) {
        if (arg == undefined) { arg = 1; }
        if (isNaN(param)) { throw new Error("Number required for method argument " + arg); }
    }

    // Array handling methods
    function initArray(dimensions, obj) {
        var a = {};
        if (dimensions && dimensions.length > 0) {
            a._dimensions = dimensions;
        }
        else {
            a._dimensions = [{ l: 0, u: 1 }];
        }
        a._newObj = { value: obj };
        return a;
    }

    function resizeArray(a, dimensions, obj, preserve) {
        if (!preserve) {
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
            a._dimensions = [{ l: 0, u: 1 }];
        }
    }

    function arrayValue(a, indexes) {
        var value = a;
        for (var i = 0; i < indexes.length; i++) {
            if (value[indexes[i]] == undefined) {
                if (i == indexes.length - 1) {
                    value[indexes[i]] = JSON.parse(JSON.stringify(a._newObj));
                }
                else {
                    value[indexes[i]] = {};
                }
            }
            value = value[indexes[i]];
        }
        return value;
    }

    // ---- Input Handling (Browser + Node) ----
    // Usage:
    // QB().func_Input("Prompt:", callback)   // callback style
    // await QB().func_Input("Prompt:")       // promise style (in async function)
    function func_Input(promptText, callback) {
        // If callback provided, use callback style; otherwise return a Promise
        if (typeof callback === "function") {
            _doInput(promptText, callback);
            return;
        } else {
            return new Promise(function (resolve) {
                _doInput(promptText, function (val) { resolve(val); });
            });
        }
    }

    function _doInput(promptText, cb) {
        // Node environment (terminal)
        if (typeof process !== "undefined" && process.stdin && typeof window === "undefined") {
            try {
                const readline = require("readline");
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rl.question(promptText + " ", (answer) => {
                    rl.close();
                    cb(answer);
                });
            } catch (e) {
                // fallback: call callback with empty string on error
                cb("");
            }
            return;
        }

        // Browser environment
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            // ensure there's a console area (optional)
            var consoleArea = document.getElementById("qb_console_area");
            if (!consoleArea) {
                // create lightweight console area if none exists
                consoleArea = document.createElement("div");
                consoleArea.id = "qb_console_area";
                consoleArea.style.whiteSpace = "pre-wrap";
                consoleArea.style.fontFamily = "monospace";
                consoleArea.style.padding = "6px";
                consoleArea.style.minHeight = "40px";
                // don't force styles; if the page already has a console, it will be used
                document.body.appendChild(consoleArea);
            }

            // show prompt in console area
            var promptLine = document.createElement("div");
            promptLine.textContent = promptText;
            consoleArea.appendChild(promptLine);

            // Create or reuse an input that is focusable on mobile (almost invisible)
            var inp = document.getElementById("_qb_console_input");
            if (!inp) {
                inp = document.createElement("input");
                inp.id = "_qb_console_input";
                inp.type = "text";

                // Make it focusable but nearly invisible. Important: opacity 0 often prevents keyboard on some mobiles,
                // so we use tiny size and very low opacity (0.01) instead of display:none or opacity:0.
                inp.style.position = "fixed";
                inp.style.bottom = "8px";
                inp.style.left = "8px";
                inp.style.width = "1px";
                inp.style.height = "1px";
                inp.style.opacity = "0.01";
                inp.style.zIndex = 1000000;
                inp.autocomplete = "off";
                inp.autocapitalize = "none";
                inp.autocorrect = "off";
                inp.spellcheck = false;

                // Prevent visible focus outline if any
                inp.style.outline = "none";
                // Append to body
                document.body.appendChild(inp);

                // ensure there is a user-gesture based way to focus:
                // clicking/tapping console area will focus the input (and enable keyboard)
                consoleArea.addEventListener("click", function () {
                    try { inp.focus(); } catch (e) { /* ignore */ }
                }, { passive: true });
            }

            // Ensure input empty and focused (note: first focus must be after a user gesture for keyboard to appear)
            inp.value = "";
            try { inp.focus(); } catch (e) { /* ignore */ }

            // Handler for Enter key
            function onKeyDown(e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    const val = inp.value;
                    inp.value = "";
                    // show typed text on console
                    var outLine = document.createElement("div");
                    outLine.textContent = val;
                    consoleArea.appendChild(outLine);

                    // cleanup listener for this call
                    inp.removeEventListener("keydown", onKeyDown, false);

                    // blur to close keyboard on mobile
                    try { inp.blur(); } catch (err) { /* ignore */ }

                    cb(val);
                } else if (e.key === "Escape") {
                    // optional: allow cancel with Escape
                    e.preventDefault();
                    inp.value = "";
                    inp.removeEventListener("keydown", onKeyDown, false);
                    try { inp.blur(); } catch (err) { /* ignore */ }
                    cb("");
                }
            }

            inp.addEventListener("keydown", onKeyDown, false);

            // If user taps anywhere, refocus input so keyboard can be re-opened
            // (we added consoleArea click above)
            return;
        }

        // Unknown environment fallback
        cb("");
    }

    // ---- Fetch (Node fs or browser fetch) ----
    async function sub_Fetch(url, fetchRes) {
        if (typeof window === "undefined") {
            // Node.js: use fs (url assumed to be local path)
            try {
                const fs = require("fs");
                const data = fs.readFileSync(url, 'utf8');
                fetchRes.ok = true;
                fetchRes.text = data;
            } catch (e) {
                fetchRes.ok = false;
                fetchRes.text = "";
                fetchRes.error = e.message || String(e);
            }
        } else {
            // Browser fetch
            try {
                const r = await fetch(url);
                fetchRes.ok = r.ok;
                fetchRes.text = await r.text();
            } catch (e) {
                fetchRes.ok = false;
                fetchRes.text = "";
                fetchRes.error = e.message || String(e);
            }
        }
    }

    async function func_Fetch(url) {
        var fetchRes = {};
        await QB.sub_Fetch(url, fetchRes);
        return fetchRes;
    }

    // ---- other helpers (same as your original functions) ----
    function halt() { /* no-op for now */ }
    function halted() { return false; }
    function autoLimit() { /* no-op for now */ }

    function func_Asc(value, pos) {
        _assertParam(value);
        if (pos == undefined) { pos = 0; }
        else { _assertNumber(pos, 2); pos--; }
        return String(value).charCodeAt(pos);
    }

    function func_Chr(charCode) {
        _assertNumber(charCode);
        return String.fromCharCode(charCode);
    }

    function func_Command() { return ""; }

    function func_Left(value, n) {
        _assertParam(value, 1);
        _assertNumber(n, 2);
        return String(value).substring(0, n);
    }

    function func_InStr(arg1, arg2, arg3) {
        _assertParam(arg1, 1);
        _assertParam(arg2, 2);
        var startIndex = 0;
        var strSource = "";
        var strSearch = "";
        if (arg3 != undefined) {
            startIndex = arg1 - 1;
            strSource = String(arg2);
            strSearch = String(arg3);
        } else {
            strSource = String(arg1);
            strSearch = String(arg2);
        }
        return strSource.indexOf(strSearch, startIndex) + 1;
    }

    function func__InStrRev(arg1, arg2, arg3) {
        _assertParam(arg1, 1);
        _assertParam(arg2, 2);
        var startIndex = +Infinity;
        var strSource = "";
        var strSearch = "";
        if (arg3 != undefined) {
            startIndex = arg1 - 1;
            strSource = String(arg2);
            strSearch = String(arg3);
        } else {
            strSource = String(arg1);
            strSearch = String(arg2);
        }
        return strSource.lastIndexOf(strSearch, startIndex) + 1;
    }

    function func_LCase(value) { _assertParam(value); return String(value).toLowerCase(); }
    function func_Len(value) { _assertParam(value); return String(value).length; }
    function func_LTrim(value) { _assertParam(value); return String(value).trimStart(); }

    function func_Mid(value, n, len) {
        _assertParam(value, 1);
        _assertNumber(n, 2);
        if (len == undefined) {
            return String(value).substring(n - 1);
        } else {
            return String(value).substring(n - 1, n + len - 1);
        }
    }

    function func_Right(value, n) {
        _assertParam(value, 1);
        _assertNumber(n, 2);
        if (value == undefined) return "";
        var s = String(value);
        return s.substring(s.length - n, s.length);
    }

    function func__Round(value) {
        _assertNumber(value);
        if (value < 0) return -Math.round(-value);
        else return Math.round(value);
    }

    function func_Rnd(n) {
        if (n == undefined) { n = 1; }
        if (n != 0) {
            if (n < 0) {
                const buffer = new ArrayBuffer(8);
                const view = new DataView(buffer);
                view.setFloat32(0, n, false);
                var m = view.getUint32(0);
                _rndSeed = (m & 0xFFFFFF) + ((m & 0xFF000000) >>> 24);
            }
            _rndSeed = (_rndSeed * 16598013 + 12820163) & 0xFFFFFF;
        }
        return _rndSeed / 0x1000000;
    }

    function func_RTrim(value) { _assertParam(value); return String(value).trimEnd(); }
    function func_Str(value) { return String(value); }
    function func_String(ccount, s) {
        _assertNumber(ccount, 1);
        _assertParam(s, 2);
        if (typeof s === "string") { s = s.substring(0, 1); }
        else { s = String.fromCharCode(s); }
        return "".padStart(ccount, s);
    }

    function func__Trim(value) { _assertParam(value); return value.trim(); }

    function func_UBound(a, dimension) {
        _assertParam(a);
        if (dimension == undefined) { dimension = 1; }
        else { _assertNumber(dimension, 2); }
        return a._dimensions[dimension - 1].u;
    }

    function func_UCase(value) { _assertParam(value); return String(value).toUpperCase(); }

    // public API
    return {
        initArray: initArray,
        resizeArray: resizeArray,
        arrayValue: arrayValue,
        autoLimit: autoLimit,
        halt: halt,
        halted: halted,
        func_Input: func_Input,
        func_Asc: func_Asc,
        func_Chr: func_Chr,
        func_Command: func_Command,
        func_Fetch: func_Fetch,
        sub_Fetch: sub_Fetch,
        func_InStr: func_InStr,
        func__InStrRev: func__InStrRev,
        func_LCase: func_LCase,
        func_Left: func_Left,
        func_Len: func_Len,
        func_LTrim: func_LTrim,
        func_Mid: func_Mid,
        func_Right: func_Right,
        func__Round: func__Round,
        func_Rnd: func_Rnd,
        func_RTrim: func_RTrim,
        func_Str: func_Str,
        func_String: func_String,
        func__Trim: func__Trim,
        func_UBound: func_UBound,
        func_UCase: func_UCase
    };
}

// Export for Node and attach to window for browser convenience
if (typeof module !== "undefined" && module.exports) {
    module.exports.QB = _QB;
}
if (typeof window !== "undefined") {
    // attach factory to window: call window.QB() to get instance
    window.QB = _QB;
}
