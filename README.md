# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF Lib Conduit

**UNDER CONSTRUCTION**

  Conduits are functional processing pipelines assembled in a series-parallel
 task graph. Each task implements an asynchronous action that uses standard
 node.js callback conventions, and data flows through pipelines by folding
 a map in a graph traversal that respects task dependencies.
 Map entries are labelled with the originating task, enabling communication
 between tasks. Unique labels can be chosen by the application or
 assigned by the library.  

  An error in any of the tasks aborts the traversal, returning in a callback
 this error and previous results already in the map.

  The structure and configuration of conduits can be serialized, and later
 on, after parsing, can be bound  to a different set of implementation
 methods. This simplifies uploading conduits (from the browser to a CA) in a
 secure manner, and modify their behavior based on the execution context.

## API

 Conduits are immutable data structures and reusing pipeline elements
 never creates side-effects. Task graphs are built using a stack,
 similar to an HP calculator with reverse polish notation (RPN), but only
 two operators `__seq__(n)` and `__par__(n)`. For example:
 
    var conduit = require('caf_conduit')
    
    // declare method names that implement tasks
    c = conduit.newInstance(['foo','bar'])
    
    // first argument provides arguments for the invoked task
    // second argument, an optional label for the results
    // returns a new conduit (a conduit object is immutable) 
    c = c.foo({'arg':1}, 'fx0')
         .foo({'arg':2, 'prev': 'fx0'}, 'fx1')
         .foo({'arg':4, 'prev': 'fx1'}, 'fx2')
         .__seq__(3)
         .bar({'arg':2}, 'bx')
         .bar({'arg':4}, 'b1x')
         .__seq__()
         .__par__()
               
 will execute in parallel to sequences of 3 foos and 2 bars.
 
And this can be composed with another conduit as follows:
 
    b = conduit.newInstance(['foo','bar'])
    b = b.foo({'arg':1}, 'ffx')
         .__push__(c)
         .__seq__()  


Serializing a conduit:

    var st = b.__stringify__()
    var c = conduit.parse(st);
     
Adding methods to implement tasks: 

    var actions = {
                    'foo' : function(acc, args, cb) {
                      // acc should be treated as read-only
                      //
                      // Note that args.prev should `happened-before` this task
                      var whatever = (args.prev && acc[args.prev] && 
                                      acc[args.prev].data &&
                                      acc[args.prev].data.whatever) || 0;
                      // Never use `return xx`, use the callback to return.
                      // New `whatever` will be added to acc by this library.
                      cb(null, {'whatever': whatever + 1})
                     },
                     'bar' : function(ctx, args, cb) {
                      ...
                     }
                   }
    b = b.__behavior__(actions)

Executing the task graph:

    var acc = {}
    b.__fold__(acc, function(err, data) {
                        // data refers to `acc` with a new entry for each
                        //  task (key is the given label or a unique string,
                        //        value is {err: <err>, data: <whatever>})
    });
 
## Configuration Example

### framework.json

None


### ca.json

None
  
        
            
 
