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

To use the pub/sub functionality, simply `use` Notify after Primus Emit and Primus Rooms.

```javascript
var Emit = require('primus-emit');
var Rooms = require('primus-rooms');
var Notify = require('notify');
var RedisSubscriber = require('notify-redis-subscriber');

var config = {
  port: 34000,
  transformer: 'engine.io',
};

// pass in subscriber via config
config.subscriber = new RedisSubscriber();

var primus = new Primus(server, config);
primus
.use('emit', Emit);
.use('rooms', Rooms);
.use('notify', Notify);
```

All that is needed is to select a pre-built `Subscriber` or provide your own.

Writing a custom adapter is easy. This one wraps Redis:

```javascript
var util = require('util'),
    Redis = require('redis'),
    EventEmitter = require('events');

(function() {
  'use strict';

  function RedisSubscriber(options) {
    this.opts = options || {};

    EventEmitter.call(this);
  }

  RedisSubscriber.prototype.bindListeners = function(client) {
    client.on('ready', function() {
      this.emit('connected');
    }.bind(this));

    client.on('psubscribe', function(room, count) {
      this.emit('subscribed', room);
    }.bind(this));

    client.on('punsubscribe', function(room, count) {
      this.emit('unsubscribed', room);
    }.bind(this));

    client.on('pmessage', function(room, channel, message) {
      this.emit('message', room, message);
    }.bind(this));

    client.on('end', function() {
      this.emit('disconnected');
    }.bind(this));
  };

  RedisSubscriber.prototype.subscribe = function(room) {
    this.client.psubscribe(room);
  };

  RedisSubscriber.prototype.unsubscribe = function(room) {
    this.client.punsubscribe(room);
  };

  RedisSubscriber.prototype.connect = function(client) {
    this.client = client || Redis.createClient(this.opts.port || null, this.opts.host || null);
    this.bindListeners(this.client);
  };

  RedisSubscriber.prototype.quit = function() {
    this.client.quit();
  };

  util.inherits(RedisSubscriber, EventEmitter);

  module.exports = RedisSubscriber;
}());


```

#### TODO

- Link to pre-built subscribers
- Display coverage
- Finish tests
