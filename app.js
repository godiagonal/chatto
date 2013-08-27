var express = require('express');
var path = require('path');
var moment = require('moment');

var app = express();

//server settings
app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(require('stylus').middleware(__dirname + '/public'));
	app.use(express.static(path.join(__dirname, 'public')));
});

//index page
app.get('/', function(req, res){
  res.render('index', {
    title: 'Home'
    ,abc: {1:'a',2:'b',3:'c'}
  });
});

//start web server
var server = app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//start socket communication
var io = require('socket.io').listen(server);

io.sockets.on('connection', function(client){
  //welcome text
  client.emit('message', {date: new Date(), userName: 'Server', message: 'Welcome to the chat~'});
  
  //push user list client
  client.emit('userList', { userList: getUserList() });

  client.on('message', function(data) {
    //add user name and time
    client.get('username', function(err, userName) {
      data.userName = userName;
    });
    data.date = moment();

    //forward to all clients
    io.sockets.emit('message', data);

    //todo: cache 10 latest messages and emit on new client connection
  });
  
  client.on('saveUser', function(data){
    //to allow choosing the same user name again
    var prevUserName = '';
    client.get('username', function(err, userName) {
      prevUserName = userName;
    });

    //check if username is already in use
    var userIsConnected = isConnected(data.userName,prevUserName);

    //attach user name to socket
    if(!userIsConnected)
      client.set('username', data.userName);

    //trigger callback on client side
    client.emit('saveUserCallback', {userIsConnected: userIsConnected, userName: data.userName});

    //push new user list to all clients
    io.sockets.emit('userList', {userList: getUserList()});
  });

  client.on('disconnect', function() {
    //remove client from user list
    client.set('username', null);

    //push new user list to all clients
    io.sockets.emit('userList', {userList: getUserList()});
  });
})

function isConnected(userName,prevUserName) {
  var match = false;

  if(userName == null)
    userName = '';
  if(prevUserName == null)
    prevUserName = '';

  //alias 'Server' not allowed
  if(userName.toLowerCase() == 'server')
    return true;

  //check all sockets for user name match
  for (var clientId in io.sockets.sockets) {
    io.sockets.sockets[clientId].get('username', function(err, tmpUserName) {
      if(tmpUserName != null && tmpUserName.toLowerCase() == userName.toLowerCase() && tmpUserName.toLowerCase() != prevUserName.toLowerCase()) {
        match = true;
      }
    });
    if (match)
      break;
  }

  return match;
}

function getUserList() {
  var userList = [];

  //fetch user name from all sockets
  for (var clientId in io.sockets.sockets) {
    io.sockets.sockets[clientId].get('username', function(err, userName) {
      if(userName != null)
        userList.push(userName);
    });
  }

  return userList;
}