const { app, BrowserWindow } = require('electron');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({ 
    width: 800, 
    height: 600, 
    webPreferences:{
      nodeIntegration: true
    },
    icon: path.join(__dirname, 'resources/icons/icon-1024.png')
  })
  // and load the index.html of the app.
  win.loadFile('index.html')

  // Open the DevTools.
  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


// Define constants
const ipcMain = require('electron').ipcMain;
const isDev = require('electron-is-dev');
const path = require('path');
const { platform } = require('os');
const realPlat = getPlatform().toString();
const root = process.cwd();
const spawn = require('child_process').spawn;
const assert = require('assert');
const fs = require('fs');
const {chunksToLinesAsync, chomp} = require('@rauschma/stringio');


// Define variables
var binariesPath = path.join("./resources","./bin");
var input ="";
var output = "";
var cwebpShellScript = "";
var quality = "";
var alphaQuality = "";
var cMethod = "";
var segments = "";
var sns = "";
var mt = " -mt ";
var af = "";
var targetSize = "";
var alphaFilter = " -alpha_filter best ";
var lossless = "";
var filterStrength = "";
var filterSharp = "";
var proc = spawn;
var isConvertedWebP = "";
var maxPSNR = "";
var PSNR = "";
var passes = "";
var JPEGLike = "";
var preset = "";
var nearLossless = "";


// Define OS platform in order to load required executables
function getPlatform(){
  switch (platform()) {
    case "aix":
    case "freebsd":
    case "linux":
    case "openbsd":
    case "android":
      return "linux";
    case "darwin":
    case "sunos":
      return "mac";
    case "win32":
      return "win";
  }
}

// Log platform to console
console.log("Platform: "+realPlat);

// Is electron app in developer mode or is it packaged?
if (isDev) {
  console.log('Running in Development Mode');
  binariesPath = path.join(root, "./resources",realPlat,"./bin");
} 
else{
  console.log('Running in development Production Mode');
}

// Define dependent costants
const cwebpPath  = '"'+path.resolve(path.join(binariesPath, "./cwebp"))+'"';

// Log determined path to cwebp.exe
console.log("Location of cwebp.exe: "+cwebpPath);

ipcMain.on('fileSize',(event, filePath) =>{
  var fileStats = fs.statSync(filePath);
  event.returnValue = fileStats['size'];
});

ipcMain.on('maxPSNR',(event, value) =>{
  var psnrCMD = cwebpPath+" "+value+" -q 100 -m 6 -psnr 10000 -print_psnr -short";
  proc = spawn(psnrCMD,[],{ 
    shell: true,
    stdio:['pipe', 'pipe', 'pipe','pipe','pipe']
  });

  proc.stderr.on('data', (data) => {
    var data = data.toString();
    maxPSNR = data.split(" ");
    console.log(`stderr: ${data}`);
    console.log('maxPSNR: '+maxPSNR[2]);
    maxPSNR[2] = parseInt(maxPSNR[2]);
    console.log('Sending maxPSNR: '+maxPSNR[2]);
    event.returnValue = maxPSNR[2];
  });
});

// Detect ipcMain data recived and assign data to variable
ipcMain.on('inputPath',function(e,inputPath){input = inputPath;});

ipcMain.on('lossless',function(e,losslessValue){
  if(losslessValue=="true"){
    lossless = ' -lossless -exact ';
    console.log('Mode: Lossless');
  }
  else {
    lossless='';
    console.log('Mode: Lossy');
  }
});

ipcMain.on('quality',function(e,qualityValue){quality = ' -q '+qualityValue; console.log('Quality Recieved: '+quality);});

ipcMain.on('alphaQuality',function(e,alphaQualityValue){alphaQuality = ' -alpha_q '+alphaQualityValue; console.log('Alpha Quality Recieved: '+alphaQuality);});

ipcMain.on('cMethod',function(e,cMethodValue){cMethod = ' -m '+cMethodValue; console.log('Compression Method Recieved: '+cMethod);});

ipcMain.on('segments',function(e,segmentsValue){segments = ' -segments '+segmentsValue; console.log('Number of Segments Recieved: '+segments);});

ipcMain.on('targetSize',function(e,targetSizeValue){targetSize = ' -size '+targetSizeValue; console.log('Target File Size Recieved: '+targetSize);});

ipcMain.on('sns',function(e,snsValue){sns = ' -sns '+snsValue; console.log('Spatial Noise Shaping Recieved: '+sns);});

