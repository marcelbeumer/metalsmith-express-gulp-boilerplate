var express = require('express');

var app = express();

app.use('/public', express.static(__dirname + '/public'))
  .use('/client', express.static(__dirname + '/client'))
  .use(express.static(__dirname + '/content-build'));

module.exports = app;
