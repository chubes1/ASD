// Global Variables (can be accessed throughout the file)
// This is where all the variables that can be accessed throughout the script are created.
// context.createGain() creates a variable used to adjust the gain output of the signal
// passing through it. It can also be used as an Audio Parameter as for the LFO. 
var context              = new (window.AudioContext || window.webkitAudioContext)(),
    SR                   = context.sampleRate,
    wetGain              = context.createGain(),
    dryGain              = context.createGain(),
    masterGain           = context.createGain(),
    LFOGain              = context.createGain(),
    fileReader           = new FileReader(),
    LFO                  = context.createOscillator(),
    bufferSize           = 4096,
    lChannel             = [],
    rChannel             = [],
    source,
    audio,
    play_Track,
    stop_Track,
    loop_Start,
    loop_End,
    detune_Audio,
    detune_Audio_Value,
    file_Chooser,
    recorder,
    isRecording,
    rec_Start,
    rec_Stop,
    time_Recorded,
    interleaved_Buf,
    view;

// Set default gain values for dryGain, wetGain and masterGain.
dryGain.gain.value       = 1;
wetGain.gain.value       = 0;
masterGain.gain.value    = 0.5;

// Sends the output of wetGain and dryGain to masterGain. Sends the
// masterGains output to the users output device.
wetGain.connect(masterGain);
dryGain.connect(masterGain);
masterGain.connect(context.destination);

// This section sets up the LFO Oscillator node. Assigning the default
// type to a sine wave, the initial frequency being 0.1Hz. the LFO
// gain value is set to 0.5 to change the oscillators range from
// -1, 1 to -0.5, 0.5. When LFOGain is connected to masterGain it only
// adds and subtracts from the masterGain value. Therefore as masterGain is
// set to 0.5 the range of the LFO is between 0 - 1.
LFO.type = 'sine';
LFO.frequency.value      = 0.1;
LFOGain.gain.value       = 0.5;
LFO.start();
LFO.connect(LFOGain);


