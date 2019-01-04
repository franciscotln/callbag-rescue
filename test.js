const test = require('tape');

const flatten = require('callbag-flatten');
const fromIter = require('callbag-from-iter');
const map = require('callbag-map');
const pipe = require('callbag-pipe');
const throwError = require('callbag-throw-error');

const rescue = require('./index');

const TYPES = {
  FUNCTION: 'function',
  NUMBER: 'number',
  OBJECT: 'object',
  STRING: 'string',
  UNDEFINED: 'undefined',
}
const rescuer = err => fromIter([{ type: 'ERROR', payload: err }]);

test('it rescues a pullable source', function (t) {
  t.plan(20);
  const upwardsExpected = [
    [0, TYPES.FUNCTION],
    [1, TYPES.UNDEFINED],
    [1, TYPES.UNDEFINED],
  ];
  const downwardsExpectedType = [
    [0, TYPES.FUNCTION],
    [1, TYPES.NUMBER],
    [1, TYPES.OBJECT],
    [2, TYPES.UNDEFINED],
  ];
  const ERROR = 'Error Thrown';
  const downwardsExpected = [
    1,
    { type: 'ERROR', payload: ERROR }
  ];

  function makeSource() {
    let sink;
    let sent = 0;
    return function source(type, data) {
      t.true(upwardsExpected.length > 0, 'source can be pulled');
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);

      if (type === 0) {
        sink = data;
        sink(0, source);
        return;
      }
      if (sent === 0) {
        sent++;
        sink(1, 1);
        return;
      }
      if (sent === 1) {
        sent++;
        sink(2, ERROR);
        return;
      }
    };
  }

  function makeSink() {
    let talkback;
    return function (type, data) {
      const et = downwardsExpectedType.shift();
      t.equals(type, et[0], 'downwards type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
        talkback(1);
        return;
      }
      if (type === 1) {
        const e = downwardsExpected.shift();
        t.isEquivalent(data, e, 'downwards data is expected: ' + e);
        return talkback(1);
      }
    };
  }

  rescue(rescuer)(makeSource())(0, makeSink());

  setTimeout(function () {
    t.pass('nothing else happens');
    t.end();
  }, 300);
});

test('it rescues an async finite listenable source', function (t) {
  t.plan(13);
  const upwardsExpected = [
    [0, TYPES.FUNCTION],
    [1, TYPES.UNDEFINED],
  ];
  const downwardsExpectedType = [
    [0, TYPES.FUNCTION],
    [1, TYPES.NUMBER],
    [1, TYPES.OBJECT],
  ];
  const ERROR = 'Error Thrown';
  const downwardsExpected = [
    1,
    { type: 'ERROR', payload: ERROR }
  ];

  function makeSource() {
    let sent = 0;
    return function source(type, data) {
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);
      if (type === 0) {
        const sink = data;
        const id = setInterval(function () {
          if (sent === 0) {
            sent++;
            sink(1, 1);
            return;
          }
          sink(2, ERROR);
          clearInterval(id);
        }, 100);
        sink(0, source);
      }
    };
  }

  function makeSink() {
    let talkback;
    return function (type, data) {
      const et = downwardsExpectedType.shift();
      t.equals(type, et[0], 'downwards type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
        talkback(1);
        return;
      }
      if (type === 1) {
        const e = downwardsExpected.shift();
        t.isEquivalent(data, e, 'downwards data is expected: ' + e);
      }
    };
  }

  rescue(rescuer)(makeSource())(0, makeSink());

  setTimeout(function () {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it returns a source that disposes upon upwards END (2)', function (t) {
  t.plan(10);
  const upwardsExpected = [
    [0, TYPES.FUNCTION],
    [2, TYPES.UNDEFINED]
  ];
  const downwardsExpectedType = [
    [0, TYPES.FUNCTION],
    [1, TYPES.NUMBER]
  ];
  const downwardsExpected = [1];

  function makeSource() {
    let sent = 0;
    let id;
    return function source(type, data) {
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);
      if (type === 0) {
        const sink = data;
        id = setInterval(function () {
          sink(1, ++sent);
        }, 100);
        sink(0, source);
      } else if (type === 2) {
        clearInterval(id);
      }
    };
  }

  function makeSink(type, data) {
    let talkback;
    return function (type, data) {
      const et = downwardsExpectedType.shift();
      t.equals(type, et[0], 'downwards type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
      }
      if (type === 1) {
        const e = downwardsExpected.shift();
        t.equals(data, e, 'downwards data is expected: ' + e);
      }
      if (downwardsExpected.length === 0) {
        talkback(2);
      }
    };
  }

  rescue(rescuer)(makeSource())(0, makeSink());

  setTimeout(function () {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it greets the sink only once', function(t) {
  t.plan(13);
  const downwardsExpectedType = [
    [0, TYPES.FUNCTION],
    [1, TYPES.NUMBER],
    [1, TYPES.NUMBER],
    [1, TYPES.NUMBER],
    [1, TYPES.NUMBER],
    [2, TYPES.UNDEFINED],
  ];
  const downwardsExpected = [1, 4, 5, 6, undefined];

  const makeSink = operation => source => {
    let talkback;
    source(0, (type, data) => {
      const et = downwardsExpectedType.shift();
      t.equals(type, et[0], "downwards type is expected: " + et[0]);
      t.equals(typeof data, et[1], "downwards data type is expected: " + et[1]);

      if (type === 0) talkback = data;
      if (type === 1 || type === 0) talkback(1);
    });
  };

  pipe(
    fromIter([1, 2, 3]),
    map(v => {
      if (v < 2) {
        return fromIter([v]);
      }
      return throwError("err");
    }),
    flatten,
    rescue(() => fromIter([4, 5, 6])),
    makeSink()
  );

  setTimeout(function() {
    t.pass("nothing else happens");
    t.end();
  }, 700);
});
