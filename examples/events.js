// The basic example (slowed down), but with most of the events recorded

// lib
var Queue = require("../index"); // in production: require('bodacious');

// create queue
var queue = new Queue('my_queue');

// what to do with each job
queue.process(function(job, done){
	console.log("process job: ", job.id, job.data.timestamp);
	done();
});

// adding queue items
var interval = setInterval(function (){
    var timestamp = Date.now();
	console.log("new job: ", timestamp);
	queue.add({ timestamp: timestamp });
}, 500);

// start queue
queue.on('ready', function(){
	console.log("queue: ready");
})
.on('active', function(job){
	// Job started
	console.log("queue: active", job.id);
})
.on('completed', function(job, result){
	// Job completed with output result!
	console.log("queue: completed");
})
/* These events are available but not used in this example...
.on('progress', function(job, progress){
	// Job progress updated!
	console.log("queue: progress", job.id, progress);
})
.on('failed', function(job, err){
	// Job failed with reason err!
	console.log("queue: failed");
})
.on('error', function(error) {
	// Error
	console.log("queue: error");
})
.on('paused', function(){
	// The queue has been paused
	console.log("queue: paused");
})
.on('resumed', function(job){
	// The queue has been resumed
	console.log("queue: resumed");
})
*/
.on('cleaned', function(jobs, type) {
	//jobs is an array of cleaned jobs
	//type is the type of job cleaned
	//see clean for details
	console.log("queue: cleaned");
});
