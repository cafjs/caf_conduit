/*!
Copyright 2014 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";

/**
 * An efficient immutable stack.
 *
 *
 */
var newNode = function(data, next) {
    var that = {};
    that.getData = function() {
        return data;
    };
    that.getNext = function() {
        return next;
    };
    return that;
};


var newStack = function(node) {
    var top = node || null;
    var that = {};

    that.__push__ = function(data) {
        return newStack(newNode(data, top));
    };

    that.__peek__ = function() {
        return top && top.getData();
    };

    that.__pop__ = function() {
        return top && newStack(top.getNext());
    };

    that.__forEach__ = function(f) {
        var i = top;
        var s = 0;
        while (i !== null) {
            f(i.getData(), s);
            s = s +1;
            i = i.getNext();
        }
    };
    that.__map__ = function(f) {
        var i = top;
        var result = [];
        while (i !== null) {
            result.push(f(i.getData()));
            i = i.getNext();
        }
        return result;
    };

    that.__length__ = function() {
        var count = 0;
        that.__forEach__(function() { count = count + 1;});
        return count;
    };

    return that;
};

exports.newInstance = function() {
    return newStack();
};

