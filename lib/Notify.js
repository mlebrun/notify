/*globals __dirname, console, process */
var debug = require('debug')('notify:Notify');

(function() {
  'use strict';

  function Notify(primus, subscriber) {
    this.subscriptions = [];
    this.subscriber    = subscriber;
    this.primus        = primus;

    this.bindPrimus(this.primus);
    this.bindSubscriber(this.subscriber);
  } // Notify

  /**
   * Binds this class to Primus events
   *
   * @param {Primus} primus Primus instance
   */
  Notify.prototype.bindPrimus = function(primus) {
    primus.on('joinroom', function(room, spark) {
      debug('[ Spark: Joined Room ]', { room: room, spark: spark.id });
      this.onRoomJoined(room, spark);
    }.bind(this));

    primus.on('leaveroom', function(room, spark) {
      debug('[ Spark: Left Room ]', { room: room, spark: spark.id });
      this.onRoomsLeft([ room ], spark);
    }.bind(this));

    primus.on('leaveallrooms', function (rooms, spark) {
      debug('[ Spark: Left All Rooms ]', { rooms: rooms, spark: spark.id });
      this.onRoomsLeft(rooms, spark);
    }.bind(this));

    primus.on('connection', function(spark) {
      debug('[ Spark: Connected ]', { spark: spark.id });

      spark.on('subscribe', spark.join.bind(spark));
      spark.on('unsubscribe', spark.leave.bind(spark));
    });

    primus.on('disconnection', function(spark) {
      // Primus Rooms listens for the users disconnect and removes them from all the rooms they joined
      // (primus.on#leaveallrooms), which automatically cleans up our subscribed keys.
      debug('[ Spark: Disconnected ]', { spark: spark.id });
    });
  };

  /**
   * Binds this Notify to Subscriber events
   *
   * @param {Subscriber} subscriber Subscriber instance
   */
  Notify.prototype.bindSubscriber = function(subscriber) {
    subscriber.on('message', function(room, message) {
      debug('[ Notify: Message ]', { room: room, message: message });
      this.onMessage(room, message);
    }.bind(this));

    subscriber.on('subscribed', function(room) {
      debug('[ Notify: Subscribed ]', { room: room });
      this.onSubscribe(room);
    }.bind(this));

    subscriber.on('unsubscribed', function(room) {
      debug('[ Notify: Unsubscribed ]', { room: room });
      this.onUnsubscribe(room);
    }.bind(this));
  };

  /**
   * Returns list of subscribed keys.
   *
   * @return {String[]}
   */
  Notify.prototype.getSubscriptions = function() {
    return this.subscriptions;
  };

  /**
   * Returns list of current clients.
   *
   * @return {String[]}
   */
  Notify.prototype.getClients = function() {
    var clients = [];

    this.primus.forEach(function(spark) {
      clients.push(spark.id);
    });

    return clients;
  };

  /**
   * Returns list of current rooms.
   *
   * @return {String[]}
   */
  Notify.prototype.getRooms = function() {
    return this.primus.rooms();
  };

  /**
   * Handles a message.
   *
   * @param  {String} room
   * @param  {String} message JSON string
   *   - `type` key required
   *   - `data` key optional, meta data
   */
  Notify.prototype.onMessage = function(room, message) {
    var clients = this.primus.room(room).clients(),
        notification = (typeof message == 'string') ? JSON.parse(message) : message;

    if (!notification || notification.type === undefined) {
      throw new Error('Notification type undefined: ' + message);
    }

    clients.forEach(function(client_id) {
      this.primus.spark(client_id).emit(notification.type, notification.data || {});
    }, this);
  };

  /**
   * Handles successful subscription.
   *
   * @param  {String} room
   */
  Notify.prototype.onSubscribe = function(room) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id === -1) {
      this.subscriptions.push(room);
    }
  };

  /**
   * Handles unscrubing from a subscription.
   *
   * @param  {String} room
   */
  Notify.prototype.onUnsubscribe = function(room) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id !== -1) {
      delete this.subscriptions[subscription_id];
    }
  };

  /**
   * Subscribes to a room.
   *
   * @param  {String} room
   * @param  {Spark} spark
   */
  Notify.prototype.onRoomJoined = function(room, spark) {
    var subscription_id = this.subscriptions.indexOf(room);

    if (subscription_id === -1) {
      debug('[ Notify: Subscribing ]', { room: room });
      this.subscriber.subscribe(room);
    }
  };

  /**
   * Unsubscribes from a room.
   *
   * @param  {String} room
   * @param  {Spark} spark
   */
  Notify.prototype.onRoomsLeft = function(rooms, spark) {
    rooms.forEach(function(room) {
      var subscription_id = this.subscriptions.indexOf(room);

      if (this.primus.isRoomEmpty(room) && subscription_id != -1) {
        debug('[ Notify: Unsubscribing ]', { room: room });
        this.subscriber.unsubscribe(room);
      }
    }, this);
  };

  module.exports = Notify;
}());
