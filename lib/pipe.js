
const oneminute = 1 * 60e3;

/**
 * replay a promise function
 * @param {() => Promise<any>} generator 
 * @param {number} timeout 
 */
function replay(generator, timeout = oneminute) {
    let value;
    let ts;
    return function () {
        if (value) {
            if (Date.now() - ts < timeout) {
                return Promise.resolve(value);
            }
            value = null;
            ts = 0;
        }
        return generator.apply(null, arguments).then(d => {
            value = d;
            ts = Date.now();
            return d;
        });
    }
}

module.exports = {
    replay
}
