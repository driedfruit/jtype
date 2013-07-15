/* JType - a JQuery/Prototype simulation library 
 * License: 2-clause BSD
 */
/*global document,window,XMLHttpRequest*/
var JType = {

	SelEng: function (selector, context) {
		return context ? 
			context.querySelectorAll(selector) :
			document.querySelectorAll(selector);
	},

	domReady : 0,	// 0 - no, 1 - preparing, 2 - done
	domCalees : [ ],

	domLoad : function () {
		if (JType.domReady === 0) {
			window.onload = function () {
				var i;
				if (JType.domReady !== 2) { 
					JType.domReady = 2;
					for (i = 0; i < JType.domCalees.length; i++) {
						JType.domCalees[i]();
					}
				}
			}
			if (document.addEventListener) {
				document.addEventListener("DOMContentLoaded", window.onload, false); }
			JType.domReady = 1;
		}
	},

	isChildOf : function (kid, probable_parent) {
		if (kid == probable_parent) return true;
		while (kid.parentNode) {	
			if (kid.parentNode === probable_parent) return true;
			kid = kid.parentNode;
		}
		return false;
	},

	createNode : function(html) {
		var obj = document.createElement('div');
		obj.innerHTML = html;

		var arr = [ ];
		var i = 0;
		while (obj.childNodes.length) {
			arr[ i ] = obj.removeChild( obj.firstChild );
			i++;
		}

		return arr;
	},

	iframesCounter : 0, 
	ajaiObject : function (skip) {
		var o = new Object();
		o = Prototype(o, JType.JQueryAjaiPrototype);
		o = Prototype(o, JType.JQueryAjaxPrototype);
		o.skip = skip;
		return o;
	},

	ajaxObject : function () {
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

	ajaxArguments : function (args) {
		var str = ''; var sep = '';
		for (var key in args) {
			str = str + sep;
			str = str + key+'='+escape(encodeURI(args[key]));
			sep = '&';
		}
		return str;
	},

	formArguments : function (form) {
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

	ajaxForm : function (form) {
		var params = JType.formArguments(form);
		params['url'] = form.getAttribute('action');
		params['method'] =  form.method.toUpperCase();
		return params;
	},

	ajaiSubmit : function (form, params) {
		var ajax = Prototype(JType.ajaiObject(0), params ); // Skip first iframe load
		//ajax.note = param["note"];
		//ajax.onreadystatechange = params["success"];//callback;
		//ajax.open(obj.method, obj.getAttribute('action'), true);
		//ajax_req.send(null);
		//ajax.request();
		ajax.open();

		ajax.form_original = { 
			"action": form.getAttribute('action'),
			"method": form.method,
			"target": form.target,
		}; 

		form.action = ajax.url;
		form.method = ajax.method;
		form.target = ajax.ref.name; // ref is an iframe object

		ajax.ref_form = form;
		
		form.submit();
		return true;
	},

	ajaxSubmit : function (form, _params) {

		var params = Prototype( JType.ajaxForm(form) , _params );

		if (params["iframe"]) return JType.ajaiSubmit(form, params);

		var ajax = Prototype(JType.ajaxObject(), params );

		ajax.request();

		return false;
	},

	ajaxRun : function (url, method, args, callback, note, iframe) {

		var ajax = Prototype((iframe ? JType.ajaiObject() : JType.ajaxObject()), { 
			"url":url, "method":method, "args":args, "success":callback, "data":note } );

		ajax.request();

	},

	uids: 0,
	binds: { },

	JQueryNodePrototype: {

		register : function () {

		},

		each : function (calee) {
			calee.call(this, 0, this);
			return this;
		},

		eventHandler: function (e, callback, selector) {
			var objs = selector ? JType.SelEng(selector, this) : [ this ];
			var ok = true;
			for (i = 0; i < objs.length; i++) {
				//if (e.target != objs[i]) continue;
				if (selector && !JType.isChildOf(e.target, objs[i])) continue;
				var keep_event = callback.call(objs[i], e);
				if (keep_event == false) {
					if (e.stopPropagation) e.stopPropagation();
					else e.cancelBubble = true;
					if (e.preventDefault) e.preventDefault(); 
					else e.returnValue = false;
					ok = false;
					break;
				}
			}
			return ok;
		},

		uid : function () {
			var current = this.getAttribute('data-jtype-uid');
			if (current) return current;
			else current = JType.uids++;
			this.setAttribute('data-jtype-uid', current);
			return current;
		},

		on : function (type, middle_arg, callback) {

			var subselector = null;
			if (typeof middle_arg === 'function') callback = middle_arg;
			if (typeof middle_arg === 'string') subselector = middle_arg;		

			return this.delegate(subselector, type, callback);
		},

		off : function (type, middle_arg, callback) {

			var subselector = null;
			if (typeof middle_arg === 'function') callback = middle_arg;
			if (typeof middle_arg === 'string') subselector = middle_arg;		

			return this.undelegate(subselector, type, callback);
		},

		delegate : function (selector, type, callback) {
			var useCapture = false;
			var relay = this;
			var func = function(e) {	return relay.eventHandler(e, callback, selector)	};
			var uid = this.uid();
			if (!JType.binds[uid]) JType.binds[uid] = { };
			if (!JType.binds[uid][type]) JType.binds[uid][type] = [ ];
			JType.binds[uid][type].push({ "real":callback, "wrapped":func, "selector":selector});
			// W3C listeners?
			if (this.addEventListener)
				this.addEventListener(type, func, useCapture);
			// IE-style listeners?
			else if (this.attachEvent)
				this.attachEvent('on' + type, func);
			return this;
		},

		undelegate : function (selector, type, callback) {
			var useCapture = false;
			var func = null;
			var uid = this.uid();
			if (!JType.binds[uid]) {
				console.log("Cant see any binds for uid " + uid);
				return false;
			}
			// 3 loops instead of one, code duplication, but less branching
			if (!type) {
				// Variation 1 -- nothing is specified, remove ALL events
				for (var ltype in JType.binds[uid]) {
					if (!JType.binds[uid][ltype]) continue;
					for (var i = 0; i < JType.binds[uid][ltype].length; i++) {
						var bind = JType.binds[uid][ltype][i];
						var lfunc = bind.wrapped;
						if (selector && selector != bind.selector) continue;
						if (this.removeEventListener)
							this.removeEventListener(ltype, lfunc, useCapture);
						else if (this.detachEvent) // IE :( 
							this.detachEvent('on' + ltype, lfunc);
					}
				}
				return this;
			} else if (!callback) {
				//Variation 2 -- callback not specified, remove all 'type' events
				if (JType.binds[uid][type])
				for (var i = 0; i < JType.binds[uid][type].length; i++) {
					var bind = JType.binds[uid][type][i];
					var lfunc = bind.wrapped;
					if (selector && selector != bind.selector) continue;
					if (this.removeEventListener) 
						this.removeEventListener(type, lfunc, useCapture);
					else if (this.detachEvent) // IE :(
						this.detachEvent('on' + type, lfunc);
				}
				return this;
			}
			// Variation 3 -- both type and callback are specified
			if (JType.binds[uid][type])			
			for (var i = 0; i < JType.binds[uid][type].length; i++) {
				var bind = JType.binds[uid][type][i];
				//console.log("Event", type, i, bind, bind.real, callback);
				if (selector && selector != bind.selector) continue;
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
			else if (this.detachEvent) 
				this.detachEvent('on' + type, func);

			return this;
		},

		bind : function (type, callback) {
			return this.delegate(null, type, callback);
		},

		unbind : function (type, callback) {
			return this.undelegate(null, type, callback);
		},

		ajax : function (params) {
			params = params || { };
			if (this.nodeName == 'FORM') {
				return JType.ajaxSubmit(this, params);
			}
			if (this.nodeName == 'A' && !params['url']) {
				params['url'] = this.getAttribute('href'); 
			}
			JType.ajaxRun(params['url'], params['method'], params['args'], params['success'], params['data']);
			return this;
		},

		append : function (arg) {
			if (typeof arg === 'object' && !arg.length) {
				arg = [ arg ];
			}
			else if (typeof arg === 'string') {
				arg = JType.createNode( arg );
			}
			for (var i = 0; i < arg.length; i++) {
				this.appendChild( arg[i] );
			}
			return this;
		}

	},

	JQueryListPrototype: {

		register : function () {
			for (var i = 0; i < this.length; i++) {
				this[i] = Prototype(this[i], JType.JQueryNodePrototype);
			}
			return this;
		},

		each : function (calee) {
			for (var i = 0; i < this.length; i++) {
				if ( calee.call(this[i], i, this[i]) === false ) break;
			}
			return this;
		},

		on : function (arg1, arg2, arg3) {
			for (var i = 0; i < this.length; i++) {
				this[i].on(arg1, arg2, arg3);
			}
			return this;		
		},

		off : function (arg1, arg2, arg3) {
			for (var i = 0; i < this.length; i++) {
				this[i].off(arg1, arg2, arg3);
			}
			return this;
		},

		delegate : function (selector, type, callback) {
			for (var i = 0; i < this.length; i++) {
				this[i].delegate(selector, type, callback);
			}
			return this;
		},

		undelegate : function (selector, type, callback) {
			for (var i = 0; i < this.length; i++) {
				this[i].undelegate(selector, type, callback);
			}
			return this;
		},

		bind : function (type, callback) {
			for (var i = 0; i < this.length; i++) {
				this[i].bind(type, callback);
			}
			return this;
		},

		unbind : function (type, callback) {
			for (var i = 0; i < this.length; i++) {
				this[i].unbind(type, callback);
			}
			return this;
		},

		ajax : function (params) {
			for (var i = 0; i < this.length; i++) {
				this[i].ajax(params);
			}
			return this;
		},

		append : function (arg) {
			for (var i = 0; i < this.length; i++) {
				this[i].append(arg);
			}
			return this;
		}
	},

	JQueryDocumentPrototype: {

		ready: function (calee) {
			if (JType.domReady == 2) {
				calee();
			} else {
				JType.domCalees.push(calee);
				JType.domLoad();
			}
			return this;
		},

		ajax : function (params) {

			var ajax = Prototype(	
				(params["iframe"] ? JType.ajaiObject() : JType.ajaxObject()), params );

			ajax.request();

			return this;
		}

	},

	JQueryAjaxPrototype: {
		
		onreadystatechange : function () {
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

		request : function () {
			if (this.method === 'POST') {
				this.open('POST', this.url, true);
				this.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
				if (this.json == true)
					this.setRequestHeader('Accept','application/json');
				this.send(JType.ajaxArguments(this.args));
			} else {
				var url = this.url;
				if (this.args) url = url + '?' + JType.ajaxArguments(this.args);
				this.open('GET', url, true);
				if (this.json == true)
					this.setRequestHeader('Accept','application/json');
				this.send(null);
			}
		}
	},

	JQueryAjaiPrototype: {

		ref: null, // iframe object

		open : function (method, url, flag) {
			var name = 'axif'+(JType.iframesCounter++);
			var o = this;
			//NOTE: this *sane* method doesn't work in <= IE7
			//var i = document.createElement('IFRAME'); 
			//i.id = name; i.name = name;
			//i.src = 'about:blank';
			window.dummy_for_ie7 = function() { }
			var i = $('<iframe id="'+name+'" name="'+name+'" src="about:blank" onload="dummy_for_ie7" />')[0];
			
			//i.style.display = 'none';
			this.ref = i;
			this.loaded = function() {
				if (o.skip) { o.skip--; return; }
				if (i.contentDocument) { var d = i.contentDocument;	}
				else if (i.contentWindow) { var d = i.contentWindow.document; }
				else return;//if (d.location.href == 'about:blank') { return; }
				if (d.location.href == i.src) { return; }

				o.readyState = 4;
				o.responseText = d.body.innerHTML;
				o.onreadystatechange(o.data);

				if (o.ref_form) {
					o.ref_form.action = o.form_original['action'];
					o.ref_form.method = o.form_original['method'];
					o.ref_form.target = o.form_original['target'];
				}

				$(i).unbind('load', o.loaded);
				document.body.removeChild(i);
				delete o;
			};
			$(i).bind('load', this.loaded);
			document.body.appendChild(i);
		},

		send : function () {
			//var o = this;
			var i = this.ref;
			i.src = this.url; 
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

function $ (arg, arg2) {

	return JQuery(arg, arg2);

}

function JQuery (arg, arg2) {
	console.log("JQuery with arg " + typeof arg, arg);
	if (arg === document) {
		return Prototype(arg, JType.JQueryDocumentPrototype);
	}

	else if (typeof arg === 'object') {
		//wrap object
		return Prototype( [ arg ], JType.JQueryListPrototype );
	} 

	else if (typeof arg === 'string') {
		//create
		if (arg.substr(0, 1) == '<' && arg.substr(-1) == '>') {
			return Prototype( JType.createNode( arg ), JType.JQueryListPrototype );
		}
		//select
		return Prototype( JType.SelEng( arg, arg2 ), JType.JQueryListPrototype );
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

function $$ (arg, proto) {

	return Prototype(arg, proto);

}

function Prototype (arg, proto) {

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

