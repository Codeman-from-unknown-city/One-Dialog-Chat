module.exports = (file, ext) => {
    let minifyFile;

    switch(ext) {
        case 'css':
            minifyFile = file.replace(/(\W)\s+(\D)/g, '$1$2').replace(/(\W)\s+(.)/g, '$1$2').replace(/(\w)\s+(\W)/g, '$1$2');
            break;

        case 'html':
            minifyFile = file.replace(/\s+/g, ' ').replace(/> </g, '><');
            break;

        default:
            return file;
    }
    
    return minifyFile.trim();
}