/*globals exports */
var Notify = require('./Notify');

/**
 * Export plugin.
 */
exports.server = function server(primus, options) {
  'use strict';

  (new Notify(primus, options.subscriber));
};
