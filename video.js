(function(){
	navigator.getUserMedia=navigator.getUserMedia||navigator.mozGetUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia;
	if (navigator.getUserMedia) {

		navigator.getUserMedia({
			video:true,
			audio:true
		},onSuccess,onError);

	}
	else
	{
		throw new Error("sorry ,getUserMedia() is navigator supported in your browser");
	}

}());


function onSuccess(stream){
	alert("get the navigator getUserMedia");
	var video=document.createElement("video");
	videoSource=window.URL.createObjectURL(stream);
	video.autoplay=true;
	video.src=videoSource;

	document.body.appendChild(video);

}

function onError(){
	throw new Error("there is problem");
}