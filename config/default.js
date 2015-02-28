
var redis = require("./redis");
var options = require("./options");

// Defaults
var config = {
	options: options,
	// Redis store options
	redis: redis
}

module.exports = config;
