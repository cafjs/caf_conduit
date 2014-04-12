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

var async = require('async');
var iStack = require('./immutableStack');

/**
 *  Conduits are functional processing pipelines assembled in a fork-join
 * task graph. Each task implements an asynchronous action that uses standard
 * node.js callback conventions, and data flows through pipelines by folding
 * a map in a graph traversal that respects the graph topological order.
 * Map entries are labelled with the originating task, enabling communication
 * between tasks. In particular, a 'parent' label is set before executing each
 * task to identify a natural data input for a task.
 *
 *  An error in any of the tasks aborts the traversal, returning in a callback
 * the error and previous results already in the map.
 *
 *  The structure and configuration of conduits can be serialized, and later
 * on, after parsing, can be bound  to a different set of implementation
 * methods. This simplifies uploading conduits (from the browser to a CA) in a
 * secure manner, and modify their behavior based on the execution context.
 *
 * Conduits are immutable data structures. Joins or concatenations always
 * creates a new conduit. Reusing pipeline elements never creates side-effects.
 *
 *
 */


var newToken = function(type, name, args, label, mArray) {
    var that =  { 'type': type, 'name' : name, 'args' : args, 'label' : label,
                  'children' : mArray};
    return that;
};

var newMethod = function(name, args, label) {
    return newToken('method', name, args, label, null);
};

var newSeq = function(mArray) {
    return newToken('seq', null, null, null, mArray);
};
var newPar = function(mArray) {
    return newToken('par', null, null, null, mArray);
};


var newConduit = function(methodNames, behavior, initStack) {
    var that  = initStack || iStack.newInstance();

    methodNames.forEach(function (name) {
                            that[name] = function(args, label) {
                                var m = newMethod(name, args, label);
                                return newConduit(methodNames, behavior,
                                                  that.__push__(m));
                            };
                        });

    var seqPar = function(n, f) {
        var nFrames = ((n > 2) ? n : 2);
        if (that.__length__() >= nFrames) {
            var mArray = [];
            var result = that;
            for (var i =0; i< nFrames; i++) {
                mArray.unshift(result.__peek__());
                result = result.__pop__();
            }
            var m = f(mArray);
            return newConduit(methodNames, behavior, that.__push__(m));
        } else {
            return null;
        }
    };

    that.__seq__ = function(n) {
        return seqPar(n, function(mArray) { return newSeq(mArray); });
    };

    that.__par__ = function(n)  {
        return seqPar(n, function(mArray) { return newPar(mArray); });
    };

    var super__push__ = that.__push__;
    
    that.__push__ = function(data) {
        if ((typeof data === 'object') && data.__peek__) {
            // assumed a conduit
            if (data.__length__() == 1) {
                return super__push__(data.__peek__());
            } else {
                throw new Error('Trying to push a not fully resolved conduit:'
                                + data.__stringify__());
            }
        } else {
            return super__push__(data);
        }
    };

    that.__behavior__ = function(actions) {
        return newConduit(methodNames, actions, that); 
    }; 
    

    /**
     * Serializes the structure and configuration of this conduit
     *
     */
    that.__stringify__ = function() {
        var result = {
            'methodNames' : methodNames,
            'tasks' : that.__map__(function(x) { return x;})
        };
        return JSON.stringify(result);
    };

    that.__fold__ = function(acc, cb) {

    };


};


var checkMethodNames = function(methodNames) {
    var allOK = true;
    methodNames.forEach(function(x) {
                            if (x.indexOf('__') === 0) {
                                allOK = false;
                            }
                        });
    return allOK;
};

/**
 * Factory method to create a conduit.
 *
 * @param {Array<string>} methodNames An array containing names for user
 * defined methods .
 *
 * @return {Object} A conduit.
 *
 */
var newInstance = exports.newInstance = function(methodNames) {
    if (checkMethodNames(methodNames)) {
        var that = newConduit(methodNames);
        return that;
    } else {
        throw new Error('Invalid method names:'
                        + JSON.stringify(methodNames));
    }
};


var parse = exports.parse = function(str) {
    var c = JSON.parse(str);
    var result = newInstance(c.methodNames);
    c.tasks.reverse().forEach(function (x) {
                                  result = result.__push__(x);
                              });
    return result;
};