// This initiates everything that needs to be loaded when the web-page
// has loaded. All document.getElementById's are referenced here as
// otherwise they would be loaded before the Elements themselves in the
// html had been created causing them to error, and not link to each other.
window.onload = function() {
    initRec();

    // These variables are called on in functions outside of window.onload
    // so have already been defined in the the Global variable section
    play_Track             = document.getElementById('play');
    stop_Track             = document.getElementById('stop');
    rec_Start              = document.getElementById('rec_Start');
    rec_Stop               = document.getElementById('rec_Stop');
    file_Chooser           = document.getElementById('audioFileChooser');
    detune_Audio           = document.getElementById('detune_Audio');
    detune_Audio_Value     = document.getElementById('detune_Audio_Value');
    loop_Start             = document.getElementById('loop_Start');
    loop_End               = document.getElementById('loop_End');

    // These variables are only used in window.onload therefore do not require
    // to be Global Variables.
    var
        reverb_Amount      = document.getElementById('reverb_Amount'),
        LFO_Rate           = document.getElementById('LFO_Rate'),
        LFO_Wave_Type      = document.getElementById('LFO_Wave_Type'),
        LFO_State          = document.getElementById('LFO_State'),
        loop_State         = document.getElementById('loop_State');

    // Any variable that is triggers or directly effects the audio is disabled
    // here so that no errors are caused which in turn cause loss of functionality.
    play_Track.disabled    = true;
    stop_Track.disabled    = true;
    rec_Start.disabled     = true;
    rec_Stop.disabled      = true;
    detune_Audio.disabled  = true;
    loop_State.checked     = true;
    loop_Start.disabled    = true;
    loop_End.disabled      = true;

    // Set listeners for each of the input elements such as buttons, sliders and
    // drop-downs so when they are altered listeners form clicks, input and change
    // in values run functions.

    // From play button triggers the start_Audio() function which plays the inputted
    // file.
    play_Track.addEventListener('click', start_Audio);

    // From stop button triggers
    stop_Track.addEventListener('click', stop_Audio);

    // From pitch slider changes the value of source.detune in real-time and also
    // updates label next to slider with current value in real-time.
    detune_Audio.addEventListener('input', function(){
        source.detune.value      = this.value*100;
        detune_Audio_Value.value = this.value + " Semitones";
    });

    // Event listener triggered via the reverb slider. Using the mix function it
    // fades between the dry signal and 100% wet signal. It also changes the value
    // of the label next to it in real-time.
    reverb_Amount.addEventListener('input', function(){
        mix(this.value);
        document.querySelector('#reverb_Amount_Value').value = this.value + "%";
    });

    // Event listener triggered via the LFO Rate slider. Updates in real-time and
    // changes the value of the label also.
    LFO_Rate.addEventListener('input', function(){
        LFO.frequency.value = this.value;
        document.querySelector('#LFO_Rate_Hz').value = this.value + "Hz";
    });

    // Using the drop down box selecting a new wave updates the LFO.type here. unlike
    // the others this event listener relies on the parameter 'change' this means clicking
    // on the drop down wont update the value, only select a value from the drop down list
    // will actually update the value. the LFO.type is varying which waveform is used for
    // the LFO such as: triangle and sine. Saw and square waves where used but caused considerable
    // clicking due to sudden change in gain, so were removed.
    LFO_Wave_Type.addEventListener('change', function(){
        LFO.type = this.value;
        console.log(LFO.type);
    });

    // This event listener corresponds to the on/off toggle for the LFO itself. When checked
    // it connects the LFOGain to the variable current_LFO_State. current_LFO_State contains
    // the name of the currently selected target for the LFO. When the toggle is un-checked it
    // disconnects the LFOGain, resets the masterGain.gain to 0.5 and disables the target selector.
    LFO_State.onclick = function(){
        if (this.checked){
            LFOGain.connect(masterGain.gain);
        }
        else {
            LFOGain.disconnect();
            //masterGain.gain.value = 0.5;
        }
    };

    // Button linked to start recording function.
    rec_Start.addEventListener('click', function(){
        record_Audio();
    });

    // Button linked to stop recording function.
    rec_Stop.addEventListener('click', function(){
        stop_Record_Audio();
    });

    // Toggle to switch on and off looping.
    loop_State.onclick = function(){
        if (this.checked){
            source.loop = true;
        }
        else {
            source.loop = false;
        }
    };

    // Listens to input from loop start slider and adjusts source.loopStart accordingly using
    // source.buffer.duration to get whole buffer duration and then multiplying it by a percentage.
    // .toFixed(2) sets the output to fixed 2 decimal places, to stop numbers with extended decimals
    // showing.
    document.getElementById('loop_Start').addEventListener('input', function(){
        source.loopStart = source.buffer.duration * this.value/100;
        var start = source.loopStart/60;
        document.querySelector('#loop_Start_Value').value = start.toFixed(2);
    });

    // Listens to input from loop end slider and adjusts source.loopEnd accordingly using
    // source.buffer.duration to get whole buffer duration and then multiplying it by a percentage.
    // .toFixed(2) sets the output to fixed 2 decimal places, to stop numbers with extended decimals
    // showing.
    document.getElementById('loop_End').addEventListener('input', function(){
       source.loopEnd = source.buffer.duration * this.value/100;
        var end = source.loopEnd/60;
        document.querySelector('#loop_End_Value').value = end.toFixed(2);
    });
};


// This function is called when a user clicks the Choose File.. button.
// This uses the FileReader object to read files. it has been setup to only
// accept .wav/.mp3 files. This is then read as an ArrayBuffer(). Once the audio
// file has been uploaded it triggers the .onload trigger, which in turn triggers
// playAudioFile(file) substituting 'file' for the resulting Array.
function readAudioFile(files) {
    fileReader.readAsArrayBuffer(files[0]);
    fileReader.onload = function (e) {
        playAudioFile(e.target.result);
        audio = fileReader.result;
        play_Track.disabled = false;
        rec_Start.disabled  = false;
        loop_Start.disabled = false;
        loop_End.disabled   = false;
        console.log(("Filename: '" + files[0].name + "'"), ( "(" + ((Math.floor(files[0].size / 1024 / 1024 * 100)) / 100) + " MB)" ));
    }
}

// When playAudioFile is run it creates a new BufferSource() this contains the
// raw audio data to be played and processed. decodeAudioData breaks down the
// audio file uploaded from fileReader and extracts the raw audio data and fills
// the buffer source with it. Each time the audio file is stopped playing the buffer
// needs to be recreated as buffers can only be started and stopped once. Buffer sources
// are designed to be recreated so therefore it does not cause memory errors. the mix()
// function is called to set initially to only output the dry signal. The processing chain
// is then created by using .connect to send the source output to dryGain and the reverb.
// The reverb is then connected to wetGain so that it can be faded in using the mix() function
// and masterGain is connected to the record so that all processing and effects are recorded,
// not just the source content.
 function playAudioFile(file) {
     source = context.createBufferSource();
     context.decodeAudioData(file, function (buffer) {
         source.buffer = buffer;
         source.loop   = true;
         mix(0);
         source.connect(dryGain);
         source.connect(reverb);
         reverb.connect(wetGain);
         masterGain.connect(recorder);
         recorder.connect(context.destination);
     });
 }

