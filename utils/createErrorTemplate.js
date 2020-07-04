const head = require('./head').htmlPart;
const style = require('./style').htmlPart;

exports.createErrorTemplate = errMessage => `
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
