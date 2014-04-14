var cnd = require('caf_conduit');

var c = cnd.newInstance(['foo','bar']);
    
c = c.foo({'arg':1}, 'fx0')
         .foo({'arg':2, 'prev': 'fx0'}, 'fx1')
         .foo({'arg':4, 'prev': 'fx1'}, 'fx2')
         .__seq__(3)
         .bar({'arg':2}, 'bx')
         .bar({'arg':4}, 'b1x')
         .__seq__()
         .__par__();

var b = cnd.newInstance(['foo','bar']);
b = b.foo({'arg':1}, 'ffx')
    .__push__(c)
    .__seq__();  
 
var actions = {
    'foo' : function(acc, args, cb) {
        var whatever = (args.prev && acc[args.prev] && 
                        acc[args.prev].data &&
                        acc[args.prev].data.whatever) || 0;
        setTimeout(function() {
                       console.log('foo' + whatever);
                       cb(null, {'whatever': whatever + 1});
                   }, 5000* Math.random());
    },
    'bar' : function(acc, args, cb) {
        console.log('bar' + args.arg);
        cb(null, {'bar': args});
    }
};


var st = b.__stringify__();
b = cnd.parse(st);

b = b.__behavior__(actions);

var acc = {};
b.__fold__(acc, function(err, data) {
               console.log('Got error' + err + ' data:' + JSON.stringify(data));
           });
