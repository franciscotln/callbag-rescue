/**
 * @name rescue
 * @param {Function} f A function that returns a Callbag
 * @returns {Function} A function of the source Callbag
 */

const rescue = f => source => (start, sink) => {
  start === 0 && source(start, (t, d) => {
    if (t === 2 && d != null) {
      try {
        const newSource = f(d);
        newSource(start, sink);
      } catch (e) {
        sink(2, e);
      }
    } else {
      sink(t, d);
    }
  });
};

module.exports = rescue;