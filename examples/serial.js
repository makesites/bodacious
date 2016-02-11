// the basic example with jobs processed in serial execution

// lib
var Queue = require("../index"); // in production: require('bodacious');

// create queue
var queue = new Queue('my_queue', { serial: true });

// what to do with each job
queue.process(function(job, done){
	console.log("process job: ", job.id, job.data.timestamp);
	done();
});

// adding queue items
var interval = setInterval(function () {
	var timestamp = Date.now();
	console.log("new job: ", timestamp);
	queue.add({ timestamp: timestamp });
}, 100);
