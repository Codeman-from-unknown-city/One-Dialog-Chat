const minify = require('../../minify.js');

module.exports = minify(`
        .err {
            margin-top: 40vh;
            text-align: center;
        }
`, 'css');