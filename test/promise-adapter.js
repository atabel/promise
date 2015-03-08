var promise = require('../promise');

var deferred = function () {
	var myPromise = promise();
	return {
		promise: myPromise,
		resolve: myPromise.resolve,
		reject: myPromise.reject
	};
};

module.exports = {
	deferred: deferred
};