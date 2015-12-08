var express = require('express'),
  helmet = require('helmet'),
  app = require('express')(),
  server = require('http').createServer(app),
  morgan = require('morgan'),
  compress = require('compression'),
  errorHandler = require('errorhandler'),
  bodyParser = require('body-parser'),
  favicon = require('static-favicon'),
  path = require('path'),
  routes = require('./routes'),
  config = require('./config'),
  moment = require('moment'),
  qs = require('querystring'),
  async = require('async'),
  mongoose = require('mongoose'),
  request = require('request');
var io = require('socket.io')(server);
io.on('connection', function(client) {
  // playerturn
  client.on('PlayerTurn', function(data) {
    io.emit('PlayerTurnEmit', data);
  });
  // game over
  client.on('GameOver', function(data) {
    io.emit('GameOverEmit', data);
  });
  // game over cat
  client.on('GameOverCat', function(data) {
    io.emit('GameOverCatEmit', data);
  });
  // button disabled
  client.on('PlayerButtonDisabled', function(data) {
    io.emit('PlayerButtonDisabledEmit', data);
  });
  console.log("Number of player connected to the server: " + io.engine.clientsCount);

  //Useful to know when someone connects
  console.log(client.user);
  console.log('\t socket.io:: player ' + client + ' connected');


  //When this client disconnects
  client.on('disconnect', function() {
    //Useful to know when someone disconnects
    console.log('\t socket.io:: client disconnected ' + client.user_name);
    io.emit("disconnected", client.user_name);
  }); //client.on disconnect

}); //io.sockets.on connection
app.set('socketio', io); // set socketio here so can use in express route file
server.listen(process.env.PORT || 3000);
// all environments
app.use(helmet());
app.use(helmet.noCache());
app.use(compress());
app.set('port', process.env.PORT || 3000);
app.use(morgan('dev'));
app.use(bodyParser.json({
  limit: '50mb'
}));
app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true
}));
app.use('/static', express.static(path.join(__dirname, 'public'), {
  maxAge: 31557600000
}));
app.use(favicon());
app.use(errorHandler());
app.enable('trust proxy');
//routes should alway come before '*' don't change the order
routes(app, mongoose);
//for html5 mode
app.get('*', function(req, res) {
  res.sendFile('master.html', {
    root: path.join(__dirname, '/public/views/')
  });
});
mongoose.connect(config.MONGO_URI);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
});
