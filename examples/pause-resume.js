// Example of a queue that is paused and resumed

// lib
var Queue = require("../index"); // in production: require('bodacious');

// encode queue (possibly optional?)
var queue = new Queue('my_queue', { serial: true }); // serial processing is optional

// what to do with each job
queue.process(function(job, done){
	console.log("processing job: ", job.id, job.data.timestamp);
	setTimeout(function(){
		done();
	}, 200);
});

// adding queue items
var interval = setInterval(function (){
	var timestamp = Date.now();
	console.log("new job: ", timestamp);
	queue.add({ timestamp: timestamp });
}, 100);

// pause queue every 4 seconds
setInterval(function () {
	queue.pause();
}, 4000);


// resume the queue on a matching interval with a 2 second delay
setTimeout(function(){
	setInterval(function () {
		queue.resume();
	}, 4000);
}, 2000);

// Events

queue.on('pause', function(){
	console.log("queue PAUSED");
});

queue.on('resume', function(){
	console.log("queue RESUMED");
});