// start_Audio starts playback of the source content. It also disables the play button,
// and file chooser to prevent errors. Th stop button is also activated and so is the pitch
// slider. The stop button and pitch slider are by default disabled as envoking  .stop
// before .start results in an error. The pitch slider is disabled as the pitch is reset every
// time the playback is stopped.
function start_Audio() {
    source.start(0);
    play_Track.disabled    = true;
    file_Chooser.disabled  = true;
    stop_Track.disabled    = false;
    detune_Audio.disabled  = false;
}

// stop_Audio envokes .stop halting the audio playback. It then envokes the playAudioFile()
// function to create a new buffer source ready to start playback again. It also re-disables
// the stop button and pitch slider and enables the start button and file chooser. The pitch
// is also reset here and also so is its label.
function stop_Audio() {
    source.stop(0);
    playAudioFile(audio);
    stop_Track.disabled      = true;
    play_Track.disabled      = false;
    detune_Audio.disabled    = true;
    file_Chooser.disabled    = false;
    detune_Audio.value       = 0;
    detune_Audio_Value.value = 0 + " Semitones";
}

// record_Audio() starts audio playback through start_Audio(). It then disables the stop button
// as stopping the audio playback doesnt stop the recording function. It also resets the lChannel
// and rChannel arrays and also resets time_Recorded. If these three things are not reset to
// they will continue writing onto the end of the array and continue incrementing time_Recorded.
function record_Audio() {
    start_Audio();
    stop_Track.disabled = true;
    isRecording         = true;
    rec_Start.disabled  = true;
    rec_Stop.disabled   = false;
    lChannel.length     = 0;
    rChannel.length     = 0;
    time_Recorded       = 0;
}

// stop_Record_Audio() envokes stop_Audio() to stop audio playback. It then resets the buttons for
// recording and proceeds to call all the relevant functions to process the recorded information and
// export it as a download for the user.
function stop_Record_Audio(){
    stop_Audio();
    rec_Start.disabled = false;
    rec_Stop.disabled  = true;
    isRecording        = false;
    var left_Buf  = mergeBuffers(lChannel, time_Recorded),
        right_Buf = mergeBuffers(rChannel, time_Recorded);

    interleaved_Buf = interleave(left_Buf, right_Buf);
    encodeWAV(interleaved_Buf);
    outputWAV(view);
}

// The variable reverb is created here to create an audio effect. This effect uses convolution
// to create a reverb effect. The convolution takes place in the createConvolver variable.
// Once the convolver has been created a buffer is created to hold the impulse response, which
// in this case is a half a second long buffer of white noise, this makes a simple reverb effect.
// This could use an audio file of an impulse response but uses white noise to reduce file size
// and no need for external audio files to use. The whit noise is generated through the for loop
// after the definition of the two channel buffers for a stereophonic convolution. The default
// output of math.random() is a number between 0 - 1. That is then multipled by 2 and subtracted by
// 1 so that the range become between -1 - 1. the buffer of noise is then fed into the convolver so
// that it can be used to convolve with the incoming audio signal.
var reverb = (function() {
    var convolver = context.createConvolver(),
        noiseBuffer = context.createBuffer(2, 0.5 * context.sampleRate, context.sampleRate),
        left        = noiseBuffer.getChannelData(0),
        right       = noiseBuffer.getChannelData(1);
    for (var i = 0; i < noiseBuffer.length; i++) {
        left[i]  = Math.random() * 2 - 1;
        right[i] = Math.random() * 2 - 1;
    }
    convolver.buffer = noiseBuffer;
    return convolver;
})();


// The mix function is used to fade between the dryGain signal and wetGain signal. it uses the
// input values from the reverb slider to fade. It uses a simple way of fading by having the dry
// gain set to 1 value meaning as the input value goes up the dryGain goes down and wetGain goes up.
var mix = function(value){
    wetGain.gain.value = value/100;
    dryGain.gain.value = 1 - value/100;
};


