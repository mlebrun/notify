Notify
======

A pub/sub plugin for [Primus](https://github.com/primus/primus).

Installation
------------

```
npm install mlebrun/notify --save
```

Usage
-----

To use the pub/sub functionality, simply `use` Notify after `use`ing Primus Rooms.

```javascript
var Emit = require('primus-emit');
var Rooms = require('primus-rooms');
var Notify = require('notify');

var config = {
  port: 34000,
  transformer: 'engine.io',
  subscriber: subscriber     // either use a community provided or custom subscriber
};

var primus = new Primus(server, config);
primus
.use( 'emit', Emit );
.use( 'rooms', Rooms );
.use( 'notify', Notify );
```

All that is needed is to select/provide a `Subscriber`. This one wraps Redis:

```javascript
/*globals module, console */
var util = require('util'),
    Redis = require('redis'),
    EventEmitter = require('events');

(function() {
  'use strict';

  function Subscriber(options) {
    this.opts = (options && options.redis) ? options.redis : {};

    EventEmitter.call(this);
  } // Subscriber

  Subscriber.prototype.bindListeners = function(client) {
    client.on( 'error', function(error) {
      console.log(error);
    });

    client.on('ready', function() {
      console.log('[ Subscriber: connected ]');
      this.emit('connected');
    });

    client.on('end', function() {
      console.log('[ Subscriber: disconnected ]');
      this.emit('disconnected');
    });

    client.on( 'pmessage', function(room, channel, message) {
      console.log( '[ Subscription: ' + room + ' ]', message);
      this.emit('message', room, channel, message);
    });

    client.on( 'psubscribe', function(room, count) {
      console.log( '[ Subscription: ' + room + ' ]', 'Subscribed', count);
      this.emit('subscribed', room);
    });

    client.on( 'unsubscribed', function(room, count) {
      console.log( '[ Subscription: ' + room + ' ]', 'Unsubscribed', count);
      this.emit('message', room);
    });
  }; // bindListeners

  Subscriber.prototype.subscribe = function(room) {
    this.client.psubscribe(room);
  }; // subscribe

  Subscriber.prototype.unsubscribe = function(room) {
    this.client.punsubscribe(room);
  }; // unsubscribe

  Subscriber.prototype.connect = function() {
    this.client = Redis.createClient(this.opts.port || null, this.opts.host || null);
    this.bindListeners(this.client);
  }; // connect

  Subscriber.prototype.quit = function() {
    this.client.quit();
  }; // quit

  util.inherits(Subscriber, EventEmitter);

  module.exports = Subscriber;
}());

```

TODO: Clean this up a bit!
