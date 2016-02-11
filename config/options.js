// Defaults
var config = {
	lock: 5000, // renew time lock
	timeout: 5000, // client close timeout
	store: "memory", // options: memory, redis, filesystem, custom
	db: null, // db where data are stored,
	serial: false // process jobs in a serial order (not async)
}

module.exports = config;
