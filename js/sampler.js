var context = new (window.AudioContext || window.webkitAudioContext)(),
    source,
    convolver = context.createConvolver(),
    verbGain = context.createGain(),
    dryGain = context.createGain(),
    fileReader = new FileReader(),
    audio;

function readFile(files) {
    fileReader.readAsArrayBuffer(files[0]);
    fileReader.onload = function (e) {
        playAudioFile(e.target.result);
        audio = fileReader.result;
        console.log(("Filename: '" + files[0].name + "'"), ( "(" + ((Math.floor(files[0].size / 1024 / 1024 * 100)) / 100) + " MB)" ));
    }
}
 function playAudioFile(file) {
     source = context.createBufferSource();
     context.decodeAudioData(file, function (buffer) {
         source.buffer = buffer;
         source.loop = true;
         source.connect(dryGain);
         dryGain.connect(context.destination);
     });
 }

window.onload = function() {
    document.getElementById('play').addEventListener('click', start_Audio);
    document.getElementById('stop').addEventListener('click', stop_Audio);
    document.getElementById('detune_Audio').addEventListener('change', function(){
        source.detune.value = this.value;
    });
};
function start_Audio() {
    
    source.start(0);
}

function stop_Audio() {
    source.stop(0);
    playAudioFile(audio);
}
