// js/midi.js – AUDIT FIX: made midiClock global (var) so scroll.js can read it reliably
var midiClock = {
    pulses: 0,
    lastTick: 0,
    bpm: 0
}

navigator.requestMIDIAccess().then(midi => {
    for (let input of midi.inputs.values()) {
        input.onmidimessage = handleMidi
    }
}).catch(e => console.log("MIDI not available – pedal still works for notes", e))

function handleMidi(msg) {
    let status = msg.data[0]
    let note = msg.data[1]

    // MIDI Clock tick
    if (status === 248) {
        handleClockTick()
    }

    // Start / Stop
    if (status === 250) startSong()
    if (status === 252) pauseSong()

    // Note messages for pedals (C4=60 start, C#4=61 pause, D4=62 next)
    if (status === 144) {
        if (note === 60) startSong()
        if (note === 61) pauseSong()
        if (note === 62) nextSong()
    }
}

function handleClockTick() {
    let now = performance.now()
    if (midiClock.lastTick) {
        let delta = now - midiClock.lastTick
        let bpm = 60000 / (delta * 24)
        midiClock.bpm = Math.round(bpm)
    }
    midiClock.lastTick = now
}
