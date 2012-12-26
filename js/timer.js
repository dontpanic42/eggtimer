
var timer = {};

/**************************************************************************************
 * Static sound class
 *	Used to play a sound when a timer has finished. A combination of 3 file formats
 *  (wav, mp3, ogg) does seem to do the job.
 *************************************************************************************/

timer.Sound = {};

timer.Sound.audio = null;

timer.Sound.file = "media/button-3";

// Initializes the sound and loads the data
timer.Sound.Init = function() {
	timer.Sound.audio = $('<audio controls></audio>')
	.append($('<source src="' + timer.Sound.file + '.mp3" type="audio/mpeg">'))
	.append($('<source src="' + timer.Sound.file + '.ogg" type="audio/ogg">'))
	.append($('<source src="' + timer.Sound.file + '.wav" type="audio/wav">'));
}

// Starts playback <times> times with a time difference
// of <timeout>
timer.Sound.Play = function(times, timeout) {
	timer.Sound.audio.get(0).play();
	for(var i = 0; i < times; i++)
		setTimeout(timer.Sound.Play, (timeout * i));
}

/**************************************************************************************
 * Application class
 *	Creates the required DOM-Elments and implements a basic update/render loop
 *************************************************************************************/

timer.Application = function(mseconds, name, playSound, target) {
	console.log("Adding timer: " + mseconds + "ms");
	this.jq_canvas = $('<canvas class="gauge"></canvas>');
	var canvas = this.jq_canvas.get(0);
	canvas.width = 220;
	canvas.height = 220;

	this.jq_span = $('<span class="value">00:00:00</span>');

	//holds all the render objects
	this.objects = [];
	//push "clear" so every cycle the canvas will be blanced

	this.objects.push(new timer.Render.Clear(canvas, null));
	//push the "Timer" object
	this.objects.push(this.timer = new timer.Render.Timer(mseconds, canvas, this));

	// target stage area
	this.target = target;
	this.playSound = playSound;
	this.paused = false;

	this.canvas = canvas;
	this.context = canvas.getContext("2d");

	this.appendUI(name, timer.Render.dateToString(mseconds));

	timer.Application.latest = this;
}

// Variable holds the timer that was last added. This is used
// to determine which timer writes the <title> tag.
timer.Application.latest = null;

// Creates the required DOM-Nodes and appends them to the 
// given stage area.
timer.Application.prototype.appendUI = function(name, time) {
	var div = this.target;

	div.append(this.jq_canvas);
	div.append(this.jq_span);

	var tdivc = $('<div class="tcon"></div>');
	var tdivn = $('<div class="tnam"><span class="tnam-name">' + name + '</span><br><span class="tnam-time">' + time + '</span></div>');

	var self = this;

	var divx = $('<div class="btn-close"></div>')
	.click(function () {
		self.stop();
		self.target.remove();
	})
	.css({opacity: 0});

	var divm = $('<div class="btn-audio-' + ((this.playSound)? 'on' : 'off') + '"></div>')
	.click(function (){
		var div = $(this);
		if(self.playSound) {
			div.removeClass('btn-audio-on')
			.addClass('btn-audio-off');
			self.playSound = false;
		} else {
			div.removeClass('btn-audio-off')
			.addClass('btn-audio-on');
			self.playSound = true;
		}
	})
	.css({opacity: 0});

	var divp = $('<div class="btn-timer-pause"></div>');
	divp.click(function () {
		var div = $(this);
		if(self.timer.paused) {
			div.removeClass('btn-timer-resume')
			.addClass('btn-timer-pause');
			self.timer.resume();
		} else {
			div.removeClass('btn-timer-pause')
			.addClass('btn-timer-resume');
			self.timer.pause();
		}
	})
	.css({opacity: 0});

	// var divr = $('<div class="btn-timer-reset"></div>');
	// divr.click(function() {
	// 	self.timer.reset();
	// 	self.timer.resume();

	// 	// Run the renderloop 1 time to update the graphics
	// 	self.running = false;
	// 	self.loop();
	// 	self.loop();

	// 	self.timer.pause();
	// 	self.start();
	// })
	// .css({opacity: 0});

	this.target.hover(function() {
		divm.stop().animate({opacity: 1}, 'slow');
		divx.stop().animate({opacity: 1}, 'slow');
		divp.stop().animate({opacity: 1}, 'slow');
		// divr.stop().animate({opacity: 1}, 'slow');
	}, function() {
		divm.stop().animate({opacity: 0}, 'slow');
		divx.stop().animate({opacity: 0}, 'slow');
		divp.stop().animate({opacity: 0}, 'slow');
		// divr.stop().animate({opacity: 0}, 'slow');
	})

	tdivc.append(divx);
	tdivc.append(divm);
	tdivc.append(divp);
	// tdivc.append(divr);

	tdivc.append(tdivn);
	div.append(tdivc);

	this.jq_span.css('margin-left', -((this.jq_canvas.width() / 2)) - (this.jq_span.width() / 2) );
}

