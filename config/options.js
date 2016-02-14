// Defaults
var config = {
	autorun: true, // process new items in the queue automatically
	concurrency: 1, // the number of concurrent jobs that can be processed
	delay: 0, // how much (milliseconds) to delay between executing jobs
	lock: 5000, // renew time lock
	timeout: 5000, // client close timeout
	store: "memory", // options: memory, redis, filesystem, custom
	db: null, // db where data are stored,
	serial: false // process jobs in a serial order (not async)
}

module.exports = config;
