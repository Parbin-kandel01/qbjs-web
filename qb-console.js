// QB.js runtime for browser / WebView
function _QB() {
    var _rndSeed = 123456;

    // Runtime Assertions
    function _assertParam(param, arg) {
        if (arg === undefined) { arg = 1; }
        if (param === undefined) { throw new Error("Method argument " + arg + " is required"); }
    }

    function _assertNumber(param, arg) {
        if (arg === undefined) { arg = 1; }
        if (isNaN(param)) { throw new Error("Number required for method argument " + arg); }
    }

    // Array handling
    function initArray(dimensions, obj) {
        var a = {};
        a._dimensions = (dimensions && dimensions.length) ? dimensions : [{l:0,u:1}];
        a._newObj = { value: obj };
        return a;
    }

    function resizeArray(a, dimensions, obj, preserve) {
        if (!preserve) {
            Object.keys(a).forEach(k => {
                if (k !== "_newObj") delete a[k];
            });
        }
        a._dimensions = (dimensions && dimensions.length) ? dimensions : [{l:0,u:1}];
    }

    function arrayValue(a, indexes) {
        var value = a;
        for (var i=0; i < indexes.length; i++) {
            if (value[indexes[i]] === undefined) {
                value[indexes[i]] = (i === indexes.length-1) ? JSON.parse(JSON.stringify(a._newObj)) : {};
            }
            value = value[indexes[i]];
        }
        return value;
    }

    // Halt and autoLimit (placeholders)
    function halt() { console.warn("Halt called"); }
    function halted() { return false; }
    function autoLimit() { /* placeholder for yield in async loops */ }

    // String functions
    function func_Asc(value, pos) {
        _assertParam(value);
        pos = (pos === undefined) ? 0 : pos-1;
        return String(value).charCodeAt(pos);
    }

    function func_Chr(charCode) {
        _assertNumber(charCode);
        return String.fromCharCode(charCode);
    }

    function func_Command() { return ""; }

    async function sub_Fetch(url, fetchRes) {
        try {
            const response = await fetch(url);
            fetchRes.ok = response.ok;
            fetchRes.text = await response.text();
        } catch (e) {
            fetchRes.ok = false;
            fetchRes.text = "";
        }
    }

    async function func_Fetch(url) {
        var fetchRes = {};
        await sub_Fetch(url, fetchRes);
        return fetchRes;
    }

    function func_Left(value, n) { _assertParam(value,1); _assertNumber(n,2); return String(value).substring(0,n); }
    function func_Len(value) { _assertParam(value); return String(value).length; }
    function func_LTrim(value) { _assertParam(value); return String(value).trimStart(); }
    function func_Mid(value, n, len) { 
        _assertParam(value,1); _assertNumber(n,2); 
        return (len === undefined) ? String(value).substring(n-1) : String(value).substring(n-1,n+len-1); 
    }
    function func_Right(value, n) { _assertParam(value,1); _assertNumber(n,2); return String(value).substring(String(value).length-n); }
    function func__Round(value) { _assertNumber(value); return Math.round(value); }
    function func_Rnd(n) {
        if (n === undefined) n=1;
        if (n !== 0) {
            if (n < 0) _rndSeed = Math.abs(n*1234567)%0xFFFFFF;
            _rndSeed = (_rndSeed * 16598013 + 12820163) & 0xFFFFFF;
        }
        return _rndSeed/0x1000000;
    }
    function func_RTrim(value) { _assertParam(value); return String(value).trimEnd(); }
    function func_Str(value) { return String(value); }
    function func_String(ccount, s) { 
        _assertNumber(ccount,1); _assertParam(s,2);
        s = (typeof s==="string") ? s[0] : String.fromCharCode(s);
        return "".padStart(ccount, s);
    }
    function func__Trim(value) { _assertParam(value); return String(value).trim(); }
    function func_UBound(a, dimension) { _assertParam(a); dimension = (dimension===undefined)?1:dimension; _assertNumber(dimension,2); return a._dimensions[dimension-1].u; }
    function func_UCase(value) { _assertParam(value); return String(value).toUpperCase(); }
    function func_LCase(value) { _assertParam(value); return String(value).toLowerCase(); }

    function func_InStr(arg1,arg2,arg3){
        _assertParam(arg1,1); _assertParam(arg2,2);
        var startIndex=0, strSource="", strSearch="";
        if(arg3!==undefined){ startIndex=arg1-1; strSource=String(arg2); strSearch=String(arg3); }
        else { strSource=String(arg1); strSearch=String(arg2); }
        return strSource.indexOf(strSearch,startIndex)+1;
    }

    function func__InStrRev(arg1,arg2,arg3){
        _assertParam(arg1,1); _assertParam(arg2,2);
        var startIndex=+Infinity, strSource="", strSearch="";
        if(arg3!==undefined){ startIndex=arg1-1; strSource=String(arg2); strSearch=String(arg3); }
        else { strSource=String(arg1); strSearch=String(arg2); }
        return strSource.lastIndexOf(strSearch,startIndex)+1;
    }

    return {
        initArray, resizeArray, arrayValue, autoLimit, halt, halted,
        func_Asc, func_Chr, func_Command, func_Fetch, sub_Fetch,
        func_InStr, func__InStrRev, func_LCase, func_Left, func_Len,
        func_LTrim, func_Mid, func_Right, func__Round, func_Rnd,
        func_RTrim, func_Str, func_String, func__Trim, func_UBound, func_UCase
    };
}

// Expose QB globally for browser
window.QB = _QB();