// Basic render loop.
timer.Application.prototype.loop = function() {

	if(this.objects.length != 0) {
		//First do updates...
		for(var i = 0; i < this.objects.length; i++) {
			this.objects[i].update();
		}

		//...then render. This ensures that the gauges are 
		//actually clean on finish (no residues from rounding errors).
		for(var i = 0; i < this.objects.length; i++) {
			this.objects[i].render(this.context);
		}
	}

	if(this.running)
		setTimeout(this.loop.bind(this), 40);

}

// Starts async. rendering
timer.Application.prototype.start = function() {
	this.running = true;
	setTimeout(this.loop.bind(this), 1);
}

// Stops rendering. 
timer.Application.prototype.stop = function() {
	this.running = false;
}

// Gets called by the Timer-Object when the timer has
// ended.
timer.Application.prototype.finished = function() {
	this.stop();
	if(this.playSound)
		timer.Sound.Play(3, 1000);
}

timer.Render = {};

/**************************************************************************************
 * Timer (pseudo Render Object)
 *	Holds the main timer logic and creates the optics
 *************************************************************************************/

timer.Render.Timer = function(mseconds, canvas, app) {
	this.original = mseconds;
	this.counter  = mseconds;
	this.last = new Date().getTime();
	this.app = app;
	this.paused = false;
	this.pauseDate = null;

	var x = canvas.width / 2, y = canvas.height / 2;

	var radius = Math.min(x, y);

	app.objects.push(
		this.cs = new timer.Render.Circle({
			x : x,
			y : y,
			radius : radius - theme.csOffset,
			bgcolor : theme.csBgColor, 
			color : theme.csColor 
	}));

	app.objects.push(
		this.cm = new timer.Render.Circle({
			x : x,
			y : y,
			radius : radius - theme.cmOffset,
			bgcolor : theme.cmBgColor, 
			color : theme.cmColor
	}));

	app.objects.push(
		this.ca = new timer.Render.Circle({
			x : x,
			y : y,
			radius : radius - theme.caOffset,
			bgcolor : theme.caBgColor ,
			color : theme.caColor,
			reverse : true,
			negate : true,
			pie : true,
			pieOffset : theme.caPieOffset,
			pieColor : theme.caPieColor
	}));

	app.objects.push(
		this.cu = new timer.Render.Circle({
			x : x,
			y : y + (y / 2),
			radius : theme.cuRadius,
			bgcolor : theme.cuBgColor ,
			color : theme.cuColor,
			reverse : true,
			negate : true,
			pie : true,
			pieOffset : theme.cuPieOffset,
			pieColor : theme.cuPieColor,
			border: theme.cuBorder
	}));
}

timer.Render.Timer.prototype.pause = function() {
	this.paused = true;
	this.pauseDate = (new Date().getTime());
}

timer.Render.Timer.prototype.resume = function() {
	var now = (new Date()).getTime();
	this.last += (now - this.pauseDate);
	this.paused = false;
}

timer.Render.Timer.prototype.reset = function() {
	this.last = (new Date()).getTime();
}

