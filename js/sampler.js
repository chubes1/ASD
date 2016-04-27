var context = new window.AudioContext(),
    source= context.createBufferSource();


function readFile(files) {
    var fileReader = new FileReader();
    fileReader.readAsArrayBuffer(files[0]);
    fileReader.onload = function (e) {
        playAudioFile(e.target.result);
        console.log(("Filename: '" + files[0].name + "'"), ( "(" + ((Math.floor(files[0].size / 1024 / 1024 * 100)) / 100) + " MB)" ));
    }
}
 function playAudioFile(file) {
     context.decodeAudioData(file, function (buffer) {
         source.buffer = buffer;
         source.loop = true;
     });
 }

window.onload = function() {
    document.getElementById('play').addEventListener('click', start_Audio);
    document.getElementById('stop').addEventListener('click', stop_Audio);
};
function start_Audio() {
    source.detune.value = 1200;
    source.playbackRate.value = 0.5;
    source.connect(context.destination);
    source.start(0);
}

function stop_Audio() {
    source.stop(0);
}

