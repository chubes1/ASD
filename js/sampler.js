var context = new (window.AudioContext || window.webkitAudioContext)(),
    source,
    wetGain = context.createGain(),
    dryGain = context.createGain(),
    fileReader = new FileReader(),
    audio;

    dryGain.gain.value = 1;
    wetGain.gain.value = 0;
    wetGain.connect(context.destination);
    dryGain.connect(context.destination);

function readAudioFile(files) {
    fileReader.readAsArrayBuffer(files[0]);
    fileReader.onload = function (e) {
        playAudioFile(e.target.result);
        audio = fileReader.result;
        document.getElementById('play').disabled=false;
        console.log(("Filename: '" + files[0].name + "'"), ( "(" + ((Math.floor(files[0].size / 1024 / 1024 * 100)) / 100) + " MB)" ));
    }
}
 function playAudioFile(file) {
     source = context.createBufferSource();
     context.decodeAudioData(file, function (buffer) {
         source.buffer = buffer;
         source.loop = true;
         source.connect(dryGain);
         source.connect(reverb);
         reverb.connect(wetGain);
     });
 }

window.onload = function() {
    document.getElementById('play').disabled=true;
    document.getElementById('stop').disabled=true;
    document.getElementById('detune_Audio').disabled=true;
    document.getElementById('play').addEventListener('click', start_Audio);
    document.getElementById('stop').addEventListener('click', stop_Audio);
    document.getElementById('detune_Audio').addEventListener('input', function(){
        source.detune.value = this.value*100;
        document.querySelector('#detune_Audio_Value').value = this.value + " Semitones";
    });
    document.getElementById('reverb_Amount').addEventListener('input', function(){
        dryGain.gain.value = 1 - this.value/100;
        wetGain.gain.value = this.value/100;
        document.querySelector('#reverb_Amount_Value').value = this.value + "%";
    });
};
function start_Audio() {
    source.start(0);
    document.getElementById('play').disabled=true;
    document.getElementById('stop').disabled=false;
    document.getElementById('detune_Audio').disabled=false;
}

function stop_Audio() {
    source.stop(0);
    convolver.disconnect();
    playAudioFile(audio);
    document.getElementById('stop').disabled=true;
    document.getElementById('play').disabled=false;
    document.getElementById('detune_Audio').disabled=true;
    document.getElementById('detune_Audio').value = 0;
    document.getElementById('detune_Audio_Value').value = 0 + " Semitones";
}

var reverb = (function() {
    var convolver = context.createConvolver(),
        noiseBuffer = context.createBuffer(2, 0.5 * context.sampleRate, context.sampleRate),
        left = noiseBuffer.getChannelData(0),
        right = noiseBuffer.getChannelData(1);
    for (var i = 0; i < noiseBuffer.length; i++) {
        left[i] = Math.random() * 2 - 1;
        right[i] = Math.random() * 2 - 1;
    }
    convolver.buffer = noiseBuffer;
    return convolver;
})();