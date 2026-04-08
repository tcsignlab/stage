navigator.requestMIDIAccess().then(midi=>{

for(let input of midi.inputs.values()){

input.onmidimessage=handleMidi

}

})

function handleMidi(msg){

let command=msg.data[0]
let note=msg.data[1]

if(command===144){

switch(note){

case 60:
startSong()
break

case 61:
pauseSong()
break

case 62:
nextSong()
break

}

}

}
