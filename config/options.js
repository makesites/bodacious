// Defaults
var config = {
	lock: 5000, // renew time lock
	timeout 5000, // client close timeout
	store: "memory", // options: memory, redis, custom
	db: null // db where data are stored
}

module.exports = config;
