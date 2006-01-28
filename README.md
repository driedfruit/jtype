# JType

A tiny javascript framework, that borrows it's syntax from jQuery and
Prototype.

In only 20kb (about 750 lines of code), it can provide an onDOMload method,
AJAX (both true and iframe-based), `.each` iterator and an event handler
manager.

Code written against JType should run under jQuery with no changes
(except the form-ajax stuff).

## Selector Engines

By default, JType uses native `QuerySelectorAll`, but it is possible to extend
it with other selector engines, namely [Sizzle][sizzle], [nwmatcher][nwmatcher],
[peppy][peppy] and [sly][sly].

Note: [According to caniuse.com][QSA], `QuerySelectorAll` is supported by all
currently used UAs (IE7 being the odd one in the bunch, and IE8 limited to
CSS2.1 selectors). See the link to get the most up-to-date stats.

 [QSA]: http://caniuse.com/#search=QuerySelectorAll
 [sizzle]: https://github.com/jquery/sizzle
 [sly]: https://github.com/digitarald/sly
 [nwmatcher]: https://github.com/dperini/nwmatcher
 [peppy]: https://github.com/jdonaghue/Peppy

## Usage

	git submodule init
	git submodule update
	make

Will give you the .js files with versions containting different selector
engines,

    jtype-sizzle-0.0.4.js
    jtype-nwmatcher-0.0.4.js
    jtype-peppy-0.0.4.js
    jtype-sly-0.0.4.js
    jtype-0.0.4.js (no selector engine, same as jtype.js)

There're build targets for each of them, i.e. you can use `make sizzle`.

Include the desired file to your HTML page:

```html
	<script src='jtype-sizzle-0.0.4.js'></script>
```

And invoke JType's functions.

## Functions

### Initialize

`$(document).ready( callback )`

Fire `callback` function on DOM load event.

```js
	$(document).ready( function() {
		alert('DOM loaded!');
	});
```

This function could be used multiple times.

### Select

`$( selector [, base] )`

`JType.$( selector [, base] )`

_Yes, there's a function called `$`, which will be in conflict with
i.e. jQuery._

Returns an array of items selected by `selector`, from optional `base` element.
If `base` is not specified, `document` is used.

```js
	//collect all A elements from the document
	var links = $('a');
```

#### Match

`.matches( selector )`

Performs a selector test against an element.

```js
	if ($('a').matches('.active'))
		//has class!
```

#### Closest parent

`.closest( selector [, base] )`

Finds closest parent (beginning with this node).

```js
	var fig = $('img').closest('figure')
```

#### Create

Creates new DOM elements by taking HTML string for an argument.

```js
	//create two A elements
	var links = $('<a/><a/>');
```

### Extend

`$$( object, prototype )`

`JType.extend( object, prototype )`

_Yes, there's a function called `$$`, which will be in conflict with
i.e. Prototype._

Assigns each enumerable property of object `prototype` to object `object`.

```js
	//add an 'update' function to the link object
	var link = $('#id');
	$$(link, { 'update': function() { this.href = '#'; } });
```

Returns `object`, for chaining.

### Classes

`.hasClass( name )`
`.addClass( name )`
`.removeClass( name )`

Tests, adds or removes a class from element's class list.

### Iterate

`.each( callback )`

Iterates through an array of objects and calls `callback` for each one.
```js
	//change each link's text in a document
	$('a').each(function() {
		this.innerHTML = "A link";
	});
```

Callback function is called from the object context, so `this` always refers
the object being iterated over.

Callback function may accept 2 arguments - current iteration `index` and
current `element`.

If your callback function returns `false`, the iteration loop is broken out of.

```js
	//use verbose callback
	$('a').each(function(index, element) {
		element.innerHTML = "A link, number " + index;

		//only handle first two links
		if (index > 1) return false;
	});
```

### Add handlers

`.on( type [, selector ], callback )`

`.delegate( selector, type, callback )`

`.bind( type, callback )`

Adds an event listener.

If your callback function returns `false`, event propagation is stopped,
and the event is canceled.

```js
	//handle mouse-click
	$('button').bind('click', function(event) {
		//'event' is MouseEvent, naturally
		alert('Clicked');
	});
```

```js
	//prevent form submission
	$('form').bind('submit', function() {
		return false;
	});
```

Delegated event listeners could be used for elements that do not exist yet,
and to avoid creating multiple event listeners, when one can suffice:

```js
	//only one event handler for multiple <tr> elements
	$('table').delegate('tr', 'click', function() {
		alert('row clicked');
	});
	//it will work even for this one:
	$('table')[0].appendChild( document.createElement('tr') );
```

### Remove handlers

`.off( type [, selector] [, callback])`

`.undelegate( selector [, type] [, callback] )`

`.unbind( [type] [, callback] )`

Removes an event listener.

If callback is not specified, all event listeners of type `type` are removed.

If no type is specified either, **ALL** event listeners are removed.

### Append

`.append( mixed )`

Calls `.appendChild` for each element in a passed array, for passed object, or
for all elements created by a passed string.

### AJAX

`.ajax( params )`

Where params is a hash with the following optional keys:

```js
	var params = {
		"url" : 'target/backend/url',
		"method" : 'POST', //or GET
		"args" : { }, //key-val pairs for submision
		"data" : '', //user-defined object, will be passed to callback
		"success" : function() { }, //callback function
		"iframe" : 0, //or 1
		"json" : false //parse response as json into .responseJson
	};
```

#### Simple request

Use `$(document)` to invoke the simplest ajax request:

```js
	$(document).ajax( {
		"url" : 'target/backend/url',
		"method" : 'POST',
		"args" : { "arg1" : "val1" },
		"success" : function() {
			//callback function
			alert(this.responseText);
		} 
	} );
```

#### Link-based request

Additionally, you can use a link as a request initiator:

```html
	<a id='link' href='target/backend/url'>Link</a>
```
```js
	$('#link').ajax(
		'args' : { "arg1" : "val1" }
	);
```

Will use link's `href` attribute as a target `url`.

#### Form-based request

Or, a form!

```html
	<form action='target/backend/url' method='post'>
		<input type='text' name='arg1' />
	</form>
```
```js
	$('form').ajax(
		'success' : function(e) { alert('form posted'); }
	);
```

Will submit a form via ajax. Form's `action` and `method` are used;
`args` are collected from the input fields.

## Caveats

Expanding objects is not being done via the `.prototype` property, but by
brutally applying each property to each object. This is much slower, but correct
in terms of DOM.

Only a small subset of jQuery functionality is provided:

`.text(), .html(), .class(), .attr()` and similar helper functions are not
available, native DOM methods should be used instead.

`.unbind(event)`, event-maps, multiple event types, type namespaces and custom
events are not supported.

## Copying

Distributed under 2-clause BSD.
