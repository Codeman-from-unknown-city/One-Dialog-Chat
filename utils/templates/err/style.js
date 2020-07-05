const minify = require('../../minify.js');

module.exports = minify(`
        .err {
            margin-top: 35vh;
            text-align: center;
        }
        .return {
            text-decoration: none;
            color: #e53935;
        }
`, 'css');