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
var tasks = require('./tasks');

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




var constructor = function(methodNames, defTasks) {
    var that = {};

    
    var tasks = defTasks || []; 

    that.__concat__ = function(newTask) {
        var clonedTasks = tasks.slice(0);
        clonedTasks.push(newTask);
        return constructor(methodNames, clonedTasks);
    };


    /**
     * Joins several conduits by introducing a synchronization barrier.
     * 
     * @param {Array<Object>} conduits An array of conduits to be joined.
     *
     */
    that.__join__ = function(conduits) {
        var newJoin = genJoinTask.constructor(conduits);
        return that.__concat__(newJoin);
    }; 

    /** 
     * Serializes the structure and configuration of this conduit
     * 
     */
    that.__stringify__ = function() {
        var toConfig = function() {
            var result = {
                'methodNames' : methodNames,
                'tasks' : tasks.map(function(x) { 
                                        return x.toConfig();
                                    })
            };
            return result;
        };
        return JSON.stringify(toConfig());
    };

    that.__fold__ = function(acc, cb) {

    };   


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
    
    var that = constructor(methodNames); 
    return that;
};
