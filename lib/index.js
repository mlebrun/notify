/*globals exports */
var Notify = require('./Notify');

/**
 * Export plugin.
 */
exports.server = function server(primus, options) {
  'use strict';

  var notify = options.notify || null,
      subscriber = options.subscriber || null;

  Object.defineProperty(primus, 'notify', {
    get: function get() {
      return this._notify;
    },

    set: function set(instance) {
      if ('object' !== typeof instance) {
        throw new Error('Notify should be an object');
      }
      this._notify = instance;
    }
  });

  Object.defineProperty(primus, 'subscriber', {
    get: function get() {
      return this._subscriber;
    },

    set: function set(instance) {
      if ('object' !== typeof instance) {
        throw new Error('The subscriber should be an object');
      }
      this._subscriber = instance;
    }
  });

  // setting subscriber first performs minor validation
  // before setting possibly trying to instantiate Notify.
  primus.subscriber = subscriber;
  primus.notify = notify || new Notify(primus, subscriber);
};
