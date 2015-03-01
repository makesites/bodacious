
var redis = require("./redis");
var options = require("./options");
var filesystem = require("./filesystem");

// Defaults
var config = {
	options: options,
	filesystem: filesystem,
	// Redis store options
	redis: redis
}

module.exports = config;
