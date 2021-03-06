var util = require('util'),
    http = require('http').Server,
    sinon = require('sinon'),
    assert = require('chai').assert,
    EventEmitter = require('events'),
    Primus = require('primus'),
    Notify = require('../'),
    connected = [],
    opts = { transformer: 'websockets' },
    server, subscriber, primus, client1, client2, client3;

function FakeSubscriber() {
  EventEmitter.call(this);
}

util.inherits(FakeSubscriber, EventEmitter);

FakeSubscriber.prototype.subscribe = function(key) {
  this.emit('subscribed', key);
};

FakeSubscriber.prototype.unsubscribe = function(key) {
  this.emit('unsubscribed', key);
};

// creates a simple subscriber
function getSubscriber(opts) {
  return new FakeSubscriber(opts);
}

// creates a connected client
function getClient() {
  var addr = server.address();
  if (!addr) throw new Error('Server is not listening');
  return new primus.Socket('http://localhost:' + addr.port);
}

// creates the Primus server
function getServer(srv, opts) {
  return new Primus(srv, opts)
    .use('notify', Notify);
}

describe('Notify', function () {
  beforeEach(function beforeEach(done) {
    server = http();
    subscriber = getSubscriber(opts);

    opts.subscriber = subscriber;

    primus = getServer(server, opts);

    sinon.spy(subscriber, 'subscribe');
    sinon.spy(subscriber, 'unsubscribe');

    server.listen(done);
  });

  afterEach(function afterEach(done) {
    connected = [];

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

    primus.end(function() {
      subscriber.subscribe.restore();
      subscriber.unsubscribe.restore();
      done();
    });
  });

  it('should error when setting an invalid Notify instance', function(done) {
    try {
      primus.notify = 5;
    }
    catch(e) {
      done();
    }
  });

  it('should error when setting an invalid subscriber', function(done) {
    try {
      primus.subscriber = 5;
    }
    catch(e) {
      done();
    }
  });

  it('should expose the subscriber', function(done) {
    var sub = primus.subscriber;
    assert.isObject(sub);
    assert.instanceOf(sub, FakeSubscriber);
    assert.strictEqual(sub, subscriber);
    done();
  });

  it('should subscribe to a key when a Spark is first to join a room', function(done) {
    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 2) {
        return;
      }

      setTimeout(function resolve() {
        assert.isTrue(subscriber.subscribe.calledOnce);
        assert.isTrue(subscriber.subscribe.calledWith('somekey'));
        done();
      }, 100);

      client1.emit('subscribe', 'somekey');
      client2.emit('subscribe', 'somekey');
    });

    client1 = getClient();
    client2 = getClient();
  });

  it('should unsubscribe from a key when a Spark is the last to leave a room (leave)', function(done) {
    var subscribed = false,
        total_joined = 0;

    function resolve(data) {
      if (total_joined || subscribed) {
        return;
      }

      assert.isTrue(subscriber.unsubscribe.calledOnce);
      assert.isTrue(subscriber.unsubscribe.calledWith('somekey'));
      done();
    }

    function ready() {
      if (total_joined < 3 || !subscribed) {
        return;
      }

      primus.forEach(function(spark) {
        spark.leave('somekey');
      });
    }

    subscriber.on('subscribed', function() {
      subscribed = true;
      ready();
    });

    subscriber.on('unsubscribed', function() {
      subscribed = false;
      resolve();
    });

    primus.on('joinroom', function() {
      ++total_joined;
      ready();
    });

    primus.on('leaveroom', function() {
      --total_joined;
      resolve();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'somekey');
      client2.emit('subscribe', 'somekey');
      client3.emit('subscribe', 'somekey');
    });

    client1 = getClient();
    client2 = getClient();
    client3 = getClient();
  });

  it('should unsubscribe from a key when a Spark is the last to leave a room (leaveAll)', function(done) {
    var subscribed = false,
        total_joined = 0;

    function resolve(data) {
      if (total_joined || subscribed) {
        return;
      }

      assert.isTrue(subscriber.unsubscribe.calledOnce);
      assert.isTrue(subscriber.unsubscribe.calledWith('somekey'));
      done();
    }

    function ready() {
      if (total_joined < 3 || !subscribed) {
        return;
      }

      primus.forEach(function(spark) {
        spark.leaveAll();
      });
    }

    subscriber.on('subscribed', function() {
      subscribed = true;
      ready();
    });

    subscriber.on('unsubscribed', function() {
      subscribed = false;
      resolve();
    });

    primus.on('joinroom', function() {
      ++total_joined;
      ready();
    });

    primus.on('leaveallrooms', function() {
      --total_joined;
      resolve();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'somekey');
      client2.emit('subscribe', 'somekey');
      client3.emit('subscribe', 'somekey');
    });

    client1 = getClient();
    client2 = getClient();
    client3 = getClient();
  });

  it('should return a list of all existing subscriptions', function(done) {
    var subscribed = false,
        total_subscribed = 0;

    function resolve(data) {
      if (total_subscribed < 3) {
        return;
      }

      var subscriptions = primus.notify.getSubscriptions();

      assert.lengthOf(subscriptions, 3);
      assert.deepEqual(subscriptions, [
        'first_key',
        'second_key',
        'third_key'
      ]);

      done();
    }

    subscriber.on('subscribed', function() {
      ++total_subscribed;
      resolve();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'first_key');
      client2.emit('subscribe', 'second_key');
      client3.emit('subscribe', 'third_key');
    });

    client1 = getClient();
    client2 = getClient();
    client3 = getClient();
  });

  it('should return a list of all connected clients', function(done) {
    var subscribed = false,
        total_subscribed = 0;

    function resolve(data) {
      if (total_subscribed < 3) {
        return;
      }

      var clients = [];

      primus.forEach(function(spark) {
        clients.push(spark.id);
      });

      assert.lengthOf(clients, 3);
      assert.deepEqual(clients, primus.notify.getClients());

      done();
    }

    subscriber.on('subscribed', function() {
      ++total_subscribed;
      resolve();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'first_key');
      client2.emit('subscribe', 'second_key');
      client3.emit('subscribe', 'third_key');
    });

    client1 = getClient();
    client2 = getClient();
    client3 = getClient();
  });

  it('should return a list of all existing rooms', function(done) {
    var subscribed = false,
        total_subscribed = 0;

    function resolve(data) {
      if (total_subscribed < 3) {
        return;
      }

      var rooms = primus.notify.getRooms();

      assert.lengthOf(rooms, 3);
      assert.deepEqual(rooms, primus.rooms());

      done();
    }

    subscriber.on('subscribed', function() {
      ++total_subscribed;
      resolve();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'first_key');
      client2.emit('subscribe', 'second_key');
      client3.emit('subscribe', 'third_key');
    });

    client1 = getClient();
    client2 = getClient();
    client3 = getClient();
  });

  it('should notify all Sparks in a room when a messaged is published (string)', function(done) {
    var subscribed = false,
        total_joined = 0,
        total_resolved = 0,
        message = { type: 'someevent' };

    function resolve(data) {
      ++total_resolved;

      if (total_resolved < 3) {
        return;
      }

      done();
    }

    function ready() {
      if (total_joined < 3 || !subscribed) {
        return;
      }

      subscriber.emit('message', 'somekey', JSON.stringify(message));
    }

    subscriber.on('subscribed', function() {
      subscribed = true;
      ready();
    });

    primus.on('joinroom', function() {
      ++total_joined;
      ready();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'somekey');
      client2.emit('subscribe', 'somekey');
      client3.emit('subscribe', 'somekey');
    });

    client1 = getClient();
    client1.on('someevent', resolve);

    client2 = getClient();
    client2.on('someevent', resolve);

    client3 = getClient();
    client3.on('someevent', resolve);
  });

  it('should notify all Sparks in a room when a messaged is published (object)', function(done) {
    var subscribed = false,
        total_joined = 0,
        total_resolved = 0,
        message = { type: 'someevent' };

    function resolve() {
      ++total_resolved;

      if (total_resolved < 3) {
        return;
      }

      done();
    }

    function ready() {
      if (total_joined < 3 || !subscribed) {
        return;
      }

      subscriber.emit('message', 'somekey', message);
    }

    subscriber.on('subscribed', function() {
      subscribed = true;
      ready();
    });

    primus.on('joinroom', function() {
      ++total_joined;
      ready();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'somekey');
      client2.emit('subscribe', 'somekey');
      client3.emit('subscribe', 'somekey');
    });

    client1 = getClient();
    client1.on('someevent', resolve);

    client2 = getClient();
    client2.on('someevent', resolve);

    client3 = getClient();
    client3.on('someevent', resolve);
  });

  it('should notify all Sparks in a room when a messaged is published, with data', function(done) {
    var subscribed = false,
        total_joined = 0,
        total_resolved = 0,
        expected = { foo: 'bar' },
        message = {
          type: 'someevent',
          data: expected
        };

    function resolve(data) {
      assert.strictEqual(JSON.stringify(data), JSON.stringify(expected));

      ++total_resolved;

      if (total_resolved < 3) {
        return;
      }

      done();
    }

    function ready() {
      if (total_joined < 3 || !subscribed) {
        return;
      }

      subscriber.emit('message', 'somekey', message);
    }

    subscriber.on('subscribed', function() {
      subscribed = true;
      ready();
    });

    primus.on('joinroom', function() {
      ++total_joined;
      ready();
    });

    primus.on('connection', function(spark) {
      connected.push(spark);

      if (connected.length < 3) {
        return;
      }

      client1.emit('subscribe', 'somekey');
      client2.emit('subscribe', 'somekey');
      client3.emit('subscribe', 'somekey');
    });

    client1 = getClient();
    client1.on('someevent', resolve);

    client2 = getClient();
    client2.on('someevent', resolve);

    client3 = getClient();
    client3.on('someevent', resolve);
  });

  it('should error when a messaged is received without a type', function(done) {
    var subscribed = false,
        notify = primus.notify;
        message = { data: { foo: 'bar' } };

    subscriber.on('subscribed', function ready() {
      try {
        subscriber.emit('message', 'somekey', JSON.stringify(message));
      }
      catch(e) {
        assert.isTrue(primus.notify.onMessage.threw());
        notify.onMessage.restore();
        done();
      }
    });

    sinon.spy(notify, 'onMessage');

    client1 = getClient();
    client1.emit('subscribe', 'somekey');
  });
});