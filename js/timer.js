
var timer = {};

timer.Sound = {};
timer.Sound.audio = null;

timer.Sound.file = "media/button-3";

timer.Sound.Init = function() {
	timer.Sound.audio = $('<audio controls></audio>')
	.append($('<source src="' + timer.Sound.file + '.mp3" type="audio/mpeg">'))
	.append($('<source src="' + timer.Sound.file + '.ogg" type="audio/ogg">'))
	.append($('<source src="' + timer.Sound.file + '.wav" type="audio/wav">'));
}

timer.Sound.Play = function(times, timeout) {
	timer.Sound.audio.get(0).play();
	for(var i = 0; i < times; i++)
		setTimeout(timer.Sound.Play, (timeout * i));
}

timer.Application = function(mseconds, name, playSound, target) {
	console.log("Adding timer: " + mseconds + "ms");
	this.jq_canvas = $('<canvas class="gauge"></canvas>');
	var canvas = this.jq_canvas.get(0);
	canvas.width = 220;
	canvas.height = 220;

	this.jq_span = $('<span class="value">00:00:00</span>');

	this.objects = [];
	this.objects.push(new timer.Render.Clear(canvas, null));
	this.objects.push(new timer.Render.Timer(mseconds, canvas, this));

	this.running = true;
	this.target = target;
	this.playSound = playSound;

	this.canvas = canvas;
	this.context = canvas.getContext("2d");

	this.appendUI(name, timer.Render.dateToString(mseconds));

	timer.Application.latest = this;
}

timer.Application.latest = null;


timer.Application.prototype.appendUI = function(name, time) {
	var div = this.target;

	div.append(this.jq_canvas);
	div.append(this.jq_span);

	var tdivc = $('<div class="tcon"></div>');
	var tdivn = $('<div class="tnam"><span class="tnam-name">' + name + '</span><br><span class="tnam-time">' + time + '</span></div>');

	tdivc.append(tdivn);
	div.append(tdivc);

	this.jq_span.css('margin-left', -((this.jq_canvas.width() / 2)) - (this.jq_span.width() / 2) );
}

timer.Application.prototype.loop = function() {

	if(this.objects.length != 0) {
		for(var i = 0; i < this.objects.length; i++) {
			this.objects[i].update();
			this.objects[i].render(this.context);
		}
	}

	if(this.running)
		setTimeout(this.loop.bind(this), 100);

}

timer.Application.prototype.start = function() {
	this.running = true;
	setTimeout(this.loop.bind(this), 1);
}

timer.Application.prototype.stop = function() {
	this.running = false;

}

timer.Application.prototype.finished = function() {
	this.stop();
	if(this.playSound)
		timer.Sound.Play(3, 1000);
}

timer.Render = {};

timer.Render.Timer = function(mseconds, canvas, app) {
	this.original = mseconds;
	this.counter  = mseconds;
	this.last = new Date().getTime();
	this.app = app;

	var caOffset = 4;
	var csOffset = 10;
	var cmOffset = 16;

	var x = canvas.width / 2, y = canvas.height / 2;
	console.log(x, y);

	this.cs = new timer.Render.Circle({
		x : x,
		y : y,
		radius : Math.min(x, y) - csOffset,
		bgcolor : 'rgba(41, 217, 244, 0.2)', 
		color : 'rgb(41, 217, 244)' 
	});
	app.objects.push(this.cs);

	this.cm = new timer.Render.Circle({
		x : x,
		y : y,
		radius : Math.min(x, y) - cmOffset,
		bgcolor : 'rgba(41, 217, 244, 0.2)', 
		color : 'rgb(41, 217, 244)' 
	});
	app.objects.push(this.cm);

	this.ca = new timer.Render.Circle({
		x : x,
		y : y,
		radius : Math.min(x, y) - caOffset,
		bgcolor : 'rgba(255, 1, 150, 0.2)' ,
		color : 'rgb(255, 1, 150)',
		reverse : true,
		negate : true,
		pie : true,
		pieOffset : 16,
		pieColor : 'rgba(255, 255, 255, 0.05)'
	});
	app.objects.push(this.ca);
}

timer.Render.Timer.prototype.update = function() {
	this.counter = this.original - ((new Date()).getTime() - this.last);
	var date = new Date(this.counter);

	if(this.counter <= 0) {
		this.app.jq_span.html("00:00:00");
		this.cs.setPercent(0);
		this.cm.setPercent(0);
		this.ca.setPercent(0);
		setTimeout((function() {
			this.app.target.effect('shake', {times: 5}, 500);
		}).bind(this), 0);

		if(timer.Application.latest == this.app) 
			$("title").text(timer.Render.dateToString(0));
		this.app.finished();
		return;
	}

	if(timer.Application.latest == this.app) 
		$("title").text(timer.Render.dateToString(date));

	var sp = (((date.getUTCSeconds() * 1000) + date.getUTCMilliseconds()) / 60000) * 100;
	var mp = (((date.getUTCMinutes() * 60) + date.getUTCSeconds()) / (60*60)) * 100;
	var ap = (this.counter / this.original) * 100;

	if(sp > this.lsp)
		this.cs.options.reverse = !this.cs.options.reverse;	
	if(mp > this.lmp)
		this.cm.options.reverse = !this.cm.options.reverse;

	this.lsp = sp;
	this.lmp = mp;

	this.cs.setPercent(sp);
	this.cm.setPercent(mp);
	this.ca.setPercent(ap);

	this.app.jq_span.html(timer.Render.dateToString(date));
}

timer.Render.dateToString = function(date) {
	if(typeof date != 'object') {
		var date = new Date(date);
	}
	return ((date.getUTCHours() < 10)? "0" : "") + date.getUTCHours() + ":" + 
		((date.getUTCMinutes() < 10)? "0" : "") + date.getUTCMinutes() + ":" + 
		((date.getUTCSeconds() < 10)? "0" : "") + date.getUTCSeconds();
}

timer.Render.Timer.prototype.render = function(ctx) { }

timer.Render.Clear = function(canvas, options) {
	this.canvas = canvas;
}

timer.Render.Clear.prototype.update = function() {};

timer.Render.Clear.prototype.render = function(ctx) {
	ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
}

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