// This function initiates the audio recorder. it uses a scriptProcessor to receive the incoming signal
// and break it down into small buffers/arrays. These buffers are then stored respectively in the lChannel
// and rChannel arrays. Due to the script processor taking in the audio as buffers the lChannel and rChannel
// arrays contain lots of small arrays. This needs to be broken down before the audio can be written to file.
// the if() statement below is triggered when isRecording is set to true by the record_Audio() function. It
// cycles the if statement until isRecording is set back to false leftInput and rightInput are set to receive
// the incoming buffers for the two channels respectively, therefore each cycle of the if statement the left/right
// input refers to a new buffer. These are then prepended to the l/rChannel arrays to form a continuous chain
// of buffers and time_Recorded is in samples and each cycle of the if statement is increased by the buffer size.
function initRec(){
    recorder = context.createScriptProcessor(bufferSize, 2, 2);
    console.log(recorder.bufferSize);
    recorder.onaudioprocess = function (process) {
        var inputBuffer = process.inputBuffer,
            leftInput,
            rightInput;
        if (isRecording === true) {
            leftInput  = inputBuffer.getChannelData(0);
            rightInput = inputBuffer.getChannelData(1);
            lChannel.push(new Float32Array(leftInput));
            rChannel.push(new Float32Array(rightInput));
            time_Recorded += bufferSize;
            console.log("processing");
        }
    };
    return recorder;
}

// The mergeBuffers function takes the channel buffers lChannel and rChannel and breaks down all of the
// contained buffers into one main array, therefore instead of having an array full of buffers which hold
// the audio data, the data is extracted from the buffers and put into a single array per channel. When
// this function is called it requires two inputs. the channel array of which to break down and the
// time_Recorded. time_Recorded is used to create an Array the size of the amount of buffers contained in
// the channel buffer. the offset is set to 0 so that the merge will start at the beginning of the array,
// a variable length is define for ease of use containing the length of the channel, and finally a for loop
// is run to take the value from each index in the channel array and fill the new array with it resulting,
// in the one array containing all the raw audio data for that channel.
function mergeBuffers(channel, time_Recorded) {
    var result = new Float32Array(time_Recorded);
    var offset = 0;
    var length = channel.length;
    for (var i = 0; i < length; i++) {
        result.set(channel[i], offset);
        offset += channel[i].length;
    }
    return result;
}

// The interleave function performs a simple task of combining the newly created arrays from running
// mergeBuffer for each channel. To correctly stereo interleave the array containing both channels must
// be laid out in this format. starting with the first index of the left channel, and then directly afterwards
// the first index of the right channel. This continues until the array is filed with both channels. A
// new variable is created here called length which combines the length of both channels. This is then
// used to create a new array the size of both of the channels combined. The index and input index and both
// reset to 0 so that each array is started from the very beginning. The while loop then combines the two
// channel arrays. index++ and inputIndex++ is used as short hand for index = index + 1, therefore each
// time they are referenced they are incremented by 1 until reaching the value of length.
function interleave(leftC, rightC) {
    var length     = leftC.length + rightC.length,
        result     = new Float32Array(length),
        index      = 0,
        inputIndex = 0;

    while (index < length) {
        result[index++] = leftC[inputIndex];
        result[index++] = rightC[inputIndex];
        inputIndex++;
    }
    return result;
}

// This function is used in the creation of the .wav RIFF header. It is used to
// convert strings into unsigned 8 bit integers.
function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// This function takes the interleave stereo buffer and combines it with with RIFF header in a
// final buffer. The offset in this case is 44 as the RIFF header is 44bytes in size. As in the
// function name its main purpose is to encode the float Array to 16bit PCM (pulse-code Modulation).
function floatTo16BitPCM(output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

// This functions main purpose is to encode the wave file ready for it to be exported/downloaded.
// The function contains the RIFF header used to encode .wav files with all the necessary information
// for playback in an audio player such as, bit depth, sample rate, number of channels and a few other
// useful things. As you cannot directly edit the contents of the ArrayBuffer the DataView object is
// used to write all of the raw binary data to the array.
function encodeWAV(samples) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    view = new DataView(buffer);

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
    view.setUint16(22, 2, true);
    /* sample rate */
    view.setUint32(24, SR, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, SR * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 4, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}

// This function is responsible for exporting the audio file as a download.
// It takes the DataView created in exportWAV above and puts it in a Blob (a file like object).
// This is where the file is packaged as a .wav file using the Blob and giving it type 'audio/wav'.
// It then creates a url variable. window.url takes the Blob object and makes allows it to be managed,
// aka downloaded. A link variable is then created and is pointed to the url using .href
// link.download then creates the download with the files download name, set here to output.wav
// it then creates an event trigger which is automatically triggered so when the user presses stop
// record it runs through all of the above functions and finally creates a download popout for the user
// to choose where to download to.
function outputWAV(view) {
    var outputBlob = new Blob([view], {type : 'audio/wav'});
    var url        = (window.URL || window.webkitURL).createObjectURL(outputBlob);
    var link       = window.document.createElement('a');
    link.href      = url;
    link.download  = 'output.wav';
    var click      = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
}