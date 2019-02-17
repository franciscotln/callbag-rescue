/**
 * @name rescue
 * @param {Function} f A function that returns a Callbag
 * @returns {Function} A function of the source Callbag
 */

const rescue = f => source => (start, sink) => {
  if (start !== 0) return;

  let rescued = false;
  let sourceTalkback;

  const talkback = (t, d) => {
    sourceTalkback(t, d);
  }

  const innerSink = (t, d) => {
    if (t === 0) {
      sourceTalkback = d;

      if (rescued) {
        talkback(1);
        return;
      }

      sink(t, talkback);
      return;
    }

    if (t !== 2 || d == null || rescued) {
      sink(t, d);
      return;
    }

    rescued = true;

    try {
      const newSource = f(d);
      newSource(0, innerSink);
    } catch (e) {
      sink(2, e);
    }
  };

  source(start, innerSink);
};

module.exports = rescue;
