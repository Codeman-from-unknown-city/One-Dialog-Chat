exports.createErrorTemplate = errMessage => `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <link rel="icon" href="./favicon.png" type="image/png">
    <title>ODC</title>
</head>
<body>
    <style>
        .err {
            margin-top: 40vh;
            text-align: center;
        }
    </style>
    <div class="err">
        <h1>${errMessage}</h1>
    </div>
</body>
</html>
`.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
