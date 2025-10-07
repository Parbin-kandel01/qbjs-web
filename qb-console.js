// console-qb.js
// Production-ready _QB runtime (browser only) with console input support (mobile-friendly, Android/iOS keyboard fix)

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
    // Input handling (browser only)
    // ------------------------
    
    // Global state to manage mobile input
    var _mobileInputResolve = null;

    async function func_Input(promptText) {
        _assertParam(promptText);

        return new Promise(resolve => {
            // Detect mobile
            const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

            // Ensure console area
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

            // Append prompt line
            const promptLine = document.createElement("div");
            promptLine.textContent = promptText || "? ";
            consoleArea.appendChild(promptLine);

            if (!isMobile) {
                // Desktop input
                const uniqueId = '_qb_console_input_' + Date.now() + '_' + Math.floor(Math.random()*1000);
                const inp = document.createElement('input');
                inp.id = uniqueId;
                inp.type = 'text';
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
                inp.focus();

                let composing = false;
                inp.addEventListener('compositionstart', () => composing = true);
                inp.addEventListener('compositionend', () => composing = false);

                // FIX: Added resolve(val) to complete the Promise
                inp.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        if (composing) return;
                        e.preventDefault();
                        const val = inp.value;
                        // Display the input value as a new line
                        consoleArea.appendChild(document.createElement("div")).textContent = val; 
                        inp.remove();
                        resolve(val); // <--- THIS WAS THE MISSING STEP
                    }
                });

            } else {
                // Mobile: visible input container
                _mobileInputResolve = resolve;

                let mobileContainer = document.getElementById("qb_mobile_input_container");
                let textarea = document.getElementById("qb_mobile_input_textarea");
                let submitBtn = document.getElementById("qb_mobile_input_submit_btn");

                if (!mobileContainer) {
                    mobileContainer = document.createElement("div");
                    mobileContainer.id = "qb_mobile_input_container";
                    mobileContainer.style.position = "fixed";
                    mobileContainer.style.bottom = "0";
                    mobileContainer.style.left = "0";
                    mobileContainer.style.right = "0";
                    mobileContainer.style.backgroundColor = "#000";
                    mobileContainer.style.padding = "8px";
                    mobileContainer.style.zIndex = 9999;
                    document.body.appendChild(mobileContainer);

                    textarea = document.createElement("textarea");
                    textarea.id = "qb_mobile_input_textarea";
                    textarea.rows = 2; // Better for multi-line but still simple
                    textarea.style.width = "100%";
                    textarea.style.height = "auto";
                    textarea.style.fontFamily = "monospace";
                    textarea.style.color = "#fff";
                    textarea.style.background = "#222";
                    textarea.style.border = "1px solid #555";
                    textarea.style.padding = "6px";
                    textarea.style.boxSizing = "border-box";
                    mobileContainer.appendChild(textarea);
                    
                    submitBtn = document.createElement("button");
                    submitBtn.id = "qb_mobile_input_submit_btn";
                    submitBtn.textContent = "Submit (Enter)";
                    submitBtn.style.marginTop = "5px";
                    submitBtn.style.padding = "6px 12px";
                    submitBtn.style.fontFamily = "monospace";
                    submitBtn.style.cursor = "pointer";
                    mobileContainer.appendChild(submitBtn);

                    // Re-attached single listener to submit button
                    submitBtn.addEventListener("click", _processMobileInput);
                    
                    // Added Enter key listener for the mobile textarea (if a hardware keyboard is used)
                    textarea.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            _processMobileInput();
                        }
                    });
                }

                mobileContainer.style.display = "block";
                textarea.value = "";
                textarea.focus();
            }

            // Scroll console to bottom
            consoleArea.scrollTop = consoleArea.scrollHeight;
        });
    }
    
    // New helper to process input from mobile (Submit button or Enter key on mobile textarea)
    function _processMobileInput() {
        if (!_mobileInputResolve) return;

        const consoleArea = document.getElementById("qb_console_area");
        const mobileContainer = document.getElementById("qb_mobile_input_container");
        const textarea = document.getElementById("qb_mobile_input_textarea");

        const val = textarea.value;
        
        // Display the input value
        consoleArea.appendChild(document.createElement("div")).textContent = val;
        
        mobileContainer.style.display = "none";
        textarea.blur(); // Hide keyboard

        // Resolve the stored Promise and clear the resolver
        _mobileInputResolve(val); 
        _mobileInputResolve = null;
        
        // Scroll console to bottom
        consoleArea.scrollTop = consoleArea.scrollHeight;
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
    function func_Space(v){_assertNumber(v);return " ".repeat(v);}
    function func_Str(v){_assertParam(v);return String(v);}
    function func_UCase(v){_assertParam(v);return String(v).toUpperCase();}
    function func_Val(v){_assertParam(v);return Number(v)||0;}

    // ------------------------
    // Expose public API
    // ------------------------
    return {
        initArray, resizeArray, arrayValue,
        func_Input, func_Fetch, sub_Fetch,
        halt, halted, autoLimit,
        func_Asc, func_Chr, func_Command,
        func_Left, func_InStr, func__InStrRev,
        func_LCase, func_Len, func_LTrim, func_Mid, func_Right, func__Round,
        func_Rnd, func_RTrim, func_Space, func_Str, func_UCase, func_Val
    };
}

// Create singleton instance
const QB = _QB();




