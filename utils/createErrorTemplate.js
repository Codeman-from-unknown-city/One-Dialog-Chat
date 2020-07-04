const head = require('./head');
const style = require('./style');

module.exports = errMessage => `
<!DOCTYPE html>
<html lang="en">
${head}
<body>
    ${style}
    <div class="err">
        <h1>${errMessage}</h1>
    </div>
</body>
</html>
`.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
