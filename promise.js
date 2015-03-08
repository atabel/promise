(function () {
	'use strict';

	var STATES = {
		PENDING: 'p',
		FULFILLED: 'f',
		REJECTED: 'r'
	};

	var is = function (type, obj) {
		return obj && typeof obj === type;
	};

	var isFunction = is.bind(null, 'function');
	var isObject = is.bind(null, 'object');
	
	var onceGroup = function () {
		var executed = false;
		return function (fn) {
			return function () {
				if (!executed) {
					executed = true;
					fn.apply(null, arguments);
				}
			};
		};
	};

	var promise = function (fn) {
		var state = STATES.PENDING,
			callbacksQueue = {},
			value;

		callbacksQueue[STATES.FULFILLED] = [];
		callbacksQueue[STATES.REJECTED] = [];
		
		var then = function (successCallback, errorCallback) {
			return promise(function(resolve, reject) {
				var safeCb = function (cb, fallBack, promiseValue) {
					try {
						if (isFunction(cb)) {
							resolve(cb(promiseValue));
						} else {
							fallBack(promiseValue);
						}
					} catch (ex) {
						reject(ex);
					}
				};
				var onFulfill = safeCb.bind(null, successCallback, resolve);
				var onReject = safeCb.bind(null, errorCallback, reject);

				if (state === STATES.PENDING) {
					callbacksQueue[STATES.FULFILLED].push(onFulfill);
					callbacksQueue[STATES.REJECTED].push(onReject);
				} else if (state === STATES.FULFILLED) {
					setTimeout(onFulfill.bind(null, value), 0);
				} else if (state === STATES.REJECTED) {
					setTimeout(onReject.bind(null, value), 0);
				}
			});
		};

		var transitionTo = function (newState, promiseValue) {
			if (state === STATES.PENDING) {
				state = newState;
				value = promiseValue;
				setTimeout(function () {
					callbacksQueue[state].forEach(function (cb) {
						cb(value);
					});
				}, 0);
			}
		};

		var resolve = function (promiseValue) {
			var doResolve = transitionTo.bind(null, STATES.FULFILLED);

			if (promiseValue === self) {
				reject(new TypeError());
			} else if (!isFunction(promiseValue) && !isObject(promiseValue)) {
				doResolve(promiseValue);
			} else {
				var onlyOne = onceGroup();
				try {
					var then = promiseValue.then;
					if (isFunction(then)) {
						then.call(promiseValue, onlyOne(resolve), onlyOne(reject));
					} else {
						doResolve(promiseValue);
					}
				} catch (ex) {
					onlyOne(reject)(ex);
				}
			}
		};

		var reject = transitionTo.bind(null, STATES.REJECTED);

		if (fn) {
			fn(resolve, reject);
		}

		var self = {
			then: then,
			catch: then.bind(this, null),
			resolve: resolve,
			reject: reject
		};

		return self;
	};

	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		define(function() {
			return promise;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = promise;
	} else {
		window.promise = promise;
	}

})();