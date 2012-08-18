var list = function (){
    return Array.prototype.slice.call(arguments);
  };
var table = function (){
    var l = Array.prototype.slice.call(arguments);
    var t = {};
    for(var i = 0; i < l.length; i += 2){
      t[l[i]] = l[i+1];
    }
    return t
  };
var VERSION = 0.002;
var fs = require("fs");
function json(a){
return JSON.stringify(a);
};
function is_string(obj){
return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
};
var is_list = Array.isArray;
function is_object(obj){
return (is_list(obj) ? false : (obj === Object(obj)));
};
function is_number(obj){
return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
};
function rest(l){
return l.slice(1);
};
function join(){

  var ll=arguments.length, l=[]; 
  for(var i=0; i < ll; i++) {
    var a = arguments[i];
    for(e in a) l.push(a[e]);
  }; 
  ;
return l;
};
function list(){

  var ll=arguments.length, l=[]; 
  for(var i=0; i < ll; i++) {
    l.push(arguments[i]);
  }; 
  ;
return l;
};
function table(){

  var ll=arguments.length, t={}; 
  for(var i=0; i < ll; i+=2) {
    t[arguments[i]] = arguments[i+1]
  }; 
  ;
return t;
};
function str_join(l,str){
return l.join(str);
};
function get(l,i){
return l[i];
};
function set(l,i,e){
l[i]=e;
return e;
};
function err(msg){
throw msg;
return false;
};
function include(file_){
with (global) { eval(fs.readFileSync(file_) + '');};;
return 0;
};
var OPS = table("+","+","-","-","*","*","/","/","%","%",">",">",">=",">=","<","<","<=","<=","=","===","!=","!==","inc","++","dec","--","and","&&","or","||","not","!");
var QUOTES_RE = (new RegExp("^['@~#]+$"));
function try_number(token){
var number = parseFloat(token);
return (isNaN(number) ? token : (number === 0) ? parseInt(token) : number);
};
function tokenize(code,filename){
var line = 1;
var column = 1;
var tokens = list();
var word = list();
var i = 0;
var len = code.length;
function add_word(){
return ((word.length > 0) ? (function (){
var token = word.join("");
token.line = line;
token.filename = filename;
token.column = column;
tokens.push(token);
return word = list();
})() :  false );
};
while ((i < len)){
c = code[i];
(((c === "\n")) ? (function (){
add_word();
line = (line + 1);
return column = 0;
})() : ((c === " ") || (c === "\t")) ? add_word() : ((c === "(") || (c === ")") || QUOTES_RE.exec(c)) ? (function (){
add_word();
return tokens.push(c);
})() : (c === "\"") ? (function (){
add_word();
var next = true;
word.push(c);
while (next){
((i >= len) ? err(("unclosed \" " + filename + ":" + line + "," + column)) :  false );
i = (i + 1);
column = (column + 1);
c = code[i];
((c === "\"") ? next = false :  false );
((c === "\\") ? (function (){
word.push(c);
i = (i + 1);
return c = code[i];
})() :  false );
word.push(c);
};
return add_word();
})() : (c === ";") ? (function (){
add_word();
var next = true;
while ((next && (i < len))){
i = (i + 1);
c = code[i];
((c === "\n") ? next = false :  false );
};
return false;
})() : word.push(c));
i = (i + 1);
column = (column + 1);
};
add_word();
return tokens;
};
function parse(tokens){
var stack = list();
var line = list();
function squote(q){
qline = list(q);
var t = tokens.shift(0);
return ((t === "(") ? (function (){
stack.push(line);
return line = qline;
})() : (function (){
qline.push(try_number(t));
return line.push(qline);
})());
};
function spush(){
stack.push(line);
return line = list();
};
function spop(){
((stack.length < 1) ? err("unbalanced perens, to many )") :  false );
return (function (){
var up = stack.pop();
up.push(line);
return line = up;
})();
};
function next(){
var t = tokens.shift(0);
return (QUOTES_RE.exec(t) ? squote(t) : (t === "(") ? spush() : (t === ")") ? spop() : line.push(try_number(t)));
};
while ((tokens.length > 0)){
next();
};
((stack.length > 0) ? err("unbalanced perens, not enough )") :  false );
return line;
};
function compile(tree){
var buffer = list();
function wr(str){
return buffer.push(str);
};
function rm(str){
return ((buffer[(buffer.length - 1)] === str) ? buffer.pop() :  false );
};
function quotate(tree){
console.log(JSON.stringify(tree));
return (is_list(tree) ? (function (){
wr("[");
var i = 0;
while ((i < tree.length)){
quotete(e);
i = (i + 1);
};
return wr("]");
})() : is_string(tree) ? (function (){
wr("\"");
wr(tree);
return wr("\"");
})() :  false );
};
var SCOPE_MARK = "//$SCOPE$";
var scope_stack = list();
function scope_start(){
scope_stack.push(list());
return wr(SCOPE_MARK);
};
function scope_end(){
var vars = scope_stack.pop();
var i = (buffer.length - 1);
while ((buffer[i] !== SCOPE_MARK)){
i = (i - 1);
};
return (buffer[i] = (vars.length ? ("var " + str_join(vars,",") + ";\n") : ""));
};
function scope_add(name){
var top = scope_stack[(scope_stack.length - 1)];
return top.push(name);
};
function co_def(head,tree){
var what = tree[1];
wr("(");
(is_list(what) ? (function (){
var fn_name = what[0];
scope_add(fn_name);
wr(fn_name);
wr("=");
var tree2 = join(list("fn"),list(rest(tree[1])),tree.slice(2));
return co_fn(head,tree2);
})() : (function (){
scope_add(what);
wr(what);
wr("=");
return sub(tree[2]);
})());
return wr(")");
};
function co_set(head,tree){
wr("(");
wr(tree[1]);
wr("=");
sub(tree[2]);
return wr(")");
};
function co_ops(head,tree){
var op = OPS[head];
var i = 1;
wr("(");
while ((i < tree.length)){
sub(tree[i]);
wr(op);
i = (i + 1);
};
rm(op);
return wr(")");
};
function co_js(head,tree){
var codestr = tree[1];
return wr(codestr.slice(1,-1));
};
function co_if(head,tree){
var i = 1;
while (((i + 1) < tree.length)){
sub(tree[i]);
wr("?");
i = (i + 1);
sub(tree[i]);
wr(":");
i = (i + 1);
};
return ((i < tree.length) ? sub(tree[i]) : wr("null"));
};
function co_fn(head,tree){
wr("(function(");
var args = tree[1];
wr(args);
wr("){\n");
scope_start();
var i = 2;
while ((i < tree.length)){
((i === (tree.length - 1)) ? wr("return ") :  false );
sub(tree[i]);
wr(";\n");
i = (i + 1);
};
scope_end();
return wr("})");
};
function co_do(head,tree){
wr("(function(){\n");
var i = 1;
while ((i < tree.length)){
((i === (tree.length - 1)) ? wr("return ") :  false );
sub(tree[i]);
wr(";\n");
i = (i + 1);
};
return wr("}())");
};
function co_while(head,tree){
wr("(function(){");
wr("while(");
sub(tree[1]);
wr("){\n");
var i = 2;
while ((i < tree.length)){
sub(tree[i]);
wr(";\n");
i = (i + 1);
};
return wr("}}())");
};
function co_new(head,tree){
wr("(new ");
sub(tree[1]);
return wr(")");
};
function co_quote(head,tree){
return ((tree.length > 2) ? wr(JSON.stringify(tree.slice(1))) : wr(JSON.stringify(tree[1])));
};
function co_regular_fn_call(head,tree){
wr(head);
wr("(");
var i = 1;
while ((i < tree.length)){
sub(tree[i]);
wr(",");
i = (i + 1);
};
rm(",");
return wr(")");
};
function sub(tree){
return (is_list(tree) ? (function (){
var head = tree[0];
return (OPS[head] ? co_ops(head,tree) : (head === "def") ? co_def(head,tree) : (head === "js") ? co_js(head,tree) : (head === "if") ? co_if(head,tree) : (head === "fn") ? co_fn(head,tree) : (head === "do") ? co_do(head,tree) : (head === "while") ? co_while(head,tree) : (head === "new") ? co_new(head,tree) : (head === ":") ? co_set(head,tree) : (head === "'") ? co_quote(head,tree) : co_regular_fn_call(head,tree));
})() : wr(tree));
};
scope_start();
var i = 0;
while ((i < tree.length)){
sub(tree[i]);
wr(";\n");
i = (i + 1);
};
scope_end();
return buffer.join("");
};
function compile_file(filename){
var source = fs.readFileSync(filename,"utf8");
var code = compile(parse(tokenize(source)));
return fs.writeFileSync((filename + ".js"),code);
};
function run(filename){
console.log("running",filename);
var source = fs.readFileSync(filename,"utf8");
var code = compile(parse(tokenize(source)));
return eval(code);
};
function repl(){
var readline = require("readline");
var rl = readline.createInterface(process.stdin,process.stdout);
function next(){
return rl.question(">",function (line){
console.log(eval(compile(parse(tokenize(line)))));
return next();
});
};
return next();
};
var filename = process.argv.splice(2,1)[0];
((filename === "-c") ? compile_file(process.argv[2]) : filename() ? run(filename) : repl());

