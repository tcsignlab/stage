
let midiClock = {
    pulses:0,
    lastTick:0,
    bpm:0
}

navigator.requestMIDIAccess().then(midi=>{
    for(let input of midi.inputs.values()){
        input.onmidimessage = handleMidi
    }
})

function handleMidi(msg){

    let status = msg.data[0]
    let note = msg.data[1]

    // MIDI Clock tick
    if(status === 248){
        handleClockTick()
    }

    // Start
    if(status === 250){
        startSong()
    }

    // Stop
    if(status === 252){
        pauseSong()
    }

    // Note messages for pedals
    if(status === 144){
        if(note===60) startSong()
        if(note===61) pauseSong()
        if(note===62) nextSong()
    }
}

function handleClockTick(){

    let now = performance.now()

    if(midiClock.lastTick){
        let delta = now - midiClock.lastTick
        let bpm = 60000/(delta*24)
        midiClock.bpm = bpm
    }

    midiClock.lastTick = now
}
