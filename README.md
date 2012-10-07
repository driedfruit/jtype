# JType

A tiny javascript framework, that borrows it's syntax from JQuery and 
Prototype.

In only 10kb (about 500 lines of code), it can provide an onDOMload method, 
AJAX (both true and iframe-based), `.each` iterator and an event binder/unbinder. 

JType should also be able to "emulate" JQuery, for cases when you need
to quickly test some JQuery-based code snippet, but don't want to add the extra
dependancy.

## Selector Engines

By default, JType uses native `QuerySelectorAll`, but it is possible to extend it with 
other selector engines, namely [Sizzle][sizzle], [nwmatcher][nwmatcher], 
[peppy][peppy] and [sly][sly]. 

Note: [According to caniuse.com][QSA], `QuerySelectorAll` is 
supported by all currently used UAs (IE7 being the odd one in the bunch, and IE8
limited to CSS2.1 selectors). See the link to get the most up-to-date stats.

 [QSA]: http://caniuse.com/#search=QuerySelectorAll
 [sizzle]: https://github.com/jquery/sizzle 
 [sly]: https://github.com/digitarald/sly
 [nwmatcher]: https://github.com/dperini/nwmatcher
 [peppy]: https://github.com/jdonaghue/Peppy

## Usage

```sh
	git submodule init
	git submodule update
	make
```
Will give you the .js files with versions containting different selector engines,

    jtype-sizzle-0.0.1.js
    jtype-nwmatcher-0.0.1.js
    jtype-peppy-0.0.1.js
    jtype-sly-0.0.1.js
    jtype-0.0.1.js (no selector engine, same as jtype.js)
    
There're build targets for each of them, i.e. you can use `make sizzle`. 

Include the desired file to your HTML page:

```html
	<script src='jtype-sizzle-0.0.1.js'></script>
```

And invoke JType's functions.

## Functions

### Select

`$(selector[, base])`
`JQuery(selector[, base])`

_Yes, there's a function called `JQuery` (sorry about that), and an alias, called `$`._

Returns an array of items (or one item!) selected by `selector`, from optional `base`
element. If `base` is not specified, `document` is used.

```js
	//collect all A elements from the document
	var links = $('a');
```

### Expand	

`$$(object, prototype)`
`Prototype(object, prototype)`

_Yes, there's a function called `Prototype` (sorry about that too), and an alias, called `$$`._

Assigns each enumerable property of object `prototype` to object `object`.

```js
	//add an 'update' function to the link object
	var link = $('#id');
	$$(link, { 'update': function() { this.href = '#'; } });
```

Returns `object`, for chaining.

### Iterate

`each( callback )`

Iterates through an array of objects and calls `callback` for each of them.
```js
	//change each link's text in a document
	$('a').each(function() {
		this.innerHTML = "A link";
	});
```
 
### Initialize

`$(document).ready( callback )`

Fire `callback` function on DOM load event.

```js
	$(document).ready( function() {
		alert('DOM loaded!');
	});
```

This function could be used multiple time.

### Handle

`bind( type, callback )`

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

### Cleanup

`unbind( type, callback )`

Removes an event listener.

### AJAX

	`ajax( params )`
	
Where params is a hash with the following optional keys:

```js
	var params = {
		"url" : 'target/backend/url',
		"method" : 'POST', //or GET
		"args" : { }, //key-val pairs for submision 
		"data" : '', //user-defined object, will be passed to callback
		"success" : function() { }, //callback function
		"iframe" : 0, //or 1	
	};
```

#### Simple request

Use `$(document)` to invoke the simplest ajax request:

```js
	$(document).ajax( {
		"url" : 'target/backend/url',
		"method" : 'POST',
		"args" : { "arg1" : "val1"	},
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
		'args' : { "arg1" : "val1"	}
	);
```

Will use link's `href` attribute as a target `url`.
	
#### Form-based request

Or, a form!

```html
	<form action='target/backend/url' method='post'>
		<input type='name' />
	</form>
```
```js
	$('form').ajax(
		'success' : { alert('form posted'); }
	);
```

Will submit a form via ajax. Form's `action` and `method` are used;
`args` are collected from the input fields.

## Caveats

Unlike JQuery, calling `$('#id')` will return **ONE** object, not an array with one element, nor a nodelist.

`.text, .html, .class, .attr` and similar helper functions are not available, native DOM 
methods should be used instead.

## Copying

Distributed under 2-clause BSD.