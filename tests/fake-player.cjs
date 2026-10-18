// Controlled YouTube/Gamepad boundary. No media or third-party requests.
module.exports = `
window.__calls=[]; window.__players=[]; window.__autoPlay=true; window.__maxActive=0;
window.YT={Player:class {
  constructor(id,options){
    this.options=options; this.state=-1; this.video=''; this.seconds=0; this.destroyed=false;
    const old=document.getElementById(id), frame=document.createElement('iframe');
    frame.id=id; frame.srcdoc='<body style="margin:0;background:#000"></body>'; old.replaceWith(frame); this.frame=frame;
    window.__players.push(this); window.__active=this;
    window.__maxActive=Math.max(window.__maxActive,window.__players.filter(p=>!p.destroyed).length);
    setTimeout(()=>options.events.onReady({target:this}),0);
  }
  emit(name,data){if(name==='onStateChange')this.state=data;this.options.events[name]({target:this,data});}
  getIframe(){return this.frame;} destroy(){this.destroyed=true;this.frame.remove();}
  setVolume(){} mute(){} unMute(){} setLoop(){} setShuffle(){}
  loadPlaylist(p){window.__calls.push({type:'playlist',...p});this.video='M7lc1UVf-VE';this.seconds=p.startSeconds;this.state=-1;if(window.__autoPlay)setTimeout(()=>this.emit('onStateChange',1),0);}
  loadVideoById(p){window.__calls.push({type:'video',...p});this.video=p.videoId;this.seconds=p.startSeconds;this.state=-1;if(window.__autoPlay)setTimeout(()=>this.emit('onStateChange',1),0);}
  playVideo(){this.emit('onStateChange',1);} pauseVideo(){this.emit('onStateChange',2);} stopVideo(){this.state=0;}
  nextVideo(){window.__calls.push({type:'next'});} seekTo(t){this.seconds=t;}
  getPlayerState(){return this.state;} getVideoData(){return {title:'Controlled video fixture',video_id:this.video};}
  getCurrentTime(){return this.seconds;} getDuration(){return 0;} getPlaylistIndex(){return 0;} getPlaylist(){return [this.video];}
}};
window.__padButtons=Array.from({length:17},()=>({pressed:false,value:0}));window.__padConnected=false;
Object.defineProperty(navigator,'getGamepads',{value:()=>window.__padConnected?[{index:0,id:'Controlled standard gamepad fixture',mapping:'standard',buttons:window.__padButtons,axes:[0,0]}]:[]});
`;
