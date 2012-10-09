/* JType - a JQuery/Prototype simulation library 
 * License: 2-clause BSD
 */

var JType = {

	SelEng: function(selector, context) {
		if (context) return context.querySelectorAll(selector); 
		else return document.querySelectorAll(selector);
	},

	domReady : 0,	// 0 - no, 1 - trigger w
	domCalees : [ ],

	domLoad : function() {
		if (JType.domReady != 0) return;
		window.onload = function() {
			if (JType.domReady == 2) return;
			JType.domReady = 2;
			for (var i in JType.domCalees) {
				JType.domCalees[i]();
			}
		};
		if (document.addEventListener) 
			document.addEventListener("DOMContentLoaded", window.onload, false);
		JType.domReady = 1;
	},

	iframesCounter : 0, 
	ajaiObject : function(skip) {
		var o = new Object();
		o = Prototype(o, JType.JQueryAjaiPrototype);
		o = Prototype(o, JType.JQueryAjaxPrototype);
		o.skip = skip;
		return o;
	},

	ajaxObject : function() {
		var o = null;
		if (window.XMLHttpRequest) { 
			o = new XMLHttpRequest();
		} else if (window.ActiveXObject) { 
			try {
				o = new ActiveXObject('Msxml2.XMLHTTP');
			} catch (e) {
				try {
					o = new ActiveXObject('Microsoft.XMLHTTP');
				} catch (e) {}
			}
		}
		if (o) o = Prototype(o, JType.JQueryAjaxPrototype);
		return o;
	},

	ajaxArguments : function(args) {
		var str = ''; var sep = '';
		for (var key in args) {
			str = str + sep;
			str = str + key+'='+escape(encodeURI(args[key]));
			sep = '&';
		}
		return str;
	},

	formArguments : function(form) {
		var i = 0; 
		var inputs = JType.SelEng('input, textarea, select', form);
		var args = { } ;//new Array();
		var iframe = 0;
		for (i = 0; i < inputs.length; i++) {
			input = inputs[i];
			if (input.name != '') {
				args[input.name] = input.value;
			}
			if (input.type == 'file') {
				iframe = 1;
			}
		}
		return {
			'args': args,
			'iframe': iframe
		};
	},

	ajaxForm : function(form) {
		var params = JType.formArguments(form);
		params['url'] = form.getAttribute('action');
		params['method'] =  form.method.toUpperCase();
		return params;
	},

	ajaiSubmit : function(form, params) {

		var ajax = Prototype(JType.ajaiObject(0), params ); // Skip first iframe load
		//ajax.note = param["note"];
		//ajax.onreadystatechange = params["success"];//callback;
		//ajax.open(obj.method, obj.getAttribute('action'), true);
		//ajax_req.send(null);
		ajax.request();

		var original_action = form.getAttribute('action');
		var original_method = form.method;
		var original_target = form.target;
		form.action = ajax.url;
		form.method = ajax.method;
		form.target = ajax.ref.name; // ref is an iframe object
		form.submit();
		form.action = original_action;
		form.method = original_method;
		form.target = original_target;
		return true;
	},

	ajaxSubmit : function(form, _params) {

		var params = Prototype( JType.ajaxForm(form) , _params );

		if (params["iframe"]) return JType.ajaiSubmit(form, params);

		var ajax = Prototype(JType.ajaxObject(), params );

		ajax.request();

		return false;
	},

	ajaxRun : function(url, method, args, callback, note, iframe) {

		var ajax = Prototype((iframe ? JType.ajaiObject() : JType.ajaxObject()), { 
			"url":url, "method":method, "args":args, "success":callback, "data":note } );

		ajax.request();

	},

	uids: 0,
	binds: { },

	JQueryNodePrototype: {

		register : function() {

		},

		each : function(calee) {
			calee.call(this, 0, this);
			return this;
		},

		eventHandler: function(e, callback) {
			//this._call = callback;
			//var keep_event = this._call();
			//this._call = null;
			var keep_event = callback.call(this, e);
			if (keep_event == false) {
				if (e.stopPropagation) e.stopPropagation();
				else e.cancelBubble = true;
				if (e.preventDefault) e.preventDefault(); 
				else e.returnValue = false;
				return false;
			}
			return true;
		},

		uid : function() {
			var current = this.getAttribute('data-jtype-uid');
			if (current) return current;
			else current = JType.uids++;
			this.setAttribute('data-jtype-uid', current);
			return current;
		},

		bind : function(type, callback) {
			var useCapture = false;
			var relay = this;
			var func = function(e) {	relay.eventHandler(e, callback)	};
			var uid = this.uid();
			if (!JType.binds[uid]) JType.binds[uid] = { };
			if (!JType.binds[uid][type]) JType.binds[uid][type] = [ ];
			JType.binds[uid][type].push({ "real":callback, "wrapped":func});
			// W3C listeners?
			if (this.addEventListener)
				this.addEventListener(type, func, useCapture);
			// IE-style listeners?
			else if (this.attachEvent)
				this.attachEvent('on' + type, func);
			return this;
		},

		unbind : function(type, callback) {
			var useCapture = false;
			var func = null;
			var uid = this.uid();
			if (!JType.binds[uid]) {
				console.log("Cant see any binds for uid " + uid);
				return false;
			}
			for (var i = 0; i < JType.binds[uid][type].length; i++) {
				var bind = JType.binds[uid][type][i];
				//console.log("Event", type, i, bind, bind.real, callback);
				if (bind.real === callback) {
					func = bind.wrapped;
					break;
				}
			}
			if (!func) {
				console.log("Can't unbind event " + type + " for uid " +uid);
				return false;
			}
			// W3C listeners?
			if (this.removeEventListener) 
				this.removeEventListener(type, func, useCapture);
			// IE-style listeners?
			else if (obj.detachEvent) 
				this.detachEvent('on' + type, func);

			return this;
		},

		ajax : function(params) {
			params = params || { };
			if (this.nodeName == 'FORM') {
				return JType.ajaxSubmit(this, params);
			}
			if (this.nodeName == 'A' && !params['url']) {
				params['url'] = this.getAttribute('href'); 
			}
			JType.ajaxRun(params['url'], params['method'], params['args'], params['success'], params['data']);
			return this;
		}

	},

	JQueryListPrototype: {

		register : function() {
			for (var i = 0; i < this.length; i++) {
				this[i] = Prototype(this[i], JType.JQueryNodePrototype);
			}
			return this;
		},

		each : function(calee) {
			for (var i = 0; i < this.length; i++) {
				if (! calee.call(this[i], i, this[i]) ) break;
			}
			return this;
		},

		bind : function(type, callback) {
			for (var i = 0; i < this.length; i++) {
				this[i].bind(type, callback);
			}
			return this;
		},

		unbind : function(type, callback) {
			for (var i = 0; i < this.length; i++) {
				this[i].unbind(type, callback);
			}
			return this;
		},

		ajax : function(params) {
			for (var i = 0; i < this.length; i++) {
				this[i].ajax(params);
			}
			return this;
		}

	},

	JQueryDocumentPrototype: {

		ready: function(calee) {
			if (JType.domReady == 2) {
				calee();
			} else {
				JType.domCalees.push(calee);
				JType.domLoad();
			}
			return this;
		},

		ajax : function(params) {

			var ajax = Prototype(	
				(params["iframe"] ? JType.ajaiObject() : JType.ajaxObject()), params );

			ajax.request();

			return this;
		}

	},

	JQueryAjaxPrototype: {
		
		onreadystatechange : function() {
			if (this.readyState == 4) {
				if (this.success) {
					if (this.json == true) {
						var parsed = null;
						try {
							if (JSON) {
							 parsed = JSON.parse(this.responseText); 
							} else {
							 eval( "parsed = " + this.responseText )
							}
						} catch(e) {	}
						this.responseJson = parsed;
						if (parsed) this.responseText = parsed;
					}
					this.success(this.data);
				}
			}
		},

		request : function() {
			if (this.method === 'POST') {
				this.open('POST', this.url, true);
				this.setRequestHeader('Content-Type','application/x-www-form-urlencoded');

				this.send(JType.ajaxArguments(this.args));
			} else {
				var url = this.url;
				if (this.args) url = url + '?' + JType.ajaxArguments(this.args);
				this.open('GET', url, true);
				this.send(null);
			}
		}

	},

	JQueryAjaiPrototype: {

		ref: null, // iframe object

		open : function(method, url, flag) {
			var name = 'axif'+(JType.iframesCounter++);
			var i = document.createElement('IFRAME'); 
			var o = this;
			i.id = name; i.name = name;
			//i.style.display = 'none';
			this.ref = i;
			this.loaded = function() {
				//alert("skip:"+o.skip);
				if (o.skip) { o.skip--; return; }
				if (i.contentDocument) { var d = i.contentDocument;	}
				else if (i.contentWindow) { var d = i.contentWindow.document; }
				else return;//if (d.location.href == 'about:blank') { return; }

				o.readyState = 4;
				o.responseText = d.body.innerHTML;
				o.onreadystatechange(o.data);

				$(i).unbind('load', o.loaded);
				document.body.removeChild(i);
				delete o;
			};
		},

		send : function() {
			//var o = this;
			var i = this.ref;
			i.src = this.url; 

			$(i).bind('load', this.loaded);
			document.body.appendChild(i);
		},
		
		setRequestHeader: function(x,y) {
			//quietly ignore it
		}
	}

};

