Notify
======

[![Build Status](https://travis-ci.org/mlebrun/notify.svg?branch=master)](https://travis-ci.org/mlebrun/notify)
[![Coverage Status](https://coveralls.io/repos/mlebrun/notify/badge.svg?branch=master&service=github)](https://coveralls.io/github/mlebrun/notify?branch=master)

A pub/sub plugin for [Primus](https://github.com/primus/primus).

Installation
------------

```
npm install mlebrun/notify --save
```

Usage
-----


#### Server
To use the pub/sub functionality, simply `use` Notify after Primus Emit and Primus Rooms.

```javascript
var Notify = require('notify');
var Subscriber = require('notify-redis-subscriber');

var config = {
  port: 34000,
  transformer: 'engine.io',
};

// pass in subscriber via config
config.subscriber = new Subscriber();

var primus = new Primus(server, config);
primus.use('notify', Notify);
```

When a `subscriber` a receives an event from that key, it will forward that event to the client.
The event that is fired should be structured as so:

```javascript
subscriber.emit('message', 'my-key', { "type": "some-event", "data": { "...any extra event data" } });
```

#### Client
From the client we just emit keys we want to subscribe to.

```javascript
var socket = new Primus();

socket.on('open', function() {
  // subscribe to a key
  this.emit('subscribe', 'my-key');
});

// listen for specific events from that key
socket.on('some-event', function() {
  console.log( 'Hi!' );
});
```

All that is needed is to select a pre-built `Subscriber` or provide your own.

Writing a custom adapter is easy. [This one wraps Redis.](https://github.com/mlebrun/notify-redis-subscriber)
