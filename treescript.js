VERSION = .001

var fs = require("fs");

// this translate treescript fns to js operators
var OPS = {
  // basic math
  '+':'+', '-':'-', '*':'*', '/':'/', '%':'%',
  // comperison
  '>':'>', '>=':'=>', '<':'<', '<=':'<=', '=':'===', '!=':'!==',
  // function like
  'inc':'++', 'dec':'--',
  // booleans
  'and':'&&', "or":'||', "not":"!"
}

var QUOTES_RE = /^['@!~#$]+$/;

function json(a){
  return JSON.stringify(a);
}

// utils
function isString (obj){
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
}

// trys to compile it to a number if it can
function transform(token){
  var number = parseFloat(token);
  if (isNaN(number)){
    return token;
  }
  return number;
}


var builtins = {
  each: function(fn, obj){
    l = [];
    for(var k in obj) {
      if(obj.hasOwnProperty(k)){
        l.push(fn(k, obj[k]))
      }
    }
    return l;
  },
  map: function(fn,list){
    l = [];
    for(var i in list) {
      l.push(fn(list[i]))
    }
    return l;
  },
};

// takes a string and spits out tokens
// also takes care of comments and strings
function tokenize(code){
  var tokens = [], queue = '', start;
  for (var i = 0, l = code.length, c; c = code.charAt(i), i < l; i ++){
    if (c === ";"){
      while (c !== "\n"){
        i++;
        c = code.charAt(i);
      }
    } else if (QUOTES_RE.exec(c)){
      start = i;
      while (true){
        i++;
        c = code.charAt(i);
        if(!QUOTES_RE.exec(c)){
          break;
        }
      }
      tokens.push(code.substring(start, i))
      i --;
    } else if (c === '"'){
      start = i;
      c = null;
      while (c !== '"'){
        i++;
        c = code.charAt(i);
      }
      tokens.push(code.substring(start, i+1))
    } else if (c === '(' || c === ')' || /\s/.exec(c)){
      if (queue.length){
        tokens.push(queue);
      }
      if (c.replace(/\s+/g, '').length){
        tokens.push(c);
      }
      queue = '';
    } else {
      queue = queue + c;
    }
  }
  if (queue){
    tokens.push(queue);
  }
  return tokens;
}

// turns text into code tree
function parse(code){
  var tokens = tokenize(code), parens = 0,
      result = [], stack  = [result], tmp;
  for (var i = 0, length = tokens.length, token; token = tokens[i], i < length; i ++){
    if (token === '('){
      parens += 1
      tmp = [];
      stack[0].push(tmp);
      stack = [tmp].concat(stack);
    } else if (token === ')'){
      parens -= 1
      if (parens < 0){
        throw new Error("unbalanced closing parens");
      }
      if (stack.length){
        stack = stack.slice(1);
      }
    } else if (QUOTES_RE.exec(token)){
      i ++;
      if (tokens[i] === "("){
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
  if (parens != 0){
    throw new Error("unbalanced opening parens");
  }
  return result;
}

// to use the buffer add things with
// out("thing") and remove with rm("thing")
var buffer = [];
function out (){
  var args = Array.prototype.slice.call(arguments);
  for (i in args){
    var arg = args[i];
    buffer.push(arg);
  }
}
function rm (what){
  var val = buffer.pop();
  if (val != what) buffer.push(val);
}

macros = {}

// compile_file
function compile_file(err, text){
  console.log(compile_text(text));
}

function compile_text(err, text){
  var data = parse(text)

  for (var e in data){
    var line = data[e];
    compile(line);
    out(";\n");
  }
  // dump the buffer to out
  js_text = buffer.join("");
  buffer = [];
  console.log(js_text)
  return js_text;
}

function compile(data){
  var l = data.length;
  if (isString(data)){
    if (data[0] == '"'){
      out(data);
    } else {
      out(data);
    }
  } else if (l === undefined){
    // if data is not a list, just pass it on
    out(data);
  } else if (data[0] == ":"){
    // set!
    out(data[1], " = ")
    compile(data[2])
  } else if (data[0] == "fn"){
    // creates a new function
    out("function (", data[1], "){")
    for(var i = 2; i < data.length; i ++){
      if (i == data.length-1){
        out("return ")
      }
      compile(data[i])
      out(";\n")
    }
    out("}")
  } else if (data[0] == "let"){
    // let create new closure via a function
    out("(function (){\n")
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
  } else if (data[0] == "js"){
    out(data[1].slice(1,-1))
  } else if (data[0] == "'"){
    out(json(make_objs(data.slice(1))))
  } else if (OPS[data[0]]){
    op = OPS[data[0]]
    out("(")
    for(var i = 1; i < data.length; i ++){
      compile(data[i])
      out(" ", op, " ")
    }
    rm(" "); rm(op); rm(" ")
    out(")")
  } else if (data[0] == "if"){
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
    // need to add a false to the end if even args
    if ((data.length - 1) % 2 == 0) {
      out(" false ");
    }
    out(";")
  } else if (data[0] == "mac"){
    // macro definition
    var name = data[1]
    var args = data[2]
    var body = data[3]
    macros[name] = [args, body]
    //out("// defined mac ", name," ", json(args), " with ", json(body))
  } else {
    mac = macros[data[0]]
    if (mac){
      // macro expantion
      var lookup = {}
      var args = mac[0]
      var body = mac[1]
      for (var i = 0; i < args.length; i ++){
        lookup[args[i]] = data[1 + i];
      }
      //out("// look up ", json(lookup),json(body),"\n")
      var cbody = walk_mac(body, lookup)
      //out("// compile ", json(cbody),"\n")
      compile(cbody)
    } else {
      // function calls
      if(data[0] in builtins){
        add_fn(data[0]);
      }
      for (var e = 0; e < data.length; e ++){
        var a = data[e];
        if (e == 0){
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
}
// adds a build in function
var added = {}
function add_fn(name){
  if (name in added) {
    return;
  }
  var fn = builtins[name];
  var def = "var " + name + " = " + fn + ";\n";
  buffer = [def].concat(buffer);
  //console.log(buffer);
}

function walk_mac(it, lookup){
  if (Array.isArray(it)){
    if (it[0] == "#"){
      // use look up
      return lookup[it[1]];
    } else {
      // copy the list
      var l = []
      for(var i in it){
        var e = it[i];
        l.push(walk_mac(e, lookup));
      }
      return l;
    }
  } else {
    return it;
  }
}

// turns stuff like this
// ["a:",1,"b:",2,"c:",3] -> {a:1, b:2, c:3}
// [1, 2, 3, "a:",1,"b:",2,"c:",3] -> [1,2,3,4,"a:",1,"b:",2,"c:",3]
function make_objs(it){
  if (Array.isArray(it)){
    // copy the list
    var l = [];
    var o = {};
    var has_elem = false;
    var has_keys = false;
    for(var i = 0; i < it.length; i++){
      var e = it[i];
      if (isString(e) && e[e.length - 1] == ":"){
        has_keys = true;
        o[e.slice(0, e.length - 1)] = it[i + 1];
        i++;
      } else {
        has_elem = true;
        l.push(make_objs(e));
      }
    }
    if (has_keys && !has_elem){
      // its an object
      return o;
    } else if (!has_keys && has_elem){
      // its a list
      return l;
    } else {
      // its a hybrid
      l.push(o)
      return l;
    }
  } else {
    return it;
  }
}

function interactive(){
  var rl = require('readline');
  console.log("treescript "+VERSION+" | js in lisp clothing | (exit) to quit");
  var i = rl.createInterface(process.stdin, process.stdout);
  function read_line(){
    i.question("ts>", function(answer) {
      if (answer == "exit" || answer == "(exit)"){
        i.close();
        process.stdin.destroy();
        return;
      }
      try {
        console.log(".:",eval(compile_text(false, answer)));
      } catch (e) {
        console.log(e.message);
      }
      // read the next line
      read_line();
    });
  };
  read_line();
}

// main
process.argv.forEach(function (val, index, array){
  if (index >= 2){
    fs.readFile(val, 'utf8', compile_text);
  }
});

if (process.argv.length == 2){
  interactive();
}


