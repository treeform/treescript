var VERSION,fs,json,is_string,is_list,is_object,is_number,rest,join,list,table,str_join,get,set,err,include,OPS,QUOTES_RE,try_number,tokenize,parse,compile,compile_file,run,repl,filename;
(VERSION=0.003);
(fs=require("fs"));
(json=(function(a){
return JSON.stringify(a);
}));
(is_string=(function(obj){
return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
}));
(is_list=Array.isArray);
(is_object=(function(obj){
return is_list(obj)?false:(obj === Object(obj));
}));
(is_number=(function(obj){
return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
}));
(rest=(function(l){
return l.slice(1);
}));
(join=(function(){

  var ll=arguments.length, l=[]; 
  for(var i=0; i < ll; i++) {
    var a = arguments[i];
    for(e in a) l.push(a[e]);
  }; 
  ;
return l;
}));
(list=(function(){

  var ll=arguments.length, l=[]; 
  for(var i=0; i < ll; i++) {
    l.push(arguments[i]);
  }; 
  ;
return l;
}));
(table=(function(){

  var ll=arguments.length, t={}; 
  for(var i=0; i < ll; i+=2) {
    t[arguments[i]] = arguments[i+1]
  }; 
  ;
return t;
}));
(str_join=(function(l,str){
return l.join(str);
}));
(get=(function(l,i){
return l[i];
}));
(set=(function(l,i,e){
l[i]=e;
return e;
}));
(err=(function(msg){
throw msg;
return false;
}));
(include=(function(file_){
with (global) { eval(fs.readFileSync(file_) + '');};;
return 0;
}));
(OPS=table("+","+","-","-","*","*","/","/","%","%",">",">",">=",">=","<","<","<=","<=","=","===","!=","!==","inc","++","dec","--","and","&&","or","||","not","!"));
(QUOTES_RE=(new RegExp("^['@~#]+$")));
(try_number=(function(token){
var number;
(number=parseFloat(token));
return isNaN(number)?token:(number===0)?parseInt(token):number;
}));
(tokenize=(function(code,filename){
var line,column,tokens,word,i,len,add_word,next,next;
(line=1);
(column=1);
(tokens=list());
(word=list());
(i=0);
(len=code.length);
(add_word=(function(){
var token;
return (word.length>0)?(function(){
(token=word.join(""));
(token.line=line);
(token.filename=filename);
(token.column=column);
tokens.push(token);
return (word=list());
}()):null;
}));
(function(){while((i<len)){
(c=get(code,i));
((c==="\n"))?(function(){
add_word();
(line=(line+1));
return (column=0);
}()):((c===" ")||(c==="\t"))?add_word():((c==="(")||(c===")")||QUOTES_RE.exec(c))?(function(){
add_word();
return tokens.push(c);
}()):(c==="\"")?(function(){
add_word();
(next=true);
word.push(c);
(function(){while(next){
(i>=len)?err(("unclosed \" "+filename+":"+line+","+column)):null;
(i=(i+1));
(column=(column+1));
(c=get(code,i));
(c==="\"")?(next=false):null;
(c==="\\")?(function(){
word.push(c);
(i=(i+1));
return (c=get(code,i));
}()):null;
word.push(c);
}}());
return add_word();
}()):(c===";")?(function(){
add_word();
(next=true);
(function(){while((next&&(i<len))){
(i=(i+1));
(c=get(code,i));
(c==="\n")?(next=false):null;
}}());
return false;
}()):word.push(c);
(i=(i+1));
(column=(column+1));
}}());
add_word();
return tokens;
}));
(parse=(function(tokens){
var stack,line,squote,spush,spop,next;
(stack=list());
(line=list());
(squote=(function(q){
var t;
(qline=list(q));
(t=tokens.shift(0));
return (t==="(")?(function(){
stack.push(line);
return (line=qline);
}()):(function(){
qline.push(try_number(t));
return line.push(qline);
}());
}));
(spush=(function(){
stack.push(line);
return (line=list());
}));
(spop=(function(){
var up;
(stack.length<1)?err("unbalanced perens, to many )"):null;
return (function(){
(up=stack.pop());
up.push(line);
return (line=up);
}());
}));
(next=(function(){
var t;
(t=tokens.shift(0));
return QUOTES_RE.exec(t)?squote(t):(t==="(")?spush():(t===")")?spop():line.push(try_number(t));
}));
(function(){while((tokens.length>0)){
next();
}}());
(stack.length>0)?err("unbalanced perens, not enough )"):null;
return line;
}));
(compile=(function(tree){
var buffer,wr,rm,quotate,SCOPE_MARK,scope_stack,scope_start,scope_end,scope_add,co_def,co_set,co_ops,co_js,co_if,co_fn,co_do,co_while,co_new,co_quote,co_regular_fn_call,sub,i;
(buffer=list());
(wr=(function(str){
return buffer.push(str);
}));
(rm=(function(str){
return (get(buffer,(buffer.length-1))===str)?buffer.pop():null;
}));
(quotate=(function(tree){
var i;
console.log(JSON.stringify(tree));
return is_list(tree)?(function(){
wr("[");
(i=0);
(function(){while((i<tree.length)){
quotete(e);
(i=(i+1));
}}());
return wr("]");
}()):is_string(tree)?(function(){
wr("\"");
wr(tree);
return wr("\"");
}()):null;
}));
(SCOPE_MARK="//$SCOPE$");
(scope_stack=list());
(scope_start=(function(){
scope_stack.push(list());
return wr(SCOPE_MARK);
}));
(scope_end=(function(){
var vars,i;
(vars=scope_stack.pop());
(i=(buffer.length-1));
(function(){while((get(buffer,i)!==SCOPE_MARK)){
(i=(i-1));
}}());
return set(buffer,i,vars.length?("var "+str_join(vars,",")+";\n"):"");
}));
(scope_add=(function(name){
var top;
(top=get(scope_stack,(scope_stack.length-1)));
return top.push(name);
}));
(co_def=(function(head,tree){
var what,fn_name,tree2;
(what=get(tree,1));
wr("(");
is_list(what)?(function(){
(fn_name=get(what,0));
scope_add(fn_name);
wr(fn_name);
wr("=");
(tree2=join(list("fn"),list(rest(get(tree,1))),tree.slice(2)));
return co_fn(head,tree2);
}()):(function(){
scope_add(what);
wr(what);
wr("=");
return sub(get(tree,2));
}());
return wr(")");
}));
(co_set=(function(head,tree){
wr("(");
wr(get(tree,1));
wr("=");
sub(get(tree,2));
return wr(")");
}));
(co_ops=(function(head,tree){
var op,i;
(op=get(OPS,head));
(i=1);
wr("(");
(function(){while((i<tree.length)){
sub(get(tree,i));
wr(op);
(i=(i+1));
}}());
rm(op);
return wr(")");
}));
(co_js=(function(head,tree){
var codestr;
(codestr=get(tree,1));
return wr(codestr.slice(1,-1));
}));
(co_if=(function(head,tree){
var i;
(i=1);
(function(){while(((i+1)<tree.length)){
sub(get(tree,i));
wr("?");
(i=(i+1));
sub(get(tree,i));
wr(":");
(i=(i+1));
}}());
return (i<tree.length)?sub(get(tree,i)):wr("null");
}));
(co_fn=(function(head,tree){
var args,i;
wr("(function(");
(args=get(tree,1));
wr(args);
wr("){\n");
scope_start();
(i=2);
(function(){while((i<tree.length)){
(i===(tree.length-1))?wr("return "):null;
sub(get(tree,i));
wr(";\n");
(i=(i+1));
}}());
scope_end();
return wr("})");
}));
(co_do=(function(head,tree){
var i;
wr("(function(){\n");
(i=1);
(function(){while((i<tree.length)){
(i===(tree.length-1))?wr("return "):null;
sub(get(tree,i));
wr(";\n");
(i=(i+1));
}}());
return wr("}())");
}));
(co_while=(function(head,tree){
var i;
wr("(function(){");
wr("while(");
sub(get(tree,1));
wr("){\n");
(i=2);
(function(){while((i<tree.length)){
sub(get(tree,i));
wr(";\n");
(i=(i+1));
}}());
return wr("}}())");
}));
(co_new=(function(head,tree){
wr("(new ");
sub(get(tree,1));
return wr(")");
}));
(co_quote=(function(head,tree){
return (tree.length>2)?wr(JSON.stringify(tree.slice(1))):wr(JSON.stringify(get(tree,1)));
}));
(co_regular_fn_call=(function(head,tree){
var i;
wr(head);
wr("(");
(i=1);
(function(){while((i<tree.length)){
sub(get(tree,i));
wr(",");
(i=(i+1));
}}());
rm(",");
return wr(")");
}));
(sub=(function(tree){
var head;
return is_list(tree)?(function(){
(head=get(tree,0));
return get(OPS,head)?co_ops(head,tree):(head==="def")?co_def(head,tree):(head==="js")?co_js(head,tree):(head==="if")?co_if(head,tree):(head==="fn")?co_fn(head,tree):(head==="do")?co_do(head,tree):(head==="while")?co_while(head,tree):(head==="new")?co_new(head,tree):(head===":")?co_set(head,tree):(head==="'")?co_quote(head,tree):co_regular_fn_call(head,tree);
}()):wr(tree);
}));
scope_start();
(i=0);
(function(){while((i<tree.length)){
sub(get(tree,i));
wr(";\n");
(i=(i+1));
}}());
scope_end();
return buffer.join("");
}));
(compile_file=(function(filename){
var source,code;
(source=fs.readFileSync(filename,"utf8"));
(code=compile(parse(tokenize(source))));
return fs.writeFileSync((filename+".js"),code);
}));
(run=(function(filename){
var source,code;
console.log("running",filename);
(source=fs.readFileSync(filename,"utf8"));
(code=compile(parse(tokenize(source))));
return eval(code);
}));
(repl=(function(){
var readline,rl,next;
(readline=require("readline"));
(rl=readline.createInterface(process.stdin,process.stdout));
(next=(function(){
return rl.question(">",(function(line){
console.log(eval(compile(parse(tokenize(line)))));
return next();
}));
}));
return next();
}));
(filename=get(process.argv.splice(2,1),0));
(filename==="-c")?compile_file(get(process.argv,2)):filename()?run(filename):repl();
