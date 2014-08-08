var metal = require('./metal');
var server = require('./server');
var debug = require('debug')('app');

function start(port) {
  server.set('port', port);
  var instance = server.listen(server.get('port'), function() {
    debug('Express server listening on port ' + instance.address().port);
  });
}

module.exports = {
  build: metal.build,
  server: server,
  start: start
};

if (!module.parent) {
  start(process.env.PORT || 3000);
}
