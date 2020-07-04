const minify = require('../../minify.js');
const head = require('./head');
const styles = require('./style');

module.exports = errMessage => minify(`
<!DOCTYPE html>
<html lang="en">
${head}
<body>
    <style>${styles}</style>
    <div class="err">
        <h1>${errMessage}</h1>
    </div>
</body>
</html>
`, 'html');
