![hasher-logo.gif](http://github.com/millermedeiros/Hasher/raw/master/assets/hasher-logo.gif)

Hasher is a set of JavaScript functions to control browser history for rich-media websites and applications.
It works as an abstraction of browsers native methods plus some extra helper methods, it also has the advantage of dispatching Events when the history state change across multiple browsers (since this feature isn't supported by all of them).

## Key Features ##

 - Get/Set Hash value.
 - Get/Set Page Title.
 - Basic history control (back/forward/go).
 - Helper methods for query string manipulation.
 - Event listener support.
 - Helper methods to hyphenate, remove accents and special chars from strings.

## Why? ##

 - Browsers evolved since the other available solutions were created.
 - Some of the alternatives are way too complex, sometimes doing more things automatically than you actually want it to do.
 - Source code of most of the solutions are way too cryptic making it impossible to customize for your need or to debug it in case you find any issue.
 - Some of the solutions require extra markup and/or blank files to make it work.

## Goals ##

 - Be simple.
 - Work on the main browsers (IE6+, newest versions FF/Safari/Opera/Chrome).
 - Clean source code, making it easy to debug/customize/maintain.
 - Follow best practices/standards.
 - Standalone.
 - Fully unit tested.

## Important ##

 - This code is released under the [MIT license](http://www.opensource.org/licenses/mit-license.php).
 - Weird case scenarios like calling methods from inside (i)frame, wrong doctype, non-valid HTML file, plugins, 3rd party code, etc, **MAY** prevent script from working properly.
 - This code will only be tested on *strict mode*, make sure you understand the [differences between strict and quirks mode](http://www.quirksmode.org/css/quirksmode.html).

&copy; [Miller Medeiros](http://www.millermedeiros.com)