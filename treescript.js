var fs = require("fs");


// utils
isString = function(obj) {
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
};


var QUOTES_RE = /^['@!~#$]+$/;

function transform(token) {
  //if (token.indexOf('"') === 0) {
  //  return token.substring(1, token.length - 1);
  //}
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
        //console.log("next char", char);
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
    //console.log(tokens);
  return tokens;
};

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
  //console.log(stack, stack[0].length)
  //console.log(result);
  console.log(parens)
  if (parens != 0) throw "unbalanced opening parens"

  return result;
};


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

function compile(err, data) {
  //parse(data)
  var data = parse(data)
  for (var e in data){
    var exp = data[e];
    compile_exp(exp);
    out(";\n");
  }
  code = buffer.join("");
  console.log(code);
  //eval(code);
}

function compile_exp(data) {
  var l = data.length;
  //console.log(buffer)
  if (isString(data)){
    if (data[0] == '"') {
      out(data);
    } else {
      out(lookup(data));
    }
    return
  }
  if (l === undefined){
    out(data);
    return
  }

  if (data[0] == ":") {
    out(lookup(data[1]), " = ")
    compile_exp(data[2])
    return
  } else if (data[0] == "fn") {
    out("function (", data[1], ") {")
    for(var i = 2; i < data.length; i ++){
      if (i == data.length-1){
        out("return ")
      }
      compile_exp(data[i])
      out(";\n")
    }
    out("}")
    return
  } else if (data[0] == "js") {
    out(data[1].slice(1,-1))
    return
  } else if (data[0] == "'") {
    out(JSON.stringify(data.slice(1)))
    return
  }

  for (var e in data){
    var a = data[e];
    if (e == 0) {
      //out("call(")
      compile_exp(a);
      out("(");
      //out(",");
    } else {
      compile_exp(a);
      out(",")
    }
  }
  rm(",");
  out(")");

}

function lookup(d){
  //if (d.match(/^[A-Za-z0-9]*$/)){
  //return "env['"+d+"']"
  //}
  //return d
  return d.replace(/\+/g,"plus").replace(/\-/g,"__").replace(/\*/g,"mul").replace(/\//g,"div").replace(/\=/g,"eq").replace(/\>/g,"gr").replace(/\</g,"ls").replace(/\'/g,"quote")
}

//function stub(err, data) {
//  out(data);
fs.readFile("cps.tree", 'utf8', compile);
//}

//fs.readFile("stub.js", 'utf8', stub);