ipcMain.on('isAF',function(e,filterTypeValue){
  if(lossless != ' -lossless -exact ' && filterTypeValue != 'simple' && filterTypeValue != 'strong'){
    af = " -af ";
  }
  else if(filterTypeValue == 'simple'){
    af = " -nostrong ";
  }
  else{
    af = " -strong ";
  }
});

ipcMain.on('filterStrength',function(e,filterStrengthValue){filterStrength = ' -f '+filterStrengthValue; console.log('Filter Strength Recieved: '+filterStrength);});

ipcMain.on('filterSharp',function(e,filterSharpValue){filterSharp = ' -sharpness '+filterSharpValue; console.log('Filter Strength Recieved: '+filterSharp);});

ipcMain.on('PSNR',function(e,PSNRValue){PSNR = ' -print_psnr -psnr '+PSNRValue; console.log('PSNR Recieved: '+PSNR);});

ipcMain.on('passes',function(e,passesValue){passes = ' -pass '+passesValue; console.log('PSNR Recieved: '+passes);});

ipcMain.on('JPEGLike',function(e,JPEGLikeValue){
  if(JPEGLikeValue == "true"){
    JPEGLike = ' -jpeg_like ';
  }
});

ipcMain.on('preset',function(e,presetValue){
  preset = ' -preset '+presetValue;
  alphaFilter = "";
});

ipcMain.on('nearLossless',function(e,nearLosslessValue){
  nearLossless = ' -near_lossless '+nearLosslessValue;
});


// Detect ipcMain data recived and assign it to a variable
// Because it is know that this data will be send last we can
// execute shell functions to cwebp
ipcMain.on('outputPath',function(e,outputPath){

  // The final output path is (the user selected directory)+(the original file name)+.webp extention
  output = path.join(outputPath,"\\"+path.basename(input,path.extname(input))+".webp");

  // Log the final input and final output for debuging
  console.log('Input File: '+input);
  console.log('Output File: '+output);

  // Bring all inputs together into a shell script
  cwebpShellScript = [preset+nearLossless+JPEGLike+lossless+af+mt+filterStrength+filterSharp+alphaFilter+quality+alphaQuality+cMethod+segments+targetSize+PSNR+passes+sns+' "'+input+'"'+' -o "'+output+'"'];

  // Send the shell script the convert function
  convertToWebp(cwebpShellScript);
});


// Pass defined shell script to cwebp.exe
async function convertToWebp(cwebpShellScript){
  var sout;

  // Log the exact script being passes to cwebp.exe
  console.log("Cwebp.exe Shell Script: "+cwebpPath+cwebpShellScript.toString());

  // Make sure that the script is a string
  var webpCMD = cwebpPath+cwebpShellScript.toString();

  // Create a data stream with cwebp.exe
  proc = spawn(webpCMD,[],{ 
    shell: true,
    stdio:['pipe', 'pipe', 'pipe','pipe','pipe']
  });

  proc.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  proc.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });
  
  proc.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    isConvertedWebP = code;
    resetWebpScript();
  });
}

ipcMain.on('isConverted', (event, arg) => {  
  console.log("Conversion Type: "+arg);   // Print Im the message from the renderer
  if(arg == 'webp'){
    var j = 0;
    var k = 60;
    for (var i = 1; i <= k; i++) {
      var tick = function(i) {
          return function() {
              if(isConvertedWebP != '0'){
              }
              else{
                if(j == 0){event.returnValue = isConvertedWebP.toString(); j=1;}
                if(i == k && j == 0){event.returnValue = isConvertedWebP.toString(); j=1;}
              }
          }
      };
      if(j==0){setTimeout(tick(i), 1000 * i);}
      else{
        console.log("Return Value: "+event.returnValue);
        return;
      }
    }
  }
});

function resetWebpScript(){
  input ="";
  output = "";
  cwebpShellScript = "";
  quality = "";
  alphaQuality = "";
  cMethod = "";
  segments = "";
  sns = "";
  mt = " -mt ";
  af = "";
  targetSize = "";
  alphaFilter = " -alpha_filter best ";
  lossless = "";
  filterStrength = "";
  filterSharp = "";
  console.log("Webp Shell Script Reset.");
}

ipcMain.on('clear',function(e,type){
  if(type == "webp"){
    resetWebpScript();
  }
});