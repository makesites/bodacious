// In this example we slow down the execution of each task to observe it's progress

// lib
var Queue = require("../index"), // in production: require('bodacious');
	_ = require('underscore');

// create queue
var queue = new Queue('my_queue', { serial: true });

// simulate progress when processing
queue.process(function(job, done){
	console.log("process job: ", job.id, job.data);
	_.delay( progress, 500, job, 25);
	_.delay( progress, 1000, job, 50);
	_.delay( progress, 1200, job, 75);
	_.delay( progress, 1500, job, 100);
	_.delay( done, 1750); // complete task
});

// adding queue items
var interval = setInterval(function () {
	var timestamp = Date.now();
	console.log("new job: ", timestamp);
	queue.add({ timestamp: timestamp });
}, 2000);

// Events

queue.on('progress', function(job, progress){
	console.log("Job: ", job.id, "Progress: ", progress );
});

// Helpers

function progress(job, num){
	job.progress(num);
}
