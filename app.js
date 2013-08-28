var express = require('express');
var path = require('path');
var moment = require('moment');

var app = express();

//server settings
app.configure(function(){
	app.set('port', process.env.PORT || 80);
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
    title: 'Chatto'
  });
});

//start web server
var server = app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//start socket communication
var io = require('socket.io').listen(server);

var maxMessages = 5;
var latestMessages = [];
var dataArray = [];

io.sockets.on('connection', function(client){
  //gather the XX latest messages
  dataArray = [];
  for(i=0;i<latestMessages.length;i++) {
    dataArray.push(latestMessages[i]);
  }

  //add welcome text
  dataArray.push({date: moment(), userName: 'Server', message: 'Welcome to the chat~'});

  //send array of messages
  client.emit('message', dataArray);
  
  //push user list client
  client.emit('userList', { userList: getUserList() });

  client.on('message', function(data) {
    /*
    var failedUpdateUser = false;

    //add user name saved in socket
    client.get('username', function(err, userName) {
      //server "forgot" the user name while the client was inactive
      //use user name from client (front-end check; can't be null)
      if(userName == null) {
        //attach user name from client to socket
        if(!isConnected(data.userName,userName))
          client.set('username', data.userName);
        else
          failedUpdateUser = true;
      }
      else
        data.userName = userName;
      
    });

    if(failedUpdateUser) {
      //trigger callback on client side (same as in saveUser) and terminate callback
      client.emit('saveUserCallback', {userIsConnected: true, userName: data.userName});
      return;
    }
    */

    //add user name saved in socket
    client.get('username', function(err, userName) {
      data.userName = userName;
    });

    //add timestamp
    data.date = moment();

    //make into array
    dataArray = [];
    dataArray[0] = data;

    //forward to all clients
    io.sockets.emit('message', dataArray);

    //cache the XX latest messages to emit on new client connection
    latestMessages.push(data);
    if(latestMessages.length >= maxMessages) {
      var tmpLatestMessages = latestMessages.slice(latestMessages.length-maxMessages,latestMessages.length);
      latestMessages = [];
      latestMessages = tmpLatestMessages;
    }
  });
  
  client.on('saveUser', function(data) {
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