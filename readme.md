# callbag-rescue

Callbag higher-order operator that rescues a failed source. Works on either pullable or listenable sources.

`npm install callbag-rescue`

## examples

### listenables

After a failed promise, rescue with a new Callbag source:

```js
 const forEach = require('callbag-for-each');
 const fromPromise = require('callbag-from-promise');
 const fromIter = require('callbag-from-iter');
 const map = require('callbag-map');
 const pipe = require('callbag-pipe');
 const rescue = require('callbag-rescue'); 

pipe(
  fromPromise(Promise.reject({ status: 404 })),
  map((res) => res.body),
  rescue((err) => fromIter([ { type: 'ERROR', payload: err } ])),
  forEach((n) => {
    console.log(n); // { type: 'ERROR', payload: { status: 404 } }
  })
);
```

### pullables

After a source Callbag throws an error, rescue it:

```js
const forEach = require('callbag-for-each');
const fromIter = require('callbag-from-iter');
const mapWhen = require('callbag-map-when');
const pipe = require('callbag-pipe');

pipe(
  fromIter([1, 2]),
  mapWhen(() => true, (n) => n.a.name),
  rescue((err) => fromIter([ { type: 'ERROR', payload: err.message } ])),
  forEach((x) => {
    console.log(x); // { type: 'ERROR', payload: 'Cannot read property "name" of undefined' }
  })
);
```