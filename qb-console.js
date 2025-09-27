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
        } else {
            a._dimensions = [{ l: 0, u: 1 }];
        }
        a._newObj = { value: obj };
        return a;
    };

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
        } else {
            a._dimensions = [{ l: 0, u: 1 }];
        }
    }

    function arrayValue(a, indexes) {
        var value = a;
        for (var i = 0; i < indexes.length; i++) {
            if (value[indexes[i]] == undefined) {
                if (i == indexes.length - 1) {
                    value[indexes[i]] = JSON.parse(JSON.stringify(a._newObj));
                } else {
                    value[indexes[i]] = {};
                }
            }
            value = value[indexes[i]];
        }
        return value;
    }

    // ---- Input Handling ----
    function func_Input(promptText, callback) {
        console.log(promptText);

        // If running in Browser
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            let hiddenInput = document.getElementById("_qb_hidden_input");
            if (!hiddenInput) {
                hiddenInput = document.createElement("input");
                hiddenInput.id = "_qb_hidden_input";
                hiddenInput.style.position = "absolute";
                hiddenInput.style.opacity = 0;
                hiddenInput.autocomplete = "off";
                document.body.appendChild(hiddenInput);
            }

            hiddenInput.value = "";
            hiddenInput.focus();

            hiddenInput.oninput = () => {
                const val = hiddenInput.value;
                if (val && callback) {
                    callback(val);
                    hiddenInput.value = "";
                }
            };

            document.body.addEventListener("click", () => hiddenInput.focus());
        }

        // If running in Node.js
        else if (typeof process !== "undefined" && process.stdin) {
            const readline = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout
            });
            readline.question(promptText + " ", (answer) => {
                callback(answer);
                readline.close();
            });
        }
    }

    // ---- Other Runtime Functions (same as before) ----
    function halt() { }
    function halted() { return false; }
    function autoLimit() { }

    function func_Asc(value, pos) {
        _assertParam(value);
        if (pos == undefined) pos = 0;
        else { _assertNumber(pos, 2); pos--; }
        return String(value).charCodeAt(pos);
    }

    function func_Chr(charCode) {
        _assertNumber(charCode);
        return String.fromCharCode(charCode);
    }

    function func_Command() { return ""; }

    async function sub_Fetch(url, fetchRes) {
        if (typeof window === "undefined") {
            // Node.js
            const fs = require("fs");
            const data = fs.readFileSync(url, 'utf8');
            fetchRes.ok = true;
            fetchRes.text = data;
        } else {
            // Browser
            const res = await fetch(url);
            fetchRes.ok = res.ok;
            fetchRes.text = await res.text();
        }
    }

    async function func_Fetch(url) {
        var fetchRes = {};
        await QB.sub_Fetch(url, fetchRes);
        return fetchRes;
    }

    function func_Left(value, n) { _assertParam(value, 1); _assertNumber(n, 2); return String(value).substring(0, n); }
    function func_InStr(arg1, arg2, arg3) {
        _assertParam(arg1, 1); _assertParam(arg2, 2);
        var startIndex = 0, strSource = "", strSearch = "";
        if (arg3 != undefined) { startIndex = arg1 - 1; strSource = String(arg2); strSearch = String(arg3); }
        else { strSource = String(arg1); strSearch = String(arg2); }
        return strSource.indexOf(strSearch, startIndex) + 1;
    }

    function func__InStrRev(arg1, arg2, arg3) {
        _assertParam(arg1, 1); _assertParam(arg2, 2);
        var startIndex = +Infinity, strSource = "", strSearch = "";
        if (arg3 != undefined) { startIndex = arg1 - 1; strSource = String(arg2); strSearch = String(arg3); }
        else { strSource = String(arg1); strSearch = String(arg2); }
        return strSource.lastIndexOf(strSearch, startIndex) + 1;
    }

    function func_LCase(value) { _assertParam(value); return String(value).toLowerCase(); }
    function func_Len(value) { _assertParam(value); return String(value).length; }
    function func_LTrim(value) { _assertParam(value); return String(value).trimStart(); }

    function func_Mid(value, n, len) {
        _assertParam(value, 1); _assertNumber(n, 2);
        if (len == undefined) return String(value).substring(n - 1);
        else return String(value).substring(n - 1, n + len - 1);
    }

    function func_Right(value, n) {
        _assertParam(value, 1); _assertNumber(n, 2);
        if (value == undefined) return "";
        var s = String(value); return s.substring(s.length - n, s.length);
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
        _assertNumber(ccount, 1); _assertParam(s, 2);
        if (typeof s === "string") { s = s.substring(0, 1); }
        else { s = String.fromCharCode(s); }
        return "".padStart(ccount, s);
    }

    function func__Trim(value) { _assertParam(value); return value.trim(); }
    function func_UBound(a, dimension) {
        _assertParam(a);
        if (dimension == undefined) dimension = 1;
        else { _assertNumber(dimension, 2); }
        return a._dimensions[dimension - 1].u;
    }

    function func_UCase(value) { _assertParam(value); return String(value).toUpperCase(); }

    return {
        initArray, resizeArray, arrayValue,
        autoLimit, halt, halted,
        func_Input,
        func_Asc, func_Chr, func_Command,
        func_Fetch, sub_Fetch,
        func_InStr, func__InStrRev,
        func_LCase, func_Left, func_Len, func_LTrim,
        func_Mid, func_Right, func__Round,
        func_Rnd, func_RTrim, func_Str,
        func_String, func__Trim, func_UBound,
        func_UCase
    };
}

module.exports.QB = _QB;
