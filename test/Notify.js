var http = require('http').Server,
    sinon = require('sinon'),
    assert = require('chai').assert,
    Primus = require('primus'),
    Emit = require('primus-emit'),
    Rooms = require('primus-rooms'),
    Notify = require('../'),
    RedisSubscriber = require('notify-redis-subscriber'),
    connected = [],
    opts = { transformer: 'websockets' },
    server, subscriber, primus, client1, client2, client3;

// creates the subscriber
function getSubscriber(opts) {
  return new RedisSubscriber(opts);
}

// creates the client
function getClient() {
  var addr = server.address();
  if (!addr) throw new Error('Server is not listening');
  return new primus.Socket('http://localhost:' + addr.port);
}

// creates the Primus server
function getServer(srv, opts) {
  return new Primus(srv, opts)
    .use('emit', Emit)
    .use('rooms', Rooms)
    .use('notify', Notify);
}

describe('Notify', function () {
  beforeEach(function beforeEach(done) {
    server = http();
    subscriber = getSubscriber(opts);
    opts.subscriber = subscriber;
    primus = getServer(server, opts);

    sinon.stub(subscriber, 'subscribe', function() {
      subscriber.emit('subscribed', 'somekey');
    });

    sinon.stub(subscriber, 'unsubscribe', function() {
      subscriber.emit('unsubscribed', 'somekey');
    });

    server.listen(done);
  });

  afterEach(function afterEach(done) {
    if (client1) {
      client1.end();
      client1 = null;
    }

    if (client2) {
      client2.end();
      client2 = null;
    }

    if (client3) {
      client3.end();
      client3 = null;
    }

    connected = [];

    primus.end(function() {
      subscriber.subscribe.restore();
      subscriber.unsubscribe.restore();
      done();
    });
  });

  describe('Primus Binding', function() {
    it('should subscribe to a key when a Spark is first to join a room', function(done) {
      primus.on('connection', function(spark) {
        connected.push(spark);

        if (connected.length < 2) {
          return;
        }

        setTimeout(function() {
          assert.isTrue(subscriber.subscribe.calledOnce);
          assert.isTrue(subscriber.subscribe.calledWith('somekey'));
          done();
        }, 100);

        client.emit('subscribe', 'somekey');
        client2.emit('subscribe', 'somekey');
      });

      client  = getClient();
      client2 = getClient();
    });

    it('should unsubscribe from a key when a Spark is the last to leave a room (leave)', function(done) {
      primus.on('connection', function(spark) {
        connected.push(spark);

        if (connected.length < 2) {
          return;
        }

        subscriber.on('subscribed', function(room) {
          connected.forEach(function(s) {
            s.leave(room);
          });

          setTimeout(function() {
            assert.isTrue(subscriber.unsubscribe.calledOnce);
            assert.isTrue(subscriber.unsubscribe.calledWith('somekey'));
            done();
          });
        });

        client.emit('subscribe', 'somekey');
      });

      client  = getClient();
      client2 = getClient();
    });

    it('should unsubscribe from a key when a Spark is the last to leave a room (leaveAll)', function(done) {
      primus.on('connection', function(spark) {
        connected.push(spark);

        if (connected.length < 2) {
          return;
        }

        subscriber.on('subscribed', function(room) {
          connected.forEach(function(s) {
            s.leaveAll();
          });

          setTimeout(function() {
            assert.isTrue(subscriber.unsubscribe.calledOnce);
            assert.isTrue(subscriber.unsubscribe.calledWith('somekey'));
            done();
          });
        });

        client.emit('subscribe', 'somekey');
      });

      client  = getClient();
      client2 = getClient();
    });
  });

  describe('Subscriber Binding', function() {
    it('should track when a key is subscribed to', function(done) { done(); });

    it('should track when a key is unsubscribed from', function(done) { done(); });

    it('should notify all Sparks in a room when a messaged is published', function(done) { done(); });
  });

  describe('Getter Methods', function() {
    it('should return a list of all existing subscriptions', function(done) { done(); });

    it('should return a list of all connected clients', function(done) { done(); });

    it('should return a list of all existing rooms', function(done) { done(); });
  });
});