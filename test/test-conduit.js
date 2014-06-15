var conduit = require('../index');

exports['create'] = function (test) {
    var c = conduit.newInstance(['foo','bar']);
    test.ok(c, 'Cannot create conduit. ');
    test.done();
};
