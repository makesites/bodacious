// This is the basic example with 'autoplay' turned off

// lib
var Queue = require("../index"); // in production: require('bodacious');

// create queue
var queue = new Queue('my_queue', { autorun: false });

// what to do with each job
queue.process(function(job, done){
	console.log("process job: ", job.id);
	done();
});

// adding queue items
var adding = setInterval(function () {
	var timestamp = Date.now();
	console.log("new job: ", timestamp);
	queue.add({ timestamp: timestamp });
}, 100);

// start queue in bursts (every 2 seconds)
var processing = setInterval(function () {
	console.log("PROCESS!!!")
	queue.run();
}, 2000);
