var VideoChat=(function(Firebase){
	//peerConnection类可以配置实现点对点连接，使得附于其上的数据流能够从一端传输到另一端
	var PeerConnection=window.mozRTCPeerConnection||window.webkitRTCPeerConnection,
	//RTCSessionDescription初始化点对点数据流
		SessionDescription=window.mozRTCSessionDescription||window.RTCSessionDescription,
	//icecandidate使得点对点候选地址实例得意创建
		IceCandidate=window.mozRTCIceCandidate||window.RTCIceCandidate,
		//定义双方通话
		_participantType={
			INITIATOR:"initiator",
			RESPONSER:"responser"
		},
		_peerConnectionSettings={
			//定义一组ice服务器，用来尝试查找出参与聊天的每一台设备的IP地址，为了能以最大的机会来成功查找出IP 地址，对于两种不同的协议，我们要各自提供
			//至少一台支持该协议的服务器。这两种服务器协议是STUN和TURN，
			server:{
				iceServers:[{
					//mozilla的公共服务器
					url:"stun:23.21.150.121"
				},
				{
					//google 公共服务器
					url:"stun:stun.l.google.con:19302"
				},
				{
					//http://numb.viagenie.ca上创建自己的TURN服务器
					url:"turn:numb.viagenie.ca",
					username:"denodell%40gmail.com",
					credential:"password"
				}]
			},

			//为了实现不同浏览器产商互相操作性，设置DTLS/SRTP属性为true
			options:{
				optional:[{
					DtlsSrtpKeyAgreement:true
				}]
			}
		};

		navigator.getUserMedia=navigator.getUserMedia||navigator.mozGetUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia;
		if (!navigator.getUserMedia && !window.RTCPeerConnection) {
			throw new Error("the browser dont support video chat");
		}

		//定义一个一般性错误处理函数
		function onError(error){
			throw new Error(error);
		}

		function VideoChat(options){
			options=options||{};
			//一旦与本地网络摄像头和麦克风连接着执行onLocalStream函数，如果与远程用户摄像头麦克风连接则执行onRemoteStream函数
			if (typeof options.onLocalStream ==="function") {
				this.onLocalStream=options.onLocalStream;
			}
			if (typeof options.onRemoteStream ==="function") {
				this.onRemoteStream=options.onRemoteStream;
			}
			//根据提供的url来初始化firebase数据储存
			this.initializeDatabase(options.firebaseUrl || "");

			//建立点对点连接，用于两个设备之间视频和音频的流形式传输
			this.setupPeerConnection();
		}

		VideoChat.prototype={
			//为此聊天中的本地用户定义其参与的角色类型。。邀请者，由此角色发起通话
			participantType:_participantType.INITIATOR,

			//为远程用户定义角色类型，响应者，

			remoteParticipantType:_participantType.RESPONSER,

			//创建一个属性用来保存聊天室的名称

			chatRoomName:"",

			//定义一个属性，用来从firebase数据库加载和保存数据

			database:null,

			//定义个方法，当本地数据流已经开始传输是，执行此方法
			onLocalStream:function (){},

			//定义方法，当远程数据流开始传输时，执行

			onRemoteStream:function (){},

			//定义方法，初始化firebase数据库
			initializeDatabase:function(firebaseUrl){
				//连接到firebase数据库
				var firebase=new Firebase(firebaseUrl);
				//定义和保存一数据对象，用来存放各聊天室连接信息所有详细内容
				this.database=firebase.child("chatRooms");
			},

			//定义一个方法，将给定“名称-值”对，对应于该通话的聊天室名称，保存到firebase中
			saveData:function(chatRoomName,name,value){
				if (this.database) {
					this.database.child(chatRoomName).child(name).set(value);
				}
			},

			//定义一个方法通过其名称和聊天室名称从firebase加载所保存的数据，当找到此数据，执行回调函数，即使此数据是在稍后才产生的，连接也会做出等待，直到数据找到为止
			loadData:function(chatRoomName,name,callback){
				if (this.database) {
					//以异步方式请求数据，、一旦找到数据，执行回调函数
					this.database.child(chatRoomName).child(name).on("value",function(data){
						//从回应的数据信息中解析出我们所要的值
						var value=data.val();

						//如果有回调函数提供给此方法，则执行该回调函数，并把找到的值传入该回调函数
						if (value && typeof callback ==="function") {
							callback(value);
						}

					});
				}
			},
			//定义一个方法，用于在两设备之间建立点对点连接，并在两者之间吧数据以流的形式传输
			setupPeerConnection:function(){
				var that=this;

				//使用先前定义的STUN和TURN 服务器来创建一个peerConnection实例，确立一个点对点连接
				//(可以穿透防火墙和nat)
				this.peerConnection= new PeerConnection(_peerConnectionSettings.server,_peerConnectionSettings.options);

				//当一个远程数据流已经加入到此点对点连接是，获取此数据流的URL，并将其传给onRemoteStream()
				//方法，以使远程视频和音频在页面中<video>里显示出来
				this.peerConnection.onaddstream=function(event){
					//获取一个URL，此URL表示该流对象
					var streamURL=window.URL.createObjectURL(event.stream);

					//把这个URL传入onRemoteStream()方法，onRemoteStream（）方法在这个VideoChat实例
					//实例化是传入
					that.onRemoteStream(streamURL);
				};
				//定义一个函数，当ICE框架发现何时的候选地址进行点对点数据连接时，执行此函数
				this.peerConnection.onicecandidate= function(event){
					if (event.candidate) {

						//google chrome 经常发现多个候选地址。因此，确保只获取它提供的第一个

						//方法是一旦找到一个候选地址，则移除该事件处理方法
						that.peerConnection.onicecandidate=null;

						//获取远程方的ICE候选地址连接的详细内容
						that.loadData(that.charRoomName,"candidate:"+that.remoteParticipantType,function(candidate){
							//是远程方的ICE候选地址关联到这个连接，形成点对点连接
							that.peerConnection.addIceCandidate(new IceCandidate(JSON.parse(candidate)));

						});
						//保存我们的ICE候选地址链接的详细内容，以供远程方连接使用
						that.saveData(that.chatRoomName,"candidate:"+that.ParticipantType,JSON.stringify(event.candidate));
					}
				};
			},


			//定义一个方法，获取本地设备的摄像头和麦克风数据流，并处理本地设备与远程方设备的握手，来建立视屏聊天通话
			call:function(){
				var that=this,

				//设置点对点连接的用途限制，能支持视频和音频，因此需设置相应的属性
				_constraints={
					mandatory:{
						OfferToReceiveAudio:true,
						OfferToReceiveVideo:true
					}
				};

				//获取获取本地设备的摄像头和麦克风数据流，提示用户授权进行网络摄像头和麦克风的使用
				navigator.getUserMedia({
					video:true,
					audio:true
				},function(stream){
					//添加本地视频和音频数据流到点连接，使连接在该相同的点对点连接通道上的远程方能够
					//获取此视频和音频流

					that.peerConnection.addStream(stream);

					//将本地数据流URL传入onlocalstream，执行，使得摄像头和麦克风可以展示给本地用户

					that.onLocalStream(window.URL.createObjectURL(stream));

					//如果我们是在通话中的邀请者，我们赢创建一个offer给加入到我们得视频通话的对方连接点
					if (that.participantType=== _participantType.INITIATOR) {
						//创建此聊天室的视频通话offer，并等待来自其他远程连接点的answer
						that.peerConnection.createOffer(function(offer){
							//保存所生成的本地offer到对象peerconnection中
							that.peerConnection.setLocalDescription(offer);

							//保存offer的详细内容在firebase，以便个连接点进行访问
							that.saveData(that.chatRoomName,"offer:",JSON.stringify(offer));
							//如果某个连接点回应一个answer个我们得offer，则保存它的详细内容至对象peerconnection中，在两者之间建立起通信通道
							that.loadData(that.chatRoomName,"answer",function(answer){
								that.peerConnection.setRemoteDescription(
									new SessionDescription(JSON.parse(answer))
									);
							});
						},onError,_constraints);
						//如果我们要加入一个已经存在通话，则我们应答一个offer来建立点对点连接
					}else{
						//加载一个有另一方提供的offer，如果该offer没哟马上出现，则等待至该offer出现为止
						that.loadData(that.chatRoomName,"offer",function(offer){

							//根据提供的数据，保存远程用户的offer的详细内容
							that.peerConnection.setRemoteDescription(
								new SessionDescription(JSON.parse(offer))
								);
							//生成一个answer作为对offer的响应，激活视频聊天所需的双向点对点连接
							that.peerConnection.createAnswer(function(answer){
								//保存生成的answer，作为本地连接的详细内容
								that.peerConnection.setLocalDescription(answer);

								//保存answer的详细内容在firebase。使该内容可以为邀请方所访问，从而建立通信通道
								that.saveData(that.chatRoomName,"answer",JSON.stringify(answer));

							},onError,_constraints);

						});
					}
				},onError);
			},

			//定义个启动视频聊天通话，返回生成聊天室名称，将此聊天室名称告知远程用户，以作连接
			startCall:function(){
				//生成一个随机的3位数，不足3位时以0补足
				var randomNumber=Math.round(Math.random()*999);
				if (randomNumber<10) {
					randomNumber="00"+randomNumber;
				}else if (randomNumber<100) {
					randomNumber="0"+randomNumber;
				}

				//基于生成的随机数来创建一个简单的聊天室名称
				this.chatRoomName="room-"+randomNumber;

				//执行call（）方法，使用这个聊天室名称开始进行视频和音频的传输和接收
				this.call();

				//返回所生成的聊天室名称，这样，就可将此名称提供给远程方用于建立连接
				return this.charRoomName;
			},

			//定义方法，加入一个已经存在的视频聊天通话
			joincall:function(chatRoomName){
				//保存所提供的聊天室名称

				this.chatRoomName=chatRoomName;

				//如果我们要加入一个已经存在的通话，则我们必须是响应者，不是发起者，因此，更新相关属性
				this.participantType=_participantType.RESPONSER;
				this.remoteParticipantType=_participantType.INITIATOR;

				//执行call（）方法。使用这个聊天室名称开始进行视频和音频的传输和接收
				this.call();
			}
		};
		return VideoChat;

}(Firebase||function(){}));