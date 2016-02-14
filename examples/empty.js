// Example of a queue that is emptied manually

// lib
var Queue = require("../index"); // in production: require('bodacious');

// encode queue (possibly optional?)
var queue = new Queue('my_queue', { autorun: false }); // don't process any tasks

console.log("We'll be adding tasks and report the count every 1 second.");
console.log("Every 5 seconds we'll empty the queue, without processing any of them");

// adding queue items
var interval = setInterval(function (){
	var timestamp = Date.now();
	//console.log("new job: ", timestamp);
	queue.add({ timestamp: timestamp });
}, 100);

// empty queue every 5 seconds
setInterval(function(){
	console.log("----Emptying Queue----");
	queue.empty();
}, 5000);


//
setInterval(function(){
	queue.count(function(err, count){
		console.log("Items: ", count);
	});
}, 1000);
