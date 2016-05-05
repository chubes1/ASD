var context = new (window.AudioContext || window.webkitAudioContext)(),
    source,
    impulseSource,
    convolver = context.createConvolver();
console.log(convolver);
    var wetGain = context.createGain(),
        dryGain = context.createGain(),
        fileReader = new FileReader(),
        audio,
        impulseAudio,
        bufferSize = 4096,
        node = context.createScriptProcessor(bufferSize, 1, 1);

    dryGain.gain.value = 1;
    wetGain.gain.value = 1;
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
     mix(1);
     source = context.createBufferSource();
     context.decodeAudioData(file, function (buffer) {
         source.buffer = buffer;
         source.loop = true;
         source.connect(effect);
         effect.connect(wetGain);
     });
 }

function readImpulseFile(files) {
    fileReader.readAsArrayBuffer(files[0]);
    fileReader.onload = function (e) {
        loadImpulse(e.target.result);
        impulseAudio = fileReader.result;
        console.log(("Filename: '" + files[0].name + "'"), ( "(" + ((Math.floor(files[0].size / 1024 / 1024 * 100)) / 100) + " MB)" ));
    }
}
function loadImpulse(file) {
    impulseSource = context.createBufferSource();
        context.decodeAudioData(file, function (buffer) {
            impulseSource.buffer = buffer;
            convolver.buffer = impulseSource.buffer;
        },
            function(e){"Error with decoding audio data" + e.err});
    convolver.connect(wetGain);
    console.log(convolver);
    }

var mix = function(value) {
    dryGain.gain.value = ( 1.0 - value );
    wetGain.gain.value = value;
};

window.onload = function() {
    document.getElementById('play').disabled=true;
    document.getElementById('stop').disabled=true;
    document.getElementById('detune_Audio').disabled=true;
    document.getElementById('play').addEventListener('click', start_Audio);
    document.getElementById('stop').addEventListener('click', stop_Audio);
    document.getElementById('detune_Audio').addEventListener('input', function(){
        source.detune.value = this.value;
        document.querySelector('#detune_Audio_Value').value = this.value/100 + " Semitones";
    });
    document.getElementById('bitcrush_Amount').addEventListener('input', function(){
        node.normfreq = this.value;
        document.querySelector('#bitcrush_Amount_Value').value = this.value;
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

effect = (function() {
    node.bits = 16; // between 1 and 16
    node.normfreq = 1; // between 0.0 and 1.0
    var step = Math.pow(1/2, node.bits),
        phaser = 0,
        last = 0;
    node.onaudioprocess = function(e) {
        var input = e.inputBuffer.getChannelData(0),
            output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            phaser += node.normfreq;
            if (phaser >= 1.0) {
                phaser -= 1.0;
                last = step * Math.floor(input[i] / step + 0.5);
            }
            output[i] = last;
        }
    };
    return node;
})();