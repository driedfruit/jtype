/* JType - a JQuery/Prototype simulation library 
 * License: 2-clause BSD
 */
/* IE-specific hacks used:
  substr can't take negative values: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/substr
  .name attr can't be set correctly: http://stackoverflow.com/questions/2105815/weird-behaviour-of-iframe-name-attribute-set-by-jquery-in-ie
  iframe onload uses a dummy function: http://stackoverflow.com/questions/4334520/load-event-for-iframe-not-fired-in-ie
  .attachEvent instead of addEventListener.
  Other than that, it's all standards and goodness.
*/
/*global document,window,XMLHttpRequest*/
var JType = {

	SelEng: function (selector, context) {
		return context ? 
			context.querySelectorAll(selector) :
			document.querySelectorAll(selector);
	},
	MatchEng: function (node, selector) {
		if ("matches" in node) return node.matches(selector);
		else if ("matchesSelector" in node) return node.matchesSelector(selector);
		else if ("webkitMatchesSelector" in node) return node.webkitMatchesSelector(selector);
		else if ("mozMatchesSelector" in node) return node.mozMatchesSelector(selector);
		else if ("msMatchesSelector" in node) return node.msMatchesSelector(selector);
		/* Use SelEng to verify selector somehow :( This is rather expensive... */
		var matches = JType.SelEng(selector, node.parentNode);
		for (var i = 0; i < matches.length; i++) {
			if (matches[i] == node) return true;
		}
		return false;
	},

	domReady : 0,	// 0 - no, 1 - preparing, 2 - done
	domCalees : [ ],

	domLoad : function (callee) {
		if (JType.domReady == 2) {
			callee();
		} else {
			JType.domCalees.push(callee);
		}
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

	createNode : function(html, attrs) {
		attrs = attrs || { };

		var obj = document.createElement('div');
		obj.innerHTML = html;

		var arr = [ ];
		var i = 0;
		while (obj.childNodes.length) {
			arr[ i ] = obj.removeChild( obj.firstChild );
			for (var name in attrs) { arr[i][name] = attrs[name]; }
			i++;
		}

		return arr;
	},

	domCopy : function(node) {
		var clone = document.createElement(node.nodeName);
		for (var i = 0; i < node.attributes.length; i++) {
			var attr = node.attributes[i];
			if (attr.name == 'data-jtype-uid') continue;
			clone.setAttribute(attr.name, attr.value);
		}
		//console.log("Cloned", clone);
		return clone;
	},

	clone : function(node) {
		//http://stackoverflow.com/questions/122102/most-efficient-way-to-clone-an-object
		if (node == null || typeof node != "object") return node;
		if (node.nodeName) return JType.domCopy(node);
		//if (node.constructor != Object && node.constructor != Array) return node;
		if (node.constructor == Date || node.constructor == RegExp || node.constructor == Function
		|| node.constructor == String || node.constructor == Number || node.constructor == Boolean)
			return new node.constructor(node);
		var to = new node.constructor();
		for (var name in node) {
			to[name] = JType.clone(node[name]);
		}
		return to;
	},

	iframesCounter : 0,
	ajaiObject : function () {
		var o = new Object();
		o = Prototype(o, JType.JQueryAjaiPrototype);
		o = Prototype(o, JType.JQueryAjaxPrototype);
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

	urlencodeArguments : function (args) {
		var str = ''; var sep = '';
		for (var key in args) {
			str = str + sep;
			str = str + key+'='+escape(encodeURI(args[key]));
			sep = '&';
		}
		return str;
	},

	formdataArguments : function (args) {
		if (args instanceof FormData) return args;
		var fd = new FormData();
		for (var key in args) {
			fd.append(key, args[key]);
		}
		return fd;
	},

	cloneForm : function (form) {
		var inputs = JType.SelEng('input, textarea, select', form);
		var clone = JType.domCopy(form);
		for (var i = 0; i < inputs.length; i++) {
			clone.appendChild( JType.clone(inputs[i]) );
		}
		return clone;
	},

	formArguments : function (form) {
		if (window.FormData) {
			return {
				'args': new FormData(form)
			};
		}
		var inputs = JType.SelEng('input, textarea, select', form);
		var args = { } ;//new Array();
		var iframe = 0;
		for (var i = 0; i < inputs.length; i++) {
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
		var ajax = Prototype(JType.ajaiObject(), params);

		ajax.open();

		if (ajax.iframe == 2) { /* modern tech */
			var nform = JType.cloneForm(form);//IE8 will lose input=file at this point :/
			ajax.ref.appendChild(nform);//also IE8 wants forms to be in DOM
		}
		else {//IE
			var nform = form;
			ajax.form_original = {
				"action": form.getAttribute('action'),
				"method": form.method,
				"target": form.target
			};
		}

		if (ajax.json == true) {
			nform.appendChild(
				$('<input type="text" name="json" value="1" data-jtype-deleteme="true" />')[0]
			);
		}

		ajax.ref_form = nform;

		nform.action = ajax.url;
		nform.method = ajax.method;
		nform.target = ajax.ref.name; // ref is an iframe object

		nform.submit();
		return true;
	},

	ajaxSubmit : function (form, _params) {

		var params = Prototype( JType.ajaxForm(form) , _params );

		if (params["iframe"]) return JType.ajaiSubmit(form, params);

		var ajax = Prototype(JType.ajaxObject(), params );

		ajax.request();

		return false;
	},

	ajaxRun : function (params) {

		var ajax = Prototype(
			(params["iframe"] ? JType.ajaiObject() : JType.ajaxObject()), params );

		ajax.request();

	},

	uids: 0,
	binds: { },

	uid : function (obj) {
		//var obj = this;
		var current = obj.getAttribute('data-jtype-uid');
		if (current) return current;
		current = JType.uids++;
		obj.setAttribute('data-jtype-uid', current);
		return current;
	},

	eventHandler: function (e, callback, selector) {
		if (!e.target) e.target = e.srcElement;
		var objs = selector ? JType.SelEng(selector, this) : [ this ];
		var ok = true;
		for (var i = 0; i < objs.length; i++) {
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

	classRegexps: { },
	classRegExp: function (name) {
		if (!classRegExps[name]) {
			classRegExps[name] = new RegExp('(\\s|^)'+name+'(\\s|$)');
		}
		return classRegExps[name];
	},

	JQueryNodePrototype: {

		register : function () {

		},

		//each : function (calee) {
		//	calee.call(this, 0, this);
		//	return this;
		//},

		//uid : function () {
		//	var current = this.getAttribute('data-jtype-uid');
		//	if (current) return current;
		//	else current = JType.uids++;
		//	this.setAttribute('data-jtype-uid', current);
		//	return current;
		//},

		on : function (type, middle_arg, callback) {

			var subselector = null;
			if (typeof middle_arg === 'function') callback = middle_arg;
			if (typeof middle_arg === 'string') subselector = middle_arg;

			return JType.JQueryNodePrototype.delegate.call(this, subselector, type, callback);
		},

		off : function (type, middle_arg, callback) {

			var subselector = null;
			if (typeof middle_arg === 'function') callback = middle_arg;
			if (typeof middle_arg === 'string') subselector = middle_arg;

			return JType.JQueryNodePrototype.undelegate.call(this, subselector, type, callback);
		},

		delegate : function (selector, type, callback) {
			var useCapture = false;
			var relay = this;
			var func = function(e) { return JType.eventHandler.call(relay, e, callback, selector); };
			var uid = JType.uid(this);
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
			var uid = JType.uid(this);
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
			return JType.JQueryNodePrototype.delegate.call(this, null, type, callback);
		},

		unbind : function (type, callback) {
			return JType.JQueryNodePrototype.undelegate.call(this, null, type, callback);
		},

		ajax : function (params) {
			params = params || { };
			if (this.nodeName == 'FORM') {
				JType.ajaxSubmit(this, params);
				return this;
			}
			if (this.nodeName == 'A' && !params['url']) {
				params['url'] = this.getAttribute('href');
			}
			JType.ajaxRun(params);
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
		},

		hasClass: function (name) {
			var re = JType.classRegExp(name);
			return this.className.search(re) == -1 ? false : true;
		},
		addClass: function (name) {
			var _rm = JType.JQueryNodePrototype.removeClass
			this.className = _rm(this, name) + ' ' + name;
			return this;
		},
		removeClass: function (name) {
			var re = JType.classRegExp(name);
			this.className = this.className.replace(re, '');
			return this;
		},

		matches: function (selector, node) {
			node = node || this;
			return JType.MatchEng(node, selector);
		},

		closest: function (selector, node) {
			var _matches = JType.JQueryNodePrototype.matches;
			node = node || this;
			while (node) {
				if (_matches(selector, node)) return node;
				node = node.parentNode;
			}
			return false;
		}

	},

	prepareList : function(funcs, cfuncs) {
		funcs = funcs || [ "on", "off", "delegate", "undelegate", "bind", "unbind",
			"ajax", "append", "addClass", "hasClass", "removeClass" ];
		cfuncs = cfuncs || [ "matches", "closest" ];
		function collectFunc(name) {
			return function(arg1, arg2, arg3) {
				var ret = []
				for (var i = 0; i < this.length; i++) {
					ret[i] = JType.JQueryNodePrototype[name].call(this[i], arg1, arg2, arg3);
				}
				return Prototype( ret, JType.JQueryListPrototype );
			}
		}
		function iterFunc(name) {
			return function(arg1, arg2, arg3) {
				for (var i = 0; i < this.length; i++) {
					JType.JQueryNodePrototype[name].call(this[i], arg1, arg2, arg3);
				}
				return this;
			}
		}
		for (var j = 0; j < funcs.length; j++) {
			var name = funcs[j];
			JType.JQueryListPrototype[name] = iterFunc(name);
		}
		for (var j = 0; j < cfuncs.length; j++) {
			var name = cfuncs[j];
			JType.JQueryListPrototype[name] = collectFunc(name);
		}
	},

	JQueryListPrototype: {

		register : function () {
			for (var i = 0; i < this.length; i++) {
				//this[i] = Prototype(this[i], JType.JQueryNodePrototype);
			}
			return this;
		},

		//eachExec : function(name, arg1, arg2, arg3) {
		// for (var i = 0; i < this.length; i++) {
		//  JType.JQueryNodePrototype[name].call(this[i], arg1, arg2, arg3);
		// }
		// return this;
		//},

		each : function (calee) {
			for (var i = 0; i < this.length; i++) {
				if ( calee.call(this[i], i, this[i]) === false ) break;
			}
			return this;
		}
	},

	JQueryDocumentPrototype: {

		ready: function (calee) {
			JType.domLoad(calee);
			return this;
		},

		ajax : function (params) {
			JType.ajaxRun(params);
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
						} catch(e) { console.log("Error parsing JSON", e); }
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
				if (this.json == true)
					this.setRequestHeader('Accept','application/json');
				if (window.FormData && !this.iframe) {
					this.send(JType.formdataArguments(this.args));
				}
				else {
					this.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
					this.send(JType.urlencodeArguments(this.args));
				}
			} else {
				var url = this.url;
				if (this.args) url = url + '?' + JType.urlencodeArguments(this.args);
				this.open('GET', url, true);
				if (this.json == true)
					this.setRequestHeader('Accept','application/json');
				this.send(null);
			}
		}
	},

	JQueryAjaiPrototype: {

		headers: [ ], //ignored for now.. :(
		ref: null, // iframe object
		ref_form: null, //form object

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
				if (i.contentDocument) { var d = i.contentDocument; }
				else if (i.contentWindow) { var d = i.contentWindow.document; }
				else return;
				if (d.location.href == 'about:blank') { return; }
				//if (d.location.href == i.src) { return; }

				o.readyState = 4;
				o.responseText = d.body.innerHTML;
				o.onreadystatechange(o.data);

				if (o.ref_form && o.form_original) {
					$('[data-jtype-deleteme]', o.ref_form).each(function() {
						this.parentNode.removeChild(this);
					});
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

			if (method) {
				this.ref_form = document.createElement('form');
				this.ref_form.action = url;
				this.ref_form.method = method;
				this.ref_form.target = name;
				i.appendChild(this.ref_form);//for IE
				this.method = method;//public-facing property
			}
		},

		send : function (args) {
			//var o = this;
			var i = this.ref;
			if (args === null) {
				if (this.ref_form) {
					i.src = this.ref_form.action;
				} else {
					i.src = this.url;
				}
			}
			else if (typeof args === 'FormData') {
				//nothing happens :(
				alert("DOING NOTHING");
			}
			else if (typeof args === 'string') {
				if (this.ref_form) {
					for (var key in this.args) {
						var input = $('<input name="'+key+'" />', {
							"type": "text",
							"value": this.args[key]
						})[0];
						this.ref_form.appendChild(input);
					}
					this.ref_form.submit();
				} else
					i.src = this.url + '?' + args
			}

		},
		
		setRequestHeader: function(name, value) {
			if (name == 'Accept') {
				//not ever called for some reason...?
			}
			if (name == 'Content-Type' && this.ref_form) {
				// 'encoding' is for IE(ver?).
				this.ref_form.encoding = this.ref_form.enctype = value;
			}
			this.headers[ name.toUpperCase() ] = value;
		}
	}

};

function $ (arg, arg2) {

	return JQuery(arg, arg2);

}

function JQuery (arg, arg2) {
	//console.log("JQuery with arg " + typeof arg, arg);
	if (arg === document) {
		return Prototype(arg, JType.JQueryDocumentPrototype);
	}

	else if (typeof arg === 'object') {
		//wrap object
		return Prototype( [ arg ], JType.JQueryListPrototype );
	} 

	else if (typeof arg === 'string') {
		//create
		if (arg.substr(0, 1) == '<' && arg.substr(arg.length-1, 1) == '>') { //IE substr negative :/
			return Prototype( JType.createNode( arg, arg2 ), JType.JQueryListPrototype );
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

		try {
			arg[key] = proto[key];
		}
		catch (e) {
			console.log("Unable to set ", arg);
			arg[key] = null;
		}

		//console.log(key + " = "+proto[key]);

	}

	if (proto.register && typeof proto.register === 'function') {

		arg.register();

	}

	return arg;
}

if (!window.console) {
	console = {
		"log": function (a) {
			//alert(a);
		}
	}
}

if ("classList" in document) {
	JType.JQueryNodePrototype.addClass = function(name) {
		this.classList.add(name); return this;
	}
	JType.JQueryNodePrototype.hasClass = function(name) {
		return this.classList.has(name);
	}
	JType.JQueryNodePrototype.removeClass = function(name) {
		this.classList.remove(name); return this;
	}
}

JType.prepareList();
