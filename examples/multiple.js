// Two queues, adding elements interchangeably (instead of interval)

// lib
var Queue = require("../index"); // in production: require('bodacious');


// encode queue (possibly optional?)
var first = new Queue('my_queue_1');
var second = new Queue('my_queue_2');

// processing
first.process(function(job, done){
	console.log("process first: ", job.id);
	// delay..
	setTimeout(function(){
		done();
	}, 500);

});

second.process(function(job, done){
	console.log("process second: ", job.id);
	// delay..
	setTimeout(function(){
		done();
	}, 500);
});



// start (first) queue
first.add({});

// start (second ) queue
first.on('completed', function(){
	second.add({});
});

// lookup
second.on('completed', function(){
	first.add({});
});
