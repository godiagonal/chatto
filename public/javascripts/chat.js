var socket = io.connect('192.168.0.101:3000');
var messages = [];

function trim(str) {
  return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

function sendMessage() {
  var message = trim($('#txtMessage').val());
  var userName = $('#hidUserName').val();
  
  //prevent empty user name and message
  if(userName == '') {
    alert('Please enter an alias');
    return;
  }
  else if(message.replace(/(\r\n|\n|\r)/gm,'') == '') {
    return;
  }

  //push to server
  var data = {userName: null, message: message, date: null};
  socket.emit('message', data);

  $('#txtMessage').val('');
}

function saveUserName(userName) {
  userName = trim(userName);

  //prevent empty user name
  if(userName.length == 0) {
    $('#txtUserName').addClass('error');
    return;
  }

  //check if user name is available, if so attach to socket
  socket.emit('saveUser', {userName: userName});
}

function editUserName() {
  $('#showUserName').hide();
  $('#editUserName').show();

}

$(window).load(function(){
  //bind events
  $('#btnSend').bind('click', sendMessage);
  $('#txtMessage').bind('keypress', function(e) {
    if(e.keyCode==13 && !event.shiftKey) { //allow shift+enter line break
      e.preventDefault();
      sendMessage();
    }
  });
  $('#btnSaveUserName').bind('click', function() { saveUserName($('#txtUserName').val()) });
  $('#txtUserName').bind('keypress', function(e) {
    if(e.keyCode==13) {
      e.preventDefault();
      saveUserName($('#txtUserName').val());
    }
  });
  $('#btnEditUserName').bind('click', editUserName);

  //use user name from cookie if available
  if ($.cookie('username') != undefined) {
    //$.removeCookie('username');
    saveUserName($.cookie('username'));
  }

  //refresh messages
  socket.on('message', function(data) {
    messages.push(data);
    var html = '';
    for(i=0;i<messages.length;i++) {
      html += '<div class="row">'
      html +=   '<div class="cell timestamp">' + moment(messages[i].date).format('HH:MM') + '</div>'
      html +=   '<div class="cell"><span class="userName">' + messages[i].userName + ':</span> ' + messages[i].message.replace(/(\r\n|\n|\r)/gm,'<br>') + '</div>'
      html += '</div>'
    }
    $('#messageList').html(html);
    $("#messagesInner").scrollTop($("#messages")[0].scrollHeight);
  });

  //callback for saveUserName()
  socket.on('saveUserCallback', function(data) {
    //always fill this
    $('#txtUserName').val(data.userName);

    //if user name in use 
    if(data.userIsConnected) {
      $('#txtUserName').addClass('error');
      $('#lblUserNameError').show();
    }
    //if user name available
    else {
      //update cookie and document
      $.cookie('username', data.userName, {expires: 30, path: '/'});
      $('#hidUserName').val(data.userName);
      $('#lblUserName').html(data.userName);

      $('#editUserName').hide();
      $('#lblUserNameError').hide();
      $('#txtUserName').removeClass('error');
      $('#showUserName').show();
    }
  });

  //refresh user list
  socket.on('userList', function(data) {
    var html = '';
    for(i=0;i<data.userList.length;i++) {
      html += '<li>' + data.userList[i] + '</li>';
    }
    $('#userList').html(html);
  });
});

