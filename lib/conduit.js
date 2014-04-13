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
 *  Conduits are functional processing pipelines assembled in a series-parallel
 * task graph. Each task implements an asynchronous action that uses standard
 * node.js callback conventions, and data flows through pipelines by folding
 * a map in a graph traversal that respects the graph topological order.
 * Map entries are labelled with the originating task, enabling communication
 * between tasks. Unique labels can be chosen by the application or
 * assigned by the library.  
 *
 *  An error in any of the tasks aborts the traversal, returning in a callback
 * this error and previous results already in the map.
 *
 *  The structure and configuration of conduits can be serialized, and later
 * on, after parsing, can be bound  to a different set of implementation
 * methods. This simplifies uploading conduits (from the browser to a CA) in a
 * secure manner, and modify their behavior based on the execution context.
 *
 * Conduits are immutable data structures and reusing pipeline elements
 * never creates side-effects. Task graphs are built using a stack,
 * similar to an HP calculator with reverse polish notation, but only
 * two operators __seq__(n) and __par__(n). For example:
 * 
 *          c = newInstance(['foo','bar'])
 *          c = c.foo({'arg':1}, 'fx')
 *               .foo({'arg':2, 'other' : 'qqq'}, 'fx1')
 *               .foo({'arg':4}, 'fx3')
 *               .__seq__(3)
 *               .bar({'arg':2}, 'bx')
 *               .bar({'arg':4}, 'b1x')
 *               .__seq__()
 *               .__par__()
 * will execute in parallel to sequences of 3 foos and 2 bars.
 * 
 * And this can be composed with another conduit as follows:
 * 
 *          b = newInstance(['foo','bar'])
 *          b = b.foo({'arg':1}, 'ffx')
 *               .__push__(c)
 *               .__seq__()  
 *
 */

var METHOD='method';
var SEQ='seq';
var PAR='par';
          
var newToken = function(type, name, args, label, mArray) {
    var that =  { 'type': type, 'name' : name, 'args' : args, 'label' : label,
                  'children' : mArray};
    return that;
};

var newMethod = function(name, args, label) {
    return newToken(METHOD, name, args, label, null);
};

var newSeq = function(mArray) {
    return newToken(SEQ, null, null, null, mArray);
};

var newPar = function(mArray) {
    return newToken(PAR, null, null, null, mArray);
};


var counterF = function(prefix) {
    var count = 0;
    return function() {
        var result = prefix + count;
        count = count + 1;
        return result;
    };
};

var nextId = counterF('id_');

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
            return newConduit(methodNames, behavior, result.__push__(m));
        } else {
            throw new Error('not enough frames' + that.__length__() + ' < '
                            + nFrames);
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
                return newConduit(methodNames, behavior, 
                                  super__push__(data.__peek__()));
            } else {
                throw new Error('Trying to push a not fully resolved conduit:'
                                + data.__stringify__());
            }
        } else {
            return newConduit(methodNames, behavior, super__push__(data));
        }
    };

    var super__pop__ = that.__pop__;    
    that.__pop__ = function() {
        return newConduit(methodNames, behavior, super__pop__());
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

    var foldImpl = function(acc, data, cb) {
        var buildChildren = function(children) {
            return children.map(function(child) {
                                    return function(cb0) {
                                        foldImpl(acc, child, cb0);
                                    };
                                });
        };
        switch (data.type) {
        case SEQ:
            async.series(buildChildren(data.children), cb);
            break;
        case PAR:
            async.parallel(buildChildren(data.children), cb);
            break;
        case METHOD:
            if (typeof behavior[data.name] !== 'function') {
                throw new Error('behaviour  not defined for method ' 
                                + data.name); 
            }
            var id = data.label || nextId();
            if (acc[id]) {
                throw new Error('Duplicate label in the task graph: ' + id); 
            } 
            var cb1 = function(err, res) {
                acc[id] = {'err': err, 'data' : res};
                // res propagated with acc
                cb(err);
            };
            behavior[data.name](acc, data.args, cb1);
            break;
        default:
            throw new Error('Unknown type ' + data.type);
        } 
    };

    that.__fold__ = function(acc, cb) {
        var results = acc || {};
        if (that.__length__() !== 1) {
            throw new Error('Not fully resolved:' + that.__stringify__);   
        }
        if (typeof behavior !== 'object') {
            throw new Error('No behavior in fold.');
        }
        var cb1 = function(err, res) {
            cb(err, acc);
        };
        foldImpl(results,  that.__peek__(),  cb1);
    };

    return that;
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
