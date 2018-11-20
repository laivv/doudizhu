const express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http);
app.use(express.static(`${__dirname}/static`));
app.get('/', function (req, res) {
	res.sendFile(`${__dirname}/index.html`);
});

const deskList = [
	{
		deskId: 1,
		positions: [
			{
				id: 0,
				isEmpty: true,
				userName: ''
			},
			{
				id: 1,
				isEmpty: true,
				userName: ''
			},
			{
				id: 2,
				isEmpty: true,
				userName: ''
			}
		]
	},
	{
		deskId: 2,
		positions: [
			{
				id: 0,
				isEmpty: true,
				userName: ''
			},
			{
				id: 1,
				isEmpty: true,
				userName: ''
			},
			{
				id: 2,
				isEmpty: true,
				userName: ''
			}
		]
	}
];

function time(){
	return (new Date()).toLocaleTimeString();
}



function GameServer(port) {
	this.clients = [];
	this.port = port;
	this.desks = deskList;
}
const proto = {
	broadCastHouse(event, data, socket) {
		socket = socket === undefined ? null : socket;
		this.clients.forEach((client, index) => {
			if (client.deskId === '') {
				client.socket.emit(event, data);
			}
		});
	},
	broadCastRoom(event, deskId, data, socket) {
		socket = socket === undefined ? null : socket;

		this.clients.forEach((client, index) => {
			if (client.deskId === deskId && client.socket !== socket) {
				client.socket.emit(event, data);
			}
		});
	},
	getDesk(deskId) {
		for (let i = 0, len = this.desks.length; i < len; i++) {
			let desk = this.desks[i];
			if (desk.deskId == deskId) {
				return desk;
			}
		}
		return null;
	},
	getPosition(desk, posId) {
		for (let i = 0, len = desk.positions.length; i < len; i++) {
			let position = desk.positions[i];
			if (position.id == posId) {
				return position;
			}
		}
		return null;
	},
	isEmptyPos(deskId, posId) {
		const desk = this.getDesk(deskId);
		if (!desk) {
			return false;
		}
		const position = this.getPosition(desk, posId);
		return position && position.isEmpty;
	},
	updatePosStatus(deskId, posId, isEmpty) {
		const desk = this.getDesk(deskId);
		if (desk) {
			const position = this.getPosition(desk, posId);
			if (position) {
				position.isEmpty = isEmpty;
			}
		}
	},
	removeClient(socket) {
		for (let i = 0, len = this.clients.length; i < len; i++) {
			if (this.clients[i].socket === socket) {
				this.clients.splice(i, 1);
				break;
			}
		}
	},
	addClient(socket, data) {
		this.clients.push({ userName: '游客', socket: socket, deskId: '', posId: '' });
	},
	getClient(socket) {
		for (let i = 0, len = this.clients.length; i < len; i++) {
			let client = this.clients[i];
			if (client.socket == socket) {
				return client;
			}
		}
		return null;
	},
	updateClientState(socket, deskId, posId) {
		let client = this.getClient(socket)
		if (client) {
			client.deskId = deskId !== undefined ? deskId : '';
			client.posId = posId !== undefined ? posId : '';
		}
	},
	getUserName(socket) {
		for (let i = 0, len = this.clients.length; i < len; i++) {
			if (this.clients[i].socket == socket) {
				return this.clients[i].nick;
			}
		}
		return null;
	},
	checkUserName(userName) {
		for (let i = 0, len = this.clients.length; i < len; i++) {
			if (this.clients[i].userName === userName) {
				return true;
			}
		}
		return false;
	},
	init() {
		io.on('connection', socket => {
			this.addClient(socket);
			socket.emit('LOGIN_SUCCESS', this.desks);
			console.log('有客户端进入大厅 %s', time());

			socket.on('SITDOWN', data => {
				const { deskId, posId } = data;
				//检查该座位是否是空闲状态
				if (this.isEmptyPos(deskId, posId)) {
					console.log('有客户端进入房间，桌号：%s，座位：%s，时间： %s', deskId, posId, time());
					//更新座位状态为占用
					this.updatePosStatus(deskId, posId, false);
					//绑定客户端桌号，座位号
					this.updateClientState(socket, deskId, posId);
					//通知该客户端坐下成功
					socket.emit('SITDOWN_SUCCESS', data);
					//通知在大厅游览的所有客户端当前坐位已被占用
					this.broadCastHouse('STATUS_CHANGE', { deskId, posId, isEmpty: false });

					//通知在房间里的其它客户端，有当前客户端加入
					this.broadCastRoom("POS_STATUS_CHANGE", deskId, { posId, isEmpty: false, prepare: false }, socket);
				} else {
					//通知该客户端此座位被人占用
					socket.emit('SITDOWN_ERROR', { msg: '该位置已有人' });
					//由于当前位置被占用可能是由于该客户端数据不同步造成，所以再次向该客户端推送一次所有桌数据
					socket.emit('DESK_LIST', this.desks);
				}
			});

			socket.on('UNSITDOWN', data => {
				const client = this.getClient(socket);
				const { deskId, posId } = client;
				console.log('有客户端退出房间，桌号：%s，座位：%s，时间：', deskId, posId, time());
				this.updatePosStatus(deskId, posId, true);
				this.updateClientState(socket);
				socket.emit('UNSITDOWN_SUCCESS', this.desks);
				this.broadCastHouse('STATUS_CHANGE', { deskId, posId, isEmpty: true });
			});

			socket.on('disconnect', data => {
				const client = this.getClient(socket);
				const { deskId, posId } = client;
				this.removeClient(socket);
				this.updatePosStatus(deskId, posId, true);
				this.broadCastHouse('STATUS_CHANGE', { deskId, posId, isEmpty: true });
				console.log('有客户端断开了连接 %s', time());
			})
		});


		http.listen(this.port, () => {
			console.log(`server is running on port ${this.port}`);
			(require('os').platform() == 'win32') && require('child_process').exec(`start http://localhost:${this.port}/index.html`);
		});
	}
}
Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer(8001);
gameServer.init();
