// console-qb.js
// Production-ready _QB runtime (browser only) with console input support (multi-line, mobile-friendly)

function _QB() {
    var _rndSeed;

    // ------------------------
    // Runtime Assertions
    // ------------------------
    function _assertParam(param, arg) {
        if (arg === undefined) arg = 1;
        if (param === undefined) throw new Error("Method argument " + arg + " is required");
    }

    function _assertNumber(param, arg) {
        if (arg === undefined) arg = 1;
        if (isNaN(param)) throw new Error("Number required for method argument " + arg);
    }

    // ------------------------
    // Array handling
    // ------------------------
    function initArray(dimensions, obj) {
        var a = {};
        a._dimensions = (dimensions && dimensions.length > 0) ? dimensions : [{ l: 0, u: 1 }];
        a._newObj = { value: obj };
        return a;
    }

    function resizeArray(a, dimensions, obj, preserve) {
        if (!preserve) {
            Object.getOwnPropertyNames(a).forEach(p => { if (p != "_newObj") delete a[p]; });
        }
        a._dimensions = (dimensions && dimensions.length > 0) ? dimensions : [{ l: 0, u: 1 }];
    }

    function arrayValue(a, indexes) {
        var value = a;
        for (var i = 0; i < indexes.length; i++) {
            if (value[indexes[i]] === undefined) {
                value[indexes[i]] = (i === indexes.length - 1) ? JSON.parse(JSON.stringify(a._newObj)) : {};
            }
            value = value[indexes[i]];
        }
        return value;
    }

    // ------------------------
    // Input handling (browser only) - FIXED for multi-line and mobile
    // ------------------------
    async function func_Input(promptText) {
        return new Promise(resolve => {

            if (!promptText || promptText === "") {
                promptText = "? ";
            }

            if (typeof IDE !== 'undefined' && typeof IDE.showConsole === 'function') { 
                IDE.showConsole(); 
            }

            let consoleArea = document.getElementById("qb_console_area");
            if (!consoleArea) {
                consoleArea = document.createElement("div");
                consoleArea.id = "qb_console_area";
                document.body.appendChild(consoleArea);
            }

            consoleArea.style.whiteSpace = "pre-wrap";
            consoleArea.style.fontFamily = "monospace";
            consoleArea.style.backgroundColor = "#000";
            consoleArea.style.color = "#fff";
            consoleArea.style.padding = "8px";
            consoleArea.style.minHeight = "50px";
            consoleArea.style.overflowY = "auto";
            consoleArea.style.display = "block";

            const promptLine = document.createElement("div");
            promptLine.textContent = promptText;
            consoleArea.appendChild(promptLine);

            // --- MULTI-LINE TEXTAREA ---
            const uniqueId = '_qb_console_input_' + Date.now() + '_' + Math.floor(Math.random()*1000);
            let inp = document.createElement('textarea');
            inp.id = uniqueId;
            inp.rows = 4;
            inp.style.width = '100%';
            inp.style.padding = '6px';
            inp.style.margin = '6px 0';
            inp.style.border = '1px solid #555';
            inp.style.background = '#222';
            inp.style.color = '#fff';
            inp.style.fontFamily = 'monospace';
            inp.style.fontSize = '1em';
            inp.style.boxSizing = 'border-box';
            inp.autocomplete = 'off';
            inp.autocapitalize = 'none';
            inp.autocorrect = 'off';
            inp.spellcheck = false;
            consoleArea.appendChild(inp);

            inp.value = '';
            inp.style.display = 'block';

            setTimeout(() => {
                inp.scrollIntoView({ behavior: 'smooth', block: 'end' });
                inp.focus();
                setTimeout(() => { if (document.activeElement !== inp) inp.focus(); }, 320);
            }, 160);

            let submitted = false;
            let composing = false;
            const onCompositionStart = () => { composing = true; };
            const onCompositionEnd = () => { composing = false; };

            const onKeyDown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { // Enter submits, Shift+Enter adds newline
                    if (composing) return;
                    e.preventDefault();
                    if (submitted) return;
                    submitted = true;

                    const val = inp.value;
                    const outLine = document.createElement('div');
                    outLine.textContent = val;
                    consoleArea.appendChild(outLine);

                    inp.value = '';
                    inp.blur();

                    inp.removeEventListener('keydown', onKeyDown);
                    inp.removeEventListener('compositionstart', onCompositionStart);
                    inp.removeEventListener('compositionend', onCompositionEnd);

                    setTimeout(() => {
                        try { inp.remove(); } catch(ex){}
                        if (typeof IDE !== 'undefined' && typeof IDE.hideConsole === 'function') {
                            IDE.hideConsole();
                        }
                        resolve(val);
                    }, 90);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    inp.value = '';
                    inp.blur();
                    inp.removeEventListener('keydown', onKeyDown);
                    inp.removeEventListener('compositionstart', onCompositionStart);
                    inp.removeEventListener('compositionend', onCompositionEnd);
                    try { inp.remove(); } catch(ex){}
                    if (typeof IDE !== 'undefined' && typeof IDE.hideConsole === 'function') {
                        IDE.hideConsole();
                    }
                    resolve('');
                }
            };

            inp.addEventListener('compositionstart', onCompositionStart);
            inp.addEventListener('compositionend', onCompositionEnd);
            inp.addEventListener('keydown', onKeyDown);

            promptLine.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }

    // ------------------------
    // Fetch helper (Browser only)
    // ------------------------
    async function sub_Fetch(url, fetchRes) {
        try {
            const r = await fetch(url);
            fetchRes.text = await r.text();
            fetchRes.ok = r.ok;
        } catch (e) {
            fetchRes.text = "";
            fetchRes.ok = false;
            fetchRes.error = e.message || String(e);
        }
    }

    async function func_Fetch(url) {
        var fetchRes = {};
        await QB.sub_Fetch(url, fetchRes);
        return fetchRes;
    }

    // ------------------------
    // Other helpers
    // ------------------------
    function halt() {}
    function halted() { return false; }
    function autoLimit() {}

    function func_Asc(value, pos) { _assertParam(value); if (pos === undefined) pos = 0; else { _assertNumber(pos, 2); pos--; } return String(value).charCodeAt(pos); }
    function func_Chr(code) { _assertNumber(code); return String.fromCharCode(code); }
    function func_Command() { return ""; }
    function func_Left(value, n) { _assertParam(value); _assertNumber(n); return String(value).substring(0, n); }
    function func_InStr(a,b,c){_assertParam(a);_assertParam(b);var s1,s2,start=0;if(c!==undefined){start=a-1;s1=String(b);s2=String(c);}else{s1=String(a);s2=String(b);}return s1.indexOf(s2,start)+1;}
    function func__InStrRev(a,b,c){_assertParam(a);_assertParam(b);var s1,s2,start=+Infinity;if(c!==undefined){start=a-1;s1=String(b);s2=String(c);}else{s1=String(a);s2=String(b);}return s1.lastIndexOf(s2,start)+1;}
    function func_LCase(v){_assertParam(v);return String(v).toLowerCase();}
    function func_Len(v){_assertParam(v);return String(v).length;}
    function func_LTrim(v){_assertParam(v);return String(v).trimStart();}
    function func_Mid(v,n,len){_assertParam(v);_assertNumber(n);if(len===undefined)return String(v).substring(n-1);else return String(v).substring(n-1,n+len-1);}
    function func_Right(v,n){_assertParam(v);_assertNumber(n);if(v===undefined)return"";var s=String(v);return s.substring(s.length-n);}
    function func__Round(v){_assertNumber(v);return (v<0)?-Math.round(-v):Math.round(v);}
    function func_Rnd(n){if(n===undefined)n=1;if(n!==0){if(n<0){const buf=new ArrayBuffer(8);const view=new DataView(buf);view.setFloat32(0,n,false);var m=view.getUint32(0);_rndSeed=(m&0xFFFFFF)+((m&0xFF000000)>>>24);} _rndSeed=(_rndSeed*16598013+12820163)&0xFFFFFF;} return _rndSeed/0x1000000;}
    function func_RTrim(v){_assertParam(v);return String(v).trimEnd();}
    function func_Str(v){return String(v);}
    function func_String(c,s){_assertNumber(c);_assertParam(s);if(typeof s==="string")s=s.substring(0,1);else s=String.fromCharCode(s);return "".padStart(c,s);}
    function func__Trim(v){_assertParam(v);return v.trim();}
    function func_UBound(a,d){_assertParam(a);if(d===undefined)d=1;else _assertNumber(d);return a._dimensions[d-1].u;}
    function func_UCase(v){_assertParam(v);return String(v).toUpperCase();}

    // ------------------------
    // Public API
    // ------------------------
    return {
        initArray, resizeArray, arrayValue, autoLimit, halt, halted,
        func_Input, func_Asc, func_Chr, func_Command, func_Fetch, sub_Fetch,
        func_InStr, func__InStrRev, func_LCase, func_Left, func_Len, func_LTrim,
        func_Mid, func_Right, func__Round, func_Rnd, func_RTrim, func_Str, func_String,
        func__Trim, func_UBound, func_UCase
    };
}

// Attach to window
if (typeof window !== "undefined") {
    if (!window.QB) {
        window.QB = _QB();
    } else {
        const _newQB = _QB();
        for (const k in _newQB) {
            try {
                if (k === 'func_Input') {
                    if (!window.QB.func_Input) window.QB.func_Input = _newQB.func_Input;
                } else if (window.QB[k] === undefined) {
                    window.QB[k] = _newQB[k];
                }
            } catch (ex) {}
        }
    }
}



