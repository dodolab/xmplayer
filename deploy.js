var fs = require('fs');
var path = require('path');

function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index){
        var curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  };

function copyFileSync(source, target) {

    var targetFile = target;

    //if target is a directory a new file with the same name will be created
    if ( fs.existsSync( target ) ) {
        if ( fs.lstatSync( target ).isDirectory() ) {
            targetFile = path.join( target, path.basename( source ) );
        }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source, target ) {
    var files = [];

    //check if folder needs to be created or integrated
    var targetFolder = path.join( target, path.basename( source ) );
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder );
    }

    //copy
    if (fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                copyFileSync( curSource, targetFolder );
            }
        } );
    }
}

// ============================ DEPLOYMENT SCRIPT =====================================

// copy assets folder into dist folder
deleteFolderRecursive('dist');
fs.mkdirSync('dist');

copyFolderRecursiveSync('assets', 'dist');

// create json file from all mod files
let modPath = 'dist/assets/mods';

let mods = fs.readdirSync(modPath);
let modStruct = [];

mods.forEach((file)  => {
    let filePath = path.join(modPath, file);
    let size = fs.lstatSync(filePath).size;
    let name = file;

    modStruct.push({
        name: name,
        size: size,
        path:  'assets/mods/' + file
    });
});

let jsonFile = JSON.stringify(modStruct); 
fs.writeFile('dist/assets/files.json', jsonFile, () => {}); 