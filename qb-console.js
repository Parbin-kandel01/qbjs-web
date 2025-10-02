// console-qb.js
// Production-ready _QB runtime (browser + node) with console input support (mobile-friendly, keyboard fix)

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
    // Input handling (browser + Node) - Fixed for mobile keyboard
    // ------------------------
    async function func_Input(promptText) {
        if (typeof window === "undefined") {
            // Node environment (unchanged)
            return new Promise(resolve => {
                try {
                    const readline = require("readline");
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    rl.question(promptText + " ", answer => {
                        rl.close();
                        resolve(answer);
                    });
                } catch (e) {
                    resolve("");
                }
            });
        } else {
            // Browser environment (enhanced for mobile keyboard reliability)
            return new Promise(resolve => {
                // Auto-ensure console is visible (calls IDE method if available)
                if (typeof IDE !== 'undefined' && IDE.ensureConsoleVisible) {
                    IDE.ensureConsoleVisible();
                }

                let consoleArea = document.getElementById("qb_console_area");
                if (!consoleArea) {
                    // Fallback: Use IDE's output-content if available
                    consoleArea = document.getElementById("output-content");
                    if (consoleArea) {
                        consoleArea.id = "qb_console_area"; // Consistent ID
                    } else {
                        // Ultimate fallback: Create basic console area
                        consoleArea = document.createElement("div");
                        consoleArea.id = "qb_console_area";
                        document.body.appendChild(consoleArea);
                    }
                }

                // Apply console styling (preserved + mobile overflow)
                consoleArea.style.whiteSpace = "pre-wrap";
                consoleArea.style.fontFamily = "monospace";
                consoleArea.style.padding = "6px";
                consoleArea.style.minHeight = "40px";
                consoleArea.style.backgroundColor = "#000";
                consoleArea.style.color = "#fff";
                consoleArea.style.overflowY = "auto";
                consoleArea.style.maxHeight = "calc(100vh - 100px)";
                consoleArea.style.display = "block";
                consoleArea.scrollTop = consoleArea.scrollHeight;

                // Add prompt line (original logic)
                const promptLine = document.createElement("div");
                promptLine.textContent = promptText;
                consoleArea.appendChild(promptLine);

                // Create tappable "Tap to Enter" button for user gesture (mobile keyboard trigger)
                const tapButton = document.createElement("button");
                tapButton.id = "_qb_tap_to_input";
                tapButton.textContent = "Tap to Enter Input";
                tapButton.style.width = "100%";
                tapButton.style.padding = "8px";
                tapButton.style.margin = "5px 0";
                tapButton.style.backgroundColor = "#444";
                tapButton.style.color = "#fff";
                tapButton.style.border = "1px solid #666";
                tapButton.style.fontFamily = "monospace";
                tapButton.style.cursor = "pointer";
                tapButton.style.display = "block"; // Visible on mobile
                consoleArea.appendChild(tapButton);

                // Create or reuse input element
                let inp = document.getElementById("_qb_console_input");
                if (!inp) {
                    inp = document.createElement("input");
                    inp.id = "_qb_console_input";
                    inp.type = "text";
                    inp.style.width = "calc(100% - 12px)";
                    inp.style.padding = "5px";
                    inp.style.margin = "5px 0";
                    inp.style.border = "1px solid #555";
                    inp.style.backgroundColor = "#222";
                    inp.style.color = "#fff";
                    inp.style.fontFamily = "monospace";
                    inp.style.fontSize = "1em";
                    inp.style.boxSizing = "border-box";
                    inp.style.display = "none"; // Initially hidden; shown on tap
                    inp.autocomplete = "off";
                    inp.autocapitalize = "none";
                    inp.autocorrect = "off";
                    inp.spellcheck = false;
                    inp.style.outline = "none";
                    inp.placeholder = "Type here and press Enter...";
                    consoleArea.appendChild(inp);

                    // Enhanced focus function (with delay for mobile timing)
                    const focusInput = () => {
                        inp.style.display = "block"; // Show input
                        tapButton.style.display = "none"; // Hide button after tap
                        inp.value = "";
                        // Delayed focus to ensure DOM/resize settles
                        requestAnimationFrame(() => {
                            inp.focus();
                            inp.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            // Retry focus if needed (mobile quirk)
                            setTimeout(() => {
                                if (document.activeElement !== inp) {
                                    inp.focus();
                                }
                            }, 100);
                        });
                    };

                    // Tap button triggers focus (user gesture for keyboard)
                    tapButton.addEventListener("click", focusInput, { passive: true });
                    tapButton.addEventListener("touchstart", focusInput, { passive: true });

                    // Fallback: Click/touch on console area also focuses
                    const areaFocus = () => {
                        if (inp.style.display === "none") focusInput();
                    };
                    consoleArea.addEventListener("click", areaFocus, { passive: true });
                    consoleArea.addEventListener("touchstart", areaFocus, { passive: true });
                } else {
                    // Reuse: Show tap button if input was hidden
                    if (document.getElementById("_qb_tap_to_input")) {
                        tapButton.style.display = "block";
                    }
                    inp.style.display = "none";
                    consoleArea.appendChild(inp); // Ensure positioning
                }

                // Initially show tap button (prompts user interaction for keyboard)
                if (!document.getElementById("_qb_tap_to_input")) {
                    consoleArea.appendChild(tapButton);
                }
                tapButton.style.display = "block";

                // Scroll to prompt/tap area
                promptLine.scrollIntoView({ behavior: 'smooth', block: 'end' });

                // Keydown handler (original, works on mobile)
                function onKeyDown(e) {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        const val = inp.value;
                        inp.value = "";
                        inp.style.display = "none";

                        // Echo input
                        const outLine = document.createElement("div");
                        outLine.textContent = val;
                        consoleArea.appendChild(outLine);
                        consoleArea.scrollTop = consoleArea.scrollHeight;

                        // Cleanup: Remove listeners and button
                        inp.removeEventListener("keydown", onKeyDown, false);
                        if (tapButton) tapButton.remove();
                        inp.blur();
                        resolve(val);
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        inp.value = "";
                        inp.style.display = "none";
                        if (tapButton) tapButton.remove();
                        inp.removeEventListener("keydown", onKeyDown, false);
                        inp.blur();
                        resolve("");
                    }
                }

                inp.addEventListener("keydown", onKeyDown, false);

                // Error handling: If no interaction after 30s, resolve empty (prevent hang)
                setTimeout(() => {
                    if (inp.style.display === "block" && document.activeElement !== inp) {
                        console.warn("QB Input: No user interaction detected, resolving empty.");
                        resolve("");
                    }
                }, 30000);
            });
        }
    }

    // ------------------------
    // Fetch helper (Node + Browser) - Unchanged
    // ------------------------
    async function sub_Fetch(url, fetchRes) {
        if (typeof window === "undefined") {
            // Node
            try {
                const fs = require("fs");
                fetchRes.text = fs.readFileSync(url, "utf8");
                fetchRes.ok = true;
            } catch (e) {
                fetchRes.text = "";
                fetchRes.ok = false;
                fetchRes.error = e.message || String(e);
            }
        } else {
            // Browser
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
    }

    async function func_Fetch(url) {
        var fetchRes = {};
        await QB.sub_Fetch(url, fetchRes);
        return fetchRes;
    }

    // ------------------------
    // Other helpers (unchanged)
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
    // Public API (unchanged)
    // ------------------------
    return {
        initArray, resizeArray, arrayValue, autoLimit, halt, halted,
        func_Input, func_Asc, func_Chr, func_Command, func_Fetch, sub_Fetch,
        func_InStr, func__InStrRev, func_LCase, func_Left, func_Len, func_LTrim,
        func_Mid, func_Right, func__Round, func_Rnd, func_RTrim, func_Str, func_String,
        func__Trim, func_UBound, func_UCase
    };
}

// Node export + attach to window (unchanged)
if(typeof module!=="undefined" && module.exports){module.exports.QB=_QB;}
if(typeof window!=="undefined"){window.QB=_QB;}
