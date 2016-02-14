// The basic example with a forced fail rate and event broadcast

// lib
var Queue = require("../index"); // in production: require('bodacious');

// create queue
var queue = new Queue('my_queue');

// what to do with each job
queue.process(function(job, done){
	console.log("process job: ", job.id, "; failed: ", job.failed );
	// randomly fail a job
	var fail = ( Math.random() > 0.5 );
	done( (fail) ? 'failed' : null );
});

// adding queue items
var interval = setInterval(function () {
	var timestamp = Date.now();
	console.log("new job: ", timestamp);
	queue.add({ timestamp: timestamp });
}, 100);

// broadcast event
queue.on('killed', function( job ){
	console.log("queue: killed", job.toJSON() );
});
