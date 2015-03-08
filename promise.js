(function () {
	"use strict";

	var STATES = {
		PENDING: 'p',
		FULFILLED: 'f',
		REJECTED: 'r'
	};

	var isFunction = function (obj) {
		return obj && typeof obj === 'function';
	};

	var isObject = function (obj) {
		return obj && typeof obj === 'object';
	};

	var callWith = function () {
		var args = [].slice.call(arguments, 0);
		return function (fn) {
			return fn.apply(null, args);
		};
	};

	var when = function (condition, fn) {
		return function () {
			if (condition()) {
				return fn.apply(null, arguments);
			}
		};
	};

	var promise = function (fn) {
		var state = STATES.PENDING,
			successCallbacksQueue = [],
			errorCallbacksQueue = [],
			value,
			reason;
		
		var then = function (successCallback, errorCallback) {
			var hasSuccessCallback = isFunction(successCallback);
			var hasErrorCallback = isFunction(errorCallback);

			return promise(function(resolve, reject) {
				var onFulfill = function (value) {
					try {
						if (hasSuccessCallback) {
							resolve(successCallback(value));
						} else {
							resolve(value);
						}
					} catch (ex) {
						reject(ex);
					}
				};
				var onReject = function (reason) {
					try {
						if (hasErrorCallback) {
							resolve(errorCallback(reason));
						} else {
							reject(reason);
						}
					} catch (ex) {
						reject(ex);
					}
				};

				if (state === STATES.PENDING) {
					successCallbacksQueue.push(onFulfill);
					errorCallbacksQueue.push(onReject);
				} else if (state === STATES.FULFILLED) {
					setTimeout(onFulfill.bind(null, value), 0);
				} else if (state === STATES.REJECTED) {
					setTimeout(onReject.bind(null, reason), 0);
				}
			});
		};

		var isInState = function (validState) {
			return function () {
				return validState === state;
			};
		};

		var resolve = when(isInState(STATES.PENDING), function (promiseValue) {
			var doResolve = function (promiseValue) {
				state = STATES.FULFILLED;
				value = promiseValue;
				setTimeout(function () {
					successCallbacksQueue.forEach(callWith(value));
				}, 0);
			};
			var handled = false;

			if (promiseValue === self) {
				reject(new TypeError());
			} else if (!isFunction(promiseValue) && !isObject(promiseValue)) {
				doResolve(promiseValue);
			} else {
				try {
					var then = promiseValue.then;
					if (isFunction(then)) {
						then.call(promiseValue, function(promiseValue) {
							if (!handled) {
								resolve(promiseValue);
								handled = true;
							}
						}, function (reason) {
							if (!handled) {
								reject(reason);
								handled = true;
							}
						});
					} else {
						doResolve(promiseValue);
						handled = true;
					}
				} catch (ex) {
					if (!handled) {
						reject(ex);
					}
				}
			}
		});

		var reject = when(isInState(STATES.PENDING), function (rejectReason) {
			state = STATES.REJECTED;
			reason = rejectReason;
			setTimeout(function () {
				errorCallbacksQueue.forEach(callWith(reason));
			}, 0);
		});

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