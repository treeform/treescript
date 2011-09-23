0
net = require("net");
server = net.createServer(function (socket) {return socket.addListener("connect",function () {console.log("Connection from ",socket.remoteAddress);
return socket.end("Hello World\n");
});
});
server.listen(7000,"localhost");
console.log("TCP server listening on port 7000 at localhost.");