timer.Render.Timer.prototype.update = function() {
	if(this.paused) return;

	this.counter = this.original - ((new Date()).getTime() - this.last);
	var date = new Date(this.counter);

	//Countdown has finished...
	if(this.counter <= 0) {
		this.finish();
		return;
	}

	if(timer.Application.latest == this.app) 
		$("title").text(timer.Render.dateToString(date));

	var sp = (((date.getUTCSeconds() * 1000) + date.getUTCMilliseconds()) / 60000) * 100;
	var mp = (((date.getUTCMinutes() * 60) + date.getUTCSeconds()) / (60*60)) * 100;
	var ap = (this.counter / this.original) * 100;
	var up = (date.getUTCMilliseconds() / 1000) * 100;

	if(sp > this.lsp)
		this.cs.options.reverse = !this.cs.options.reverse;	
	if(mp > this.lmp)
		this.cm.options.reverse = !this.cm.options.reverse;
	if(up > this.lup)
		this.cu.options.reverse = !this.cu.options.reverse;

	this.lsp = sp;
	this.lmp = mp;
	this.lup = up;

	this.cs.setPercent(sp);
	this.cm.setPercent(mp);
	this.ca.setPercent(ap);
	this.cu.setPercent(up);

	this.app.jq_span.html(timer.Render.dateToString(date));
}

//Called when countdown has finished.
timer.Render.Timer.prototype.finish = function() {
		this.app.jq_span.html("00:00:00");
		this.cs.setPercent(0);
		this.cm.setPercent(0);
		this.ca.setPercent(0);
		this.cu.setPercent(0);
		setTimeout((function() {
			this.app.target.effect('shake', {times: 5}, 500);
		}).bind(this), 0);

		if(timer.Application.latest == this.app) 
			$("title").text(timer.Render.dateToString(0));
		this.app.finished();
}

//static Date to string utility function
timer.Render.dateToString = function(date) {
	if(typeof date != 'object') {
		var date = new Date(date);
	}
	return ((date.getUTCHours() < 10)? "0" : "") + date.getUTCHours() + ":" + 
		((date.getUTCMinutes() < 10)? "0" : "") + date.getUTCMinutes() + ":" + 
		((date.getUTCSeconds() < 10)? "0" : "") + date.getUTCSeconds();
}

timer.Render.Timer.prototype.render = function(ctx) { }

/**************************************************************************************
 * Clear (Render Object)
 *	Simply clears the hole canvas.
 *************************************************************************************/

timer.Render.Clear = function(canvas, options) {
	this.canvas = canvas;
}

timer.Render.Clear.prototype.update = function() {};

timer.Render.Clear.prototype.render = function(ctx) {
	ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
}

/**************************************************************************************
 * Circle (Render Object)
 *	Draws a circle or arc and, as an option, fills it.
 *************************************************************************************/

timer.Render.Circle = function(options) {
	this.options = $.extend({
		x : 0,
		y : 0,
		radius : 10,
		border : 5,
		color : 0,
		reverse : false,
		negate : false,
		pie : false
	}, options);
	this.percent = 0;
}

timer.Render.Circle.prototype.setPercent = function(percent) {
	this.percent = percent;
}

timer.Render.Circle.prototype.update = function() {}

timer.Render.Circle.prototype.render = function(ctx) {

	var endAngle = ((Math.PI * 2) / 100) * this.percent;
	if(this.options.negate)
		endAngle = (Math.PI * 2) - endAngle;

	ctx.beginPath();
	ctx.strokeStyle = this.options.bgcolor;
	ctx.lineWidth = this.options.border;
	ctx.arc(this.options.x,
			this.options.y,
			this.options.radius,
			0,
			2*Math.PI, false);
	ctx.stroke();

	var endAngle = ((Math.PI * 2) / 100) * this.percent;
	if(this.options.negate)
		endAngle = (Math.PI * 2) - endAngle;
	if(this.percent > 0) {
		ctx.beginPath();
	    ctx.strokeStyle = this.options.color;
	    ctx.lineWidth = this.options.border;
	    ctx.arc(this.options.x, 
	    		this.options.y, 
	    		this.options.radius, 
	    		0, 
	    		endAngle, this.options.reverse);
	    ctx.stroke();
	}

	if(this.options.pie) {
		ctx.beginPath();
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.0)';
		ctx.lineWidth = 1;
		ctx.moveTo(this.options.x, this.options.y);
	    ctx.arc(this.options.x, 
	    		this.options.y, 
	    		this.options.radius - this.options.pieOffset, 
	    		0, 
	    		endAngle, this.options.reverse);
		ctx.lineTo(this.options.x, this.options.y);
		ctx.fillStyle = this.options.pieColor;
		ctx.fill();
	    ctx.stroke();

	}

}



