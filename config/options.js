// Defaults
var config = {
	autorun: true, // process new items in the queue automatically
	concurrency: 1, // the number of concurrent jobs that can be processed
	db: null, // db where data are stored
	delay: 0, // how much (milliseconds) to delay between executing jobs
	holdFailed: false,
	lock: 5000, // renew time lock
	retry: 5, // times to retry a failed job before erasing
	store: "memory", // options: memory, redis, filesystem, custom
	serial: false, // process jobs in a serial order (not async)
	timeout: 5000 // client close timeout
}

module.exports = config;
