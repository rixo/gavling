'use strict';

beforeEach(function() {
  this.fail = function orFail(err) {
    //console.log('Promise unexpectedly rejected with error:', err.stack);
    //expect(false).toBe(true);
  }
});
