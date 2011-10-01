var fs = require("fs");

// this translate treescript fns to js operators
OPS = {
  // basic math
  '+':'+','-':'-','*':'*','/':'/','%':'%',
  // comperison
  '>':'>','>=':'=>','<':'<','<=':'<=','=':'===','!=':'!==',
  // function like
  'inc':'++','dec':'--',
  // booleans
  'and':'&&',"or":'||',"not":"!"
}

var QUOTES_RE = /^['@!~#$]+$/;

// utils
isString = function(obj) {
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
};

function transform(token) {
  var number = parseFloat(token);
  if (isNaN(number)) {
    return token;
  }
  return number;
};

function tokenize(code) {
  var tokens = [], queue = '';
  for (var i = 0, length = code.length, char; char = code.charAt(i), i < length; i ++) {
    if (char === ";") {
      while (char !== "\n") {
        i++;
        char = code.charAt(i);
      }
    } else if (QUOTES_RE.exec(char)) {
      var start = i;
      while (true) {
        i++;
        char = code.charAt(i);
        if(!QUOTES_RE.exec(char)){
          break;
        }
      }
      tokens.push(code.substring(start, i))
      i --;
    } else if (char === '"') {
      var start = i;
      char = null;
      while (char !== '"') {
        i++;
        char = code.charAt(i);
      }
      tokens.push(code.substring(start, i+1))
    } else if (char === '(' || char === ')' || /\s/.exec(char)) {
      if (queue.length) {
        tokens.push(queue);
      }
      if (char.replace(/\s+/g, '').length) {
        tokens.push(char);
      }
      queue = '';
    } else {
      queue = queue + char;
    }
  }
  return tokens;
};

// turns text into code tree
function parse(code) {
  var tokens = tokenize(code), parens = 0,
      result = [], stack  = [result], tmp;
  for (var i = 0, length = tokens.length, token; token = tokens[i], i < length; i ++) {
    if (token === '(') {
      parens += 1
      tmp = [];
      stack[0].push(tmp);
      stack = [tmp].concat(stack);
    } else if (token === ')') {
      parens -= 1
      if (parens < 0) throw "unbalanced closing parens"
      if (stack.length) {
        stack = stack.slice(1);
      }
    } else if (QUOTES_RE.exec(token)) {
      i ++;
      if (tokens[i] === "(") {
        parens += 1
        tmp = [];
        stack[0].push(tmp);
        stack = [tmp].concat(stack);
        stack[0].push(token)
      } else {
        stack[0].push([token, tokens[i]]);
      }
    } else {
      stack[0].push(transform(token));
    }
  }
  if (parens != 0) throw "unbalanced opening parens"
  return result;
};

// to use the buffer add things with
// out("thing") and remove with rm("thing")
var buffer = [];
function out () {
  var args = Array.prototype.slice.call(arguments);
  for (i in args){
    var arg = args[i];
    buffer.push(arg);
  }
}
function rm (what) {
  var val = buffer.pop();
  if (val != what) buffer.push(val);
}

// compile_file
function compile_file(err, data) {
  var data = parse(data)
  for (var e in data){
    var line = data[e];
    compile(line);
    out(";\n");
  }
  // dump the buffer to out
  console.log(buffer.join(""));
}

function compile(data) {
  var l = data.length;
  if (isString(data)){
    if (data[0] == '"') {
      out(data);
    } else {
      out(data);
    }
  } else if (l === undefined){
    // if data is not a list, just pass it on
    out(data);
  } else if (data[0] == ":") {
    // set!
    out(data[1], " = ")
    compile(data[2])
  } else if (data[0] == "fn") {
    // creates a new function
    out("function (", data[1], ") {")
    for(var i = 2; i < data.length; i ++){
      if (i == data.length-1){
        out("return ")
      }
      compile(data[i])
      out(";\n")
    }
    out("}")
  } else if (data[0] == "let") {
    // let create new closure via a function
    out("(function () {\n")
    out("var ")
    vars = data[1]
    for(var i = 0; i < vars.length; i +=2){
      out(vars[i],"=")
      compile(vars[i+1])
      out(", ")
    }
    rm(", ")
    out(";\n")
    for(var i = 2; i < data.length; i ++){
      if (i == data.length-1){
        out("return ")
      }
      compile(data[i])
      out(";\n")
    }
    out("})()")
  } else if (data[0] == "js") {
    out(data[1].slice(1,-1))
  } else if (data[0] == "'") {
    out(JSON.stringify(data.slice(1)))
  } else if (OPS[data[0]]) {
    op = OPS[data[0]]
    out("(")
    for(var i = 1; i < data.length; i ++){
      compile(data[i])
      out(" ", op, " ")
    }
    rm(" "); rm(op); rm(" ")
    out(")")
  } else if (data[0] == "if") {
    for(var i = 1; i < data.length; i += 2){
      if (i == data.length - 1){
        compile(data[i])
      } else {
        compile(data[i])
        out(" ? ")
        compile(data[i+1])
        out(" : ")
      }
    }
    out(";")
  } else {
    // function calls
    for (var e = 0; e < data.length; e ++){
      var a = data[e];
      if (e == 0) {
        if (isString(data[0]) && data[0][0] == "."){
          out("(")
          compile(data[1]);
          out(")")
          out(data[0], "(");
          e = 1;
        } else {
          compile(a);
          out("(");
        }
      } else {
        compile(a);
        out(",")
      }
    }
    rm(",")
    out(")")
  }
}

// main
process.argv.forEach(function (val, index, array) {
  if (index >= 2) {
    fs.readFile(val, 'utf8', compile_file);
  }
});


