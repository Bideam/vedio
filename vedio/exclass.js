var localVideoElement=document.getElementById('local-video'),
	remoteVideoElement=document.getElementById("remote-video"),
	startCallButton=document.getElementById("start-call"),
	joinCallButton=document.getElementById("join-call"),
	roomNameElement=document.getElementById("room-name"),
	videoChat=new VideoChat({
		firebaseUrl:"https://project-456776323243929447.firebaseio.com",
		onLocalStream:function(streamSrc){
			localVideoElement.src=streamSrc;
		},

		onRemoteStream:function(streamSrc){
			remoteVideoElement.src=streamSrc;
		}
	});

	startCallButton.addEventListener("click",function(){
		var roomName=videoChat.startCall();

		roomNameElement.innerHTML="Created call with room name :"+roomName;
	},false);

	joinCallButton.addEventListener("click",function(){

		var roomName=prompt("what is the name of the chat room you would like to join ?");
		videoChat.jionCall(roomName);

		roomNameElement.innerHTML="Joined call with room name :"+roomName;
	},false);
