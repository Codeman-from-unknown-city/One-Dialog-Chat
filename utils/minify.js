module.exports = (file, ext) => {
    switch(ext) {
        case 'css':
            return file.replace(/(\W)\s+(\D)/g, '$1$2').replace(/(\W)\s+(.)/g, '$1$2').replace(/(\w)\s+(\W)/g, '$1$2');

        case 'html':
            return file.replace(/\s+/g, ' ').replace(/> </g, '><').trim();

        default:
            return file;
    }
}