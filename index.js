const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
var path = require('path');
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));
app.get('/admin', function(req, res) {
  res.sendFile(path.join(__dirname, '/public', 'admin.html'));
});

io.on('connection', function(socket){
  console.log('A user connected');
  socket.on('disconnect', function () {
     console.log('A user disconnected');
  });

  socket.on('sprite', (number) => {
    console.log("Emitting sprite number", number);
    io.emit('sprite-number', number);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log('Server listening on port ' + port);
});