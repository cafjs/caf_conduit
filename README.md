# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF Lib Conduit

**UNDER CONSTRUCTION**

This repository contains a CAF lib to simplify the orchestration of asynchronous tasks that use standard node.js callback convention. Implements a fork/join functional paradigm using the `async` package. Uses a map to propagate results through the graph using a fold operation in depth-first reverse postordering, i.e., topological sort. Tasks can chose a unique label for its results and use the results of other tasks that happened-before. The parent task results are always available with label `parent`.

The structure and configuration of the fork-join task graph is serializable and can be late bound to a different method that implements the task. This is useful when, for example, we create a task graph in the browser that can be uploaded for execution by a CA, but could also be directly executed in the browser with a different implementation, e.g., using jQuery Ajax calls.

If any of the tasks returns a callback error task graph execution stops after propagating the callback error.



## API

To create a new conduit:

    var conduit = require('caf_conduit')
    // user method names that implement tasks
    var cnd = conduit.newConduit(['foo','bar']);
    // or from  a serialized string 
    var cnd2 = conduit.parseConduit(strCnd);
    
Adding new tasks:

    // first argument provide arguments for the invoked task
    // second argument, optional label for the results
    // returns a new conduit (a conduit object is immutable) 
    cnd = cnd.foo({arg1: 'whatever'}, 'foo1')
             .bar({otherArg: 'ddfd'}, 'myBar')
             .foo({arg1: 'other whatever'}, 'foo2')

Joining multiple conduits:

    // array of conduits
    var newCnd = cnd.__join__([cnd2])

Serializing a conduit :

    var newCndStr = newCnd.__stringify__()
    
Adding methods to implement tasks: 

    var actions = {
                    'foo' : function(ctx, cb) {
                      var whatever = (ctx.parent && ctx.parent.whatever) || 0;
                      var data = whatever + 1
                      // always use the callback to return data 
                      //  and the library adds the binding to ctx with err/data
                      cb(null, {'data': data})
                     },
                     'bar' : function(ctx, cb) {
                      ...
                     }
                   }
    newCnd = newCnd.__behavior__(actions)

Executing the task graph:

    newCnd.__fold__({}, function(err, data) {
                           // data 
    });
 
## Configuration Example

### framework.json

None


### ca.json

None
  
        
            
 
