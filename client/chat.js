updateHeight = function () {
  highlightChannel();
  var body_height = $('body').height();
  var final_height = body_height - 90;
  $('#chat, #chat-channel-users, #chat-main, #chat-servers').height(final_height);
}

Template.chat_connections.servers = function () {
  return Servers.find();
}

Template.server_channels.channels = function (server_id) {
  return Channels.find({server_id: server_id});
}

Template.chat.rendered = function () {
  $('.content-main').addClass('no-padding');
}

function  highlightChannel () {
  var room_id = Session.get('room_id');
  $('.server-room').parent().removeClass('active');
  if (Session.get('roomtype') == 'channel')
    $('.server-room#channel-id-' + room_id).parent().addClass('active');
  else if (Session.get('roomtype') == 'pm')
    $('.server-room#' + room_id).parent().addClass('active');

}

Template.chat_main.chat_logs = function () {
  var room_id = Session.get('room_id');
  if (Session.get('roomtype') == 'channel') {
    return ChannelLogs.find({channel_id: room_id});
  } else if (Session.get('roomtype') == 'pm') {
    var nick = room_id.substr(room_id.indexOf('-') + 1);
    return PMLogs.find({
      $or: [
        {from: nick, to_user_id: Meteor.user()._id},
        {from_user_id: Meteor.user()._id, to: nick}
      ]
    });
  }
}

Template.chat_main.rendered = updateHeight;

Template.chat_main.events = {
  'scroll #chat-main': function (event) {
    var scroll_top = $(event.target).scrollTop();
    if ((event.target.scrollHeight - scroll_top) <= $(this).outerHeight())
      scroll_top = null;
    if (Session.get('roomtype') == 'channel')
      Session.set('scroll_height_' + Session.get('channel_id'),
        scroll_top);
    else if (Session.get('roomtype') == 'pm')
      Session.set('scroll_height_' + Session.get('pm_id'),
        scroll_top);
  }
};

function serverRoomSelectHandler (event) {
    var $target = $(event.target);
    if ($target.hasClass('caret'))
      return;
    event.stopPropagation();
    var server_id = $target.parents('.server').data('server-id');
    Session.set('server_id', server_id);
    $('.dropdown.open').removeClass('open');
      var prev_room_id = Session.get('room_id');
      Session.set('scroll_height_' + prev_room_id, $('#chat-main').scrollTop() || null);
    if ($target.data('roomtype') == 'channel') {
      Session.set('roomtype', 'channel');
      Session.set('room_id', $(event.target).data('id'));
    } else if ($target.data('roomtype') == 'pm') {
      Session.set('roomtype', 'pm');
      Session.set('room_id', $target.attr('id'));
    }
    highlightChannel();
} 

Template.chat_connections.events({
  'click .server-room': serverRoomSelectHandler
});

Template.server_pms.pms = function (id) {
  var server = Servers.findOne({_id: id});
  var user = Meteor.user();
  var pms = user.profile.connections[id].pms;
  var return_pms = [];
  for (nick in pms)
    return_pms.push({name: nick, server_id: server._id});
  return return_pms;
}

Template.chat_users.events({
  'click .channel-user': function (event) {
    if ($(event.target).hasClass('caret'))
      return;
    event.stopPropagation();
    $('.channel-user').parent().removeClass('active');
    $('.dropdown.open').removeClass('open');
    $(event.target).parent().addClass('active');
  }
});

Template.server_channels.rendered = updateHeight;

Template.chat_users.channel_users = function () {
  if (Session.get('roomtype') == 'channel') {
    var channel_id = Session.get('room_id');
    var channel = Channels.findOne({_id: channel_id});
    var nicks = {};
    if (channel)
      nicks = channel.nicks || {};
    var nicks_list = [];
    for (var key in nicks)
      nicks_list.push({name: key, status: nicks.key})
    return nicks_list;
  } else
    return [];
}

Template.chat_users.rendered = updateHeight;

Template.chat_main.rendered = function () {
  setTimeout(function () {
    updateHeight();
    var channel_height = Session.get(
      'scroll_height_' + Session.get('channel_id'));
    $('#chat-main').scrollTop(channel_height || $('#chat-logs').height());
  }, 0);
};

Template.chat_main.destroyed = function () {
  Session.set('scroll_height_' + Session.get('channel_id'), $('#chat-main').scrollTop());
};

Client = {};

Meteor.subscribe("client", Meteor.user() && Meteor.user().username);

Template.chat_input.events({
  'submit #chat-input-form': function (event) {
    event.preventDefault();
    var $form = $(event.target);
    var $chat_input = $form.find('#chat-input');
    var message = $chat_input.val();
    if (!message)
      return;
    $chat_input.val('');
    if (Session.get('roomtype') == 'channel') {
      var room_id = Session.get('room_id');
      var channel = Channels.findOne({_id: room_id});
      ChannelLogs.insert({
        from: 'rtnpro',
        user_id: Meteor.user()._id,
        channel: channel.name,
        channel_id: room_id,
        message: message,
        time: new Date(),
      });
      Meteor.call('say', message, room_id, roomtype="channel");
    } else if (Session.get('roomtype') == 'pm') {
      var room_id = Session.get('room_id');
      var nick = room_id.substr(room_id.indexOf('-') + 1);
      PMLogs.insert({
        from: Meteor.user().username,
        from_user_id: Meteor.user()._id,
        to: nick,
        message: message,
        time: new Date(),
      });
      Meteor.call('say', message, room_id, roomtype='pm');
    }
    Session.set('scroll_height_' + room_id, null);
  }
});

Template.chat_users.events = {
  'click .pm-user': function (event) {
    var $target = $(event.target);
    var nick = $target.data('user-nick');
    var user = Meteor.user();
    var profile = user.profile;
    var server_id = Session.get('server_id');
    if (!profile.connections[server_id].pms)
      profile.connections[server_id].pms = {};
    profile.connections[server_id].pms[nick] = '';
    Meteor.users.update({_id: user._id}, {$set: {profile: profile}});
    Session.set('roomtype', 'pm');
    Session.set('room_id', Session.get('server_id') + '-' + nick);
  }
};