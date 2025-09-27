(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

// ------------------------- Utilities -------------------------
function wordRegexp(words) {
  return new RegExp("^((" + words.join(")|(") + "))\\b", "i");
}

// ------------------------- QB Keywords -------------------------
var singleOperators = /^[\+\-\*\/&\\\^<>=]/;
var doubleOperators = /^(<>|<=|>=)/;
var singleDelimiters = /^[\.,]/;
var brackets = /^[\(\)]/;
var identifiers = /^[A-Za-z][_A-Za-z0-9]*/;

// Keywords
var commonKeywords = ['dim','as','redim','then','until','exit','in','to','let','const','integer','single','double','long','string','object','call','step','preserve','option'];
var openingKeywords = ['sub','select','while','if','function','property','with','for','type','do'];
var middleKeywords = ['else','elseif','case','then'];
var closingKeywords = ['next','loop','wend','end','endif'];

var wordOperators = wordRegexp(['and','or','not','xor','is','mod','eqv','imp']);
var atomWords = ['true','false','nothing','empty','null'];
var builtinFuncsWords = ['abs','asc','atn','beep','chr','cint','clng','csng','circle','cls','color','command','cos','cvi','cvl',
  'data','date','draw','environ','error','exp','fix','hex','input','inkey','instr','int','lbound','left','lcase','len','line',
  'loc','locate','log','ltrim','mid','mki','mkl','oct','paint','play','point','preset','print','pset','right','rtrim','randomize',
  'read','restore','rnd','screen','shared','sgn','sin','sleep','sound','space','sqr','static','str','swap','tan','time','timer',
  'ubound','ucase','val','varptr','window','mkdir','chdir','rmdir','kill','name','files','open','close','lof','eof','put','get','freefile','seek','write'];
var builtinConsts = ['append','binary','input','output','random','explicit','off','smooth','stretch','squarepixels','keepbackground','gx_true','gx_false'];
var builtinObjsWords = ['gxentitycreate','gxentityvisible','gxentitymove','gxentityx','gxentityy','gxentitywidth','gxentityheight'];
var knownProperties = ['description','firstindex','global','helpcontext','helpfile','ignorecase','length','number','pattern','value','count'];
var knownMethods = ['gxongameevent','gxmousex','gxmousey','gxsoundload','gxsoundplay','gxentityanimate'];

var keywords = wordRegexp(commonKeywords.concat(openingKeywords,middleKeywords,closingKeywords));
var atoms = wordRegexp(atomWords);
var builtinFuncs = wordRegexp(builtinFuncsWords);
var builtinObjs = wordRegexp(builtinObjsWords);
var known = wordRegexp(knownMethods.concat(knownProperties));
var opening = wordRegexp(openingKeywords);
var middle = wordRegexp(middleKeywords);
var closing = wordRegexp(closingKeywords);

// ------------------------- Tokenizer -------------------------
function tokenBase(stream, state) {
  if(stream.eatSpace()) return 'space';

  var ch = stream.peek();

  // Comments
  if(ch === "'") { stream.skipToEnd(); return 'comment'; }
  if(stream.match(/^rem\b/i)) { stream.skipToEnd(); return 'comment'; }

  // Numbers
  if(stream.match(/^(&H|&O)?[0-9\.]/i, false) && !stream.match(/^(&H|&O)?[0-9\.]+[a-z_]/i,false)) {
    if(stream.match(/^\d*\.\d+/) || stream.match(/^\d+\.\d*/) || stream.match(/^\.\d+/)) { stream.eat(/J/i); return 'number'; }
    if(stream.match(/^&H[0-9a-f]+/i) || stream.match(/^&O[0-7]+/) || stream.match(/^[1-9]\d*/)) { stream.eat(/L/i); return 'number'; }
    if(stream.match(/^0(?![\dx])/i)) return 'number';
  }

  // Strings
  if(stream.match('"')) { state.tokenize = tokenStringFactory('"'); return state.tokenize(stream,state); }

  // Operators & Delimiters
  if(stream.match(doubleOperators) || stream.match(singleOperators) || stream.match(wordOperators)) return 'operator';
  if(stream.match(singleDelimiters)) return null;
  if(stream.match(brackets)) return 'bracket';

  // Keywords & Atoms
  if(stream.match(opening)) { return 'keyword'; }
  if(stream.match(middle)) { return 'keyword'; }
  if(stream.match(closing)) { return 'keyword'; }
  if(stream.match(keywords)) return 'keyword';
  if(stream.match(atoms)) return 'atom';
  if(stream.match(known)) return 'variable-2';
  if(stream.match(builtinFuncs)) return 'builtin';
  if(stream.match(builtinObjs)) return 'variable-2';
  if(stream.match(identifiers)) return 'variable';

  stream.next();
  return 'error';
}

function tokenStringFactory(delimiter) {
  return function(stream,state){
    while(!stream.eol()){
      stream.eatWhile(/[^"]/);
      if(stream.match(delimiter)){ state.tokenize=tokenBase; return 'string'; }
      else stream.eat(/["]/);
    }
    state.tokenize=tokenBase;
    return 'string';
  };
}

// ------------------------- Mode -------------------------
CodeMirror.defineMode("qbjs", function(conf) {
  return {
    startState: function(){ return {tokenize: tokenBase, currentIndent: 0}; },
    token: function(stream, state){ return state.tokenize(stream, state); },
    indent: function(state, textAfter) {
      var trueText = textAfter.replace(/^\s+|\s+$/g, '');
      if(trueText.match(closing) || trueText.match(middle)) return (state.currentIndent-1) * conf.indentUnit;
      return state.currentIndent * conf.indentUnit;
    },
    electricChars: "dDpPtTfFeE )"
  };
});

CodeMirror.defineMIME("text/qbjs","qbjs");

// ------------------------- Autocomplete -------------------------
window.QBKeywords = {
  keywords: commonKeywords.concat(openingKeywords,middleKeywords,closingKeywords),
  builtins: builtinFuncsWords,
  constants: builtinConsts,
  objects: builtinObjsWords,
  atoms: atomWords
};

CodeMirror.registerHelper("hint","qbjs",function(cm){
  var cur = cm.getCursor();
  var token = cm.getTokenAt(cur);
  var list = [].concat(window.QBKeywords.keywords, window.QBKeywords.builtins, window.QBKeywords.constants, window.QBKeywords.objects);
  var start = token.start;
  var end = cur.ch;
  var currentWord = token.string.toLowerCase();
  var result = list.filter(function(item){ return item.toLowerCase().startsWith(currentWord); });
  return {list: result, from: CodeMirror.Pos(cur.line,start), to: CodeMirror.Pos(cur.line,end)};
});

});
