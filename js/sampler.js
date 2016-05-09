var context = new (window.AudioContext || window.webkitAudioContext)(),
    SR = context.sampleRate,
    source,
    wetGain           = context.createGain(),
    dryGain           = context.createGain(),
    masterGain        = context.createGain(),
    LFOGain           = context.createGain(),
    pitchGain         = context.createGain(),
    fileReader        = new FileReader(),
    audio,
    LFO               = context.createOscillator(),
    play_Track,
    stop_Track,
    detune_Audio,
    detune_Audio_Value,
    file_Chooser,
    current_LFO_State = masterGain.gain,
    recorder,
    bufferSize = 4096,
    rChannel,
    lChannel,
    isRecording,
    rec_Start,
    rec_Stop;


dryGain.gain.value = 1;
wetGain.gain.value = 0;
masterGain.gain.value = 0.5;
LFOGain.gain.value = 0.5;

wetGain.connect(masterGain);
dryGain.connect(masterGain);
masterGain.connect(context.destination);

LFO.type = 'sine';
LFO.frequency.value = 0.1;
LFO.start();
LFO.connect(LFOGain);

function readAudioFile(files) {
    fileReader.readAsArrayBuffer(files[0]);
    fileReader.onload = function (e) {
        playAudioFile(e.target.result);
        audio = fileReader.result;
        play_Track.disabled=false;
        rec_Start.disabled=false;
        console.log(("Filename: '" + files[0].name + "'"), ( "(" + ((Math.floor(files[0].size / 1024 / 1024 * 100)) / 100) + " MB)" ));
    }
}
 function playAudioFile(file) {
     source = context.createBufferSource();
     context.decodeAudioData(file, function (buffer) {
         source.buffer = buffer;
         source.loop = true;
         mix(0);
         source.connect(dryGain);
         source.connect(reverb);
         reverb.connect(wetGain);
         console.log(buffer.sampleRate);
     });
 }

window.onload = function() {
    initRec();
    masterGain.connect(recorder);
    play_Track = document.getElementById('play');
    stop_Track = document.getElementById('stop');
    rec_Start = document.getElementById('rec_Start');
    rec_Stop = document.getElementById('rec_Stop');
    file_Chooser = document.getElementById('audioFileChooser');
    detune_Audio = document.getElementById('detune_Audio');
    detune_Audio_Value = document.getElementById('detune_Audio_Value');
    var
        reverb_Amount = document.getElementById('reverb_Amount'),
        LFO_Rate = document.getElementById('LFO_Rate'),
        LFO_Wave_Type = document.getElementById('LFO_Wave_Type'),
        LFO_State = document.getElementById('LFO_State'),
        LFO_Target = document.getElementById('LFO_Target_Name');

    play_Track.disabled=true;
    stop_Track.disabled=true;
    rec_Start.disabled=true;
    rec_Stop.disabled=true;
    detune_Audio.disabled=true;
    LFO_Target.disabled=true;
    play_Track.addEventListener('click', start_Audio);
    stop_Track.addEventListener('click', stop_Audio);
    detune_Audio.addEventListener('input', function(){
        source.detune.value = this.value*100;
        detune_Audio_Value.value = this.value + " Semitones";
    });
    reverb_Amount.addEventListener('input', function(){
        mix(this.value);
        document.querySelector('#reverb_Amount_Value').value = this.value + "%";
    });
    LFO_Rate.addEventListener('input', function(){
        LFO.frequency.value = this.value;
        document.querySelector('#LFO_Rate_Hz').value = this.value + "Hz";
    });
    LFO_Wave_Type.addEventListener('change', function(){
        LFO.type = this.value;
        console.log(LFO.type);
    });
    LFO_State.onclick = function(){
        if (this.checked){
            LFOGain.connect(current_LFO_State);
            LFO_Target.disabled=false;
        }
        else {
            LFOGain.disconnect();
            masterGain.gain.value = 0.5;
            LFO_Target.disabled=true;
        }
    };
    LFO_Target.addEventListener('change', function(){
        if (LFO_State.checked === true) {
            if (this.value === '1') {
                console.log(this.value);
                LFOGain.connect(masterGain.gain);
                current_LFO_State = masterGain.gain;
            }
            else if (this.value === '2') {
                console.log(this.value);
                LFOGain.disconnect();
                LFOGain.connect(mix());
                current_LFO_State = mix();
            }
            else if (this.value === '3') {
                console.log(this.value)

            }
        }
    });
    rec_Start.addEventListener('click', function(){
        record_Audio();
    });
    rec_Stop.addEventListener('click', function(){
       stop_Record_Audio();
    });

};

function start_Audio() {
    source.start(0);
    play_Track.disabled=true;
    file_Chooser.disabled=true;
    stop_Track.disabled=false;
    detune_Audio.disabled=false;
}

function stop_Audio() {
    source.stop(0);
    playAudioFile(audio);
    stop_Track.disabled=true;
    play_Track.disabled=false;
    detune_Audio.disabled=true;
    file_Chooser.disabled=false;
    detune_Audio.value = 0;
    detune_Audio_Value.value = 0 + " Semitones";
}

function record_Audio() {
    start_Audio();
    isRecording=true;
    rec_Start.disabled=true;
    rec_Stop.disabled=false;
}

function stop_Record_Audio(){
    isRecording=false;
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

var mix = function(value){
    wetGain.gain.value = value/100;
    dryGain.gain.value = 1 - value/100;
};

function initRec(){
    recorder = context.createScriptProcessor(bufferSize, 2, 2);
    recorder.onaudioprocess = function (process) {
        var inputBuffer = process.inputBuffer,
            leftInput = null,
            rightInput = null;
        if (isRecording === true) {
            leftInput = inputBuffer.getChannelData(0);
            rightInput = inputBuffer.getChannelData(1);
            lChannel.push(new Float32Array(leftInput));
            rChannel.push(new Float32Array(rightInput));
            recordingLength += bufferSize;
        }
    }
}

function interleave(leftC, rightC) {
    var length = leftC.length + rightC.length,
        result = new Float32Array(length),
        index = 0,
        inputIndex = 0;

    while (index < length) {
        result[index++] = leftC[inputIndex];
        result[index++] = rightC[inputIndex];
        inputIndex++;
    }
    return result;
}

function mergeBuffers(recBuffers, recLength) {
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++) {
        result.set(recBuffers[i], offset);
        offset += recBuffers[i].length;
    }
    return result;
}

function encodeWAV(samples) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}