if (!window.console) {
	console = {
		"log": function (a) {
			//alert(a);
		} 
	}
}

function $(arg, arg2) {

	return JQuery(arg, arg2);

}

function JQuery(arg, arg2) {
	console.log("JQuery with arg " + typeof arg, arg);
	if (arg === document) {
		return Prototype(arg, JType.JQueryDocumentPrototype);
	}

	else if (typeof arg === 'object') {
		return Prototype(arg, JType.JQueryNodePrototype);
	} 

	else if (typeof arg === 'string') {

		var o = JType.SelEng( arg, arg2 );
//console.log(arg, arg2, o);
		if (o.length == 1) return Prototype( o[0], JType.JQueryNodePrototype );

		return Prototype( o, JType.JQueryListPrototype );
	}

	else if (typeof arg === 'function') {
		JQuery(document).ready(arg);
	}

	else if (typeof arg === 'undefined') {
		return JQuery(document);
	}

	else {
		console.log("Undefined argument type " + typeof arg);
	}

}

function $$(arg, proto) {

	return Prototype(arg, proto);

}

function Prototype(arg, proto) {

	/* List of objects */
	if (arg.length) {
		for (var i in arg) {
			//alert('one object is ' + arg[i]);
			//Prototype(arg, proto);		
		}	
	}

//	if (arg.length == 1) {
	//	arg = arg[0];
//	}

	//alert('proto:' + arg + '('+typeof arg+')'+arg.length);

	for (var key in proto) {

		arg[key] = proto[key];

		//console.log(key + " = "+proto[key]);

	}

	if (proto.register && typeof proto.register === 'function') {

		arg.register();	

	}

	return arg;
}

