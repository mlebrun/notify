var http = require('http').Server,
    sinon = require('sinon'),
    expect = require('chai').expect,
    Notify = require('../'),
    Primus = require('primus'),
    RedisSubscriber = require('../lib/subscribers/Redis'),
    opts = { transformer: 'websockets' },
    srv, subscriber, primus;

// creates the subscriber
function getSubscriber(opts) {
  return new RedisSubscriber(opts);
}

// creates the client
function getClient() {
  var addr = srv.address();
  if (!addr) throw new Error('Server is not listening');
  return new primus.Socket('http://localhost:' + addr.port);
}

// creates the server
function getServer(srv, opts) {
  return new Primus(srv, opts).use('notify', Notify);
}

describe('notify', function () {
  beforeEach(function beforeEach(done) {
    srv = http();
    subscriber = getSubscriber(opts);
    opts.subscriber = subscriber;
    primus = getServer(srv, opts);
    srv.listen(done);
  });

  afterEach(function afterEach(done) {
    primus.end(done);
  });

  it('should fail if the Subscriber is not an object', function (done) {
    var alts = { transformer: 'websockets' },
        altServer = new Primus(srv, alts);

    expect(function() {
      altServer = altServer.use('notify', Notify);
    }).to.throw(TypeError);

    altServer.end(done);

  });
});