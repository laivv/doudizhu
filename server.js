const express = require('express'),
  app = express(),
  http = require('http').Server(app),
  io = require('socket.io')(http);
app.use(express.static(`${__dirname}/static`));
app.get('/', function (req, res) {
  res.sendFile(`${__dirname}/index.html`);
});
const Game = require('./game.js');
function createDeskList(n) {
  n = n || 50;
  const ret = [];
  for (let i = 1; i <= n; i++) {
    const desk = {
      deskId: i,
      state: 0,
      positions: []
    }
    for (let j = 0; j < 3; j++) {
      desk.positions.push({
        posId: j,
        state: 0,
        userName: ''
      })
    }
    ret.push(desk);
  }
  return ret;
}

function time() {
  return (new Date()).toLocaleTimeString();
}


var guid = function () {
  var n = 0;
  return function () {
    return ++n;
  }
}();


function GameServer(port) {
  this.clients = [];
  this.port = port;
  this.desks = createDeskList(20);
  this.gameDatas = {};
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
  getOtherPosInfo(deskId, posId) {
    let desk = this.getDesk(deskId);
    if (desk) {
      let positions = desk.positions;
      return positions.filter(function (pos) {
        return pos.posId !== posId;
      })
    }
    return [];
  },
  updateOtherPosStatus(deskId, posId, state) {
    let desk = this.getDesk(deskId);
    if (desk) {
      let positions = desk.positions;
      positions.forEach(function (pos) {
        if (pos.posId !== posId) {
          pos.state = state;
        }
      }.bind(this));
    }

  },
  getPosition(desk, posId) {
    for (let i = 0, len = desk.positions.length; i < len; i++) {
      let position = desk.positions[i];
      if (position.posId == posId) {
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
    return position && position.state === 0;
  },
  updatePosStatus(deskId, posId, state, userName) {
    const desk = this.getDesk(deskId);
    if (desk) {
      const position = this.getPosition(desk, posId);
      if (position) {
        position.state = state;
        if (userName === '' || userName) {
          position.userName = userName;
        }
      }
    }
  },
  updateRoomStatus(deskId, state) {
    const desk = this.getDesk(deskId);
    if (desk) {
      desk.state = state;
      return true;
    }
    return false;
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
    this.clients.push({ userName: data.userName, socket: socket, deskId: '', posId: '' });
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
        return this.clients[i].userName;
      }
    }
    return null;
  },
  checkUserName(userName) {
    for (let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].userName === userName) {
        return false;
      }
    }
    return true;
  },
  checkPrepareAll(deskId) {
    const desk = this.getDesk(deskId);
    if (desk) {
      const positions = desk.positions;
      for (let i = 0; i < 3; i++) {
        if (positions[i].state !== 2) {
          return false;
        }
      }
      return true;
    }
    return false;
  },
  startGame(deskId) {
    if (this.gameDatas[deskId] === undefined) {
      this.gameDatas[deskId] = new Game();
    }
    const game = this.gameDatas[deskId];
    game.init();
    const cards = game.start().getCards();
    this.broadCastRoom('GAME_START', deskId, { cards });
    this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos: game.getContextPosId(), ctxScore: game.getContextScore(), timeout: 15 });
  },
  init() {
    io.on('connection', socket => {
      console.log('有客户端接入，时间： %s', time());
      socket.on('LOGIN', userName => {
        if (this.checkUserName(userName)) {
          this.addClient(socket, { userName });
          socket.emit('LOGIN_SUCCESS', this.desks);
          console.log('有客户端登录，时间： %s', time());
        } else {
          socket.emit('LOGIN_FAIL', { msg: '该用户名已存在' });
        }
      });

      //快速加入
      socket.on('QUICK_JOIN', () => {
        var ret = [];
        this.desks.forEach(desk => {
          let n = 0;
          let item = {
            deskId: desk.deskId,
            positions: []
          };
          const positions = desk.positions;
          positions.forEach(pos => {
            if (pos.state > 0) {
              n++;
            } else {
              item.positions.push(pos.posId)
            }
          });
          if (n <= 2) {
            ret.push(item);
          }
        });
        ret = ret.sort((a, b) => {
          return a.positions.length - b.positions.length;
        });
        const matched = ret.length ? ret[0] : false;
        const data = matched ? { deskId: matched.deskId, posId: matched.positions[0], success: true } : { success: false }
        socket.emit('QUICK_JOIN', data)

      });

      socket.on('SITDOWN', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = data;
        //检查该座位是否是空闲状态
        if (this.isEmptyPos(deskId, posId)) {
          console.log('有客户端进入房间，桌号：%s，座位：%s，时间： %s', deskId, posId, time());
          //更新座位状态为占用
          this.updatePosStatus(deskId, posId, 1, this.getUserName(socket));
          //绑定客户端桌号，座位号
          this.updateClientState(socket, deskId, posId);
          //获取除当前房间其它座位信息
          let posInfos = this.getOtherPosInfo(deskId, posId);
          //通知该客户端坐下成功 并发送当前房间的信息给该客户端
          socket.emit('SITDOWN_SUCCESS', { ...data, posInfos });
          //通知在大厅游览的所有客户端当前坐位已被占用
          this.broadCastHouse('STATUS_CHANGE', { deskId, posId, state: 1 });

          //通知在房间里的其它客户端，更新座位息
          this.broadCastRoom("POS_STATUS_CHANGE", deskId, { posId, state: 1, userName: this.getUserName(socket) }, socket);

          //推送一条无关紧要的消息
          socket.emit('USER_MESSAGE', { type: 'SYS', posId, msg: '欢迎您加入本房间，祝您游戏愉快！', id: guid(), time: time() });
          this.broadCastRoom('USER_MESSAGE', deskId, { type: 'SYS', posId, msg: `玩家[${this.getUserName(socket)}]进入房间`, id: guid(), time: time() }, socket);
        } else {
          //通知该客户端此座位被人占用
          socket.emit('SITDOWN_ERROR', { msg: '该位置已有人' });
          //由于当前位置被占用可能是由于该客户端数据不同步造成，所以再次向该客户端推送一次所有桌数据
          socket.emit('REFRESH_LIST', this.desks);
        }
      });

      socket.on('UNSITDOWN', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        if (!deskId) {
          return;
        }
        console.log('有客户端退出房间，桌号：%s，座位：%s，时间：', deskId, posId, time());
        //更新座位状态
        this.updatePosStatus(deskId, posId, 0, '');
        //重置房间状态
        this.updateRoomStatus(deskId, posId, 0);
        //解绑座位号 桌号
        this.updateClientState(socket);
        //通知在房间里的其它客户端，更新座位息
        this.broadCastRoom("POS_STATUS_CHANGE", deskId, { posId, state: 0 }, socket);
        //通知大厅其它客户端更新该座位信息
        this.broadCastHouse('STATUS_CHANGE', { deskId, posId, state: 0 });

        //如果在游戏中，则有玩家强行退出，重置此房间其它玩家的状态为未准备
        //获取此桌游戏数据
        const game = this.gameDatas[deskId];
        //判断是否在进行游戏
        if (game) {
          const status = game.getStatus();
          if (game && status && status !== 3) {
            //更新其它两位玩家的座位状态为未准备
            this.updateOtherPosStatus(deskId, posId, 1);
            //获取其它两位玩家的座位信息
            const otherPosInfo = this.getOtherPosInfo(deskId, posId);
            //通知其它两位玩家重置自己的状态为未准备
            this.broadCastRoom("POS_STATUS_RESET", deskId, { pos: otherPosInfo, state: 1 });
            //通知其它两位玩家重置房间状态
            this.broadCastRoom('ROOM_STATUS_CHANGE', deskId, { state: 0 });
            //通知其它两位玩家当前玩家逃跑
            this.broadCastRoom('FORCE_EXIT_EV', deskId, { msg: '有玩家逃跑，游戏结束', posId });

            game.init();

          }
        }
        //通知当前玩家退出房间成功
        socket.emit('UNSITDOWN_SUCCESS', this.desks);


        //推送一条无关紧要的消息
        this.broadCastRoom('USER_MESSAGE', deskId, { type: 'SYS', posId, msg: `玩家[${this.getUserName(socket)}]退出房间`, id: guid(), time: time() })
      });

      socket.on('PREPARE', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        if (!deskId) {
          return;
        }
        //更新座位为准备状态
        this.updatePosStatus(deskId, posId, 2);
        //通知该客户端准备成功
        socket.emit('PREPARE_SUCCESS');
        //通知房间里的其它客户端更新座位信息
        this.broadCastRoom("POS_STATUS_CHANGE", deskId, { posId, state: 2 }, socket);

        //更新房间状态
        this.updateRoomStatus(deskId, 1);

        //检查是否全部准备完毕
        const isPrepareAll = this.checkPrepareAll(deskId);
        if (isPrepareAll) {
          this.startGame(deskId);
        }

      });

      socket.on('CALL_SCORE', data => {
        const { score } = data;
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        const game = this.gameDatas[deskId];
        if (!game || !deskId) {
          return;
        }
        const status = game.next(posId, score).getStatus();
        if (status == 1) {
          const ctxPos = game.getContextPosId();
          const ctxScore = game.getContextScore();
          const calledScores = game.getCalledScores();
          this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos, ctxScore, calledScores, timeout: 15 });
        }
        if (status == 2) {
          const topCards = game.getTopCards();
          const dizhuPosId = game.getDiZhuPosId();
          this.broadCastRoom('SHOW_TOP_CARD', deskId, { topCards, dizhuPosId, timeout: 15 });
          this.broadCastRoom('CTX_PLAY_CHANGE', deskId, {
            ctxData: {
              len: 0,
              key: '',
              type: '',
              cards: [],
              posId: dizhuPosId,
            },
            posId: dizhuPosId,
            timeout: 30,
            isPass: false,
          })
        }
        if (status == 4) {
          this.broadCastRoom('MESSAGE', deskId, { msg: '没有玩家叫分，重新发牌' });
          this.startGame(deskId);
          //推送一条无关紧要的消息
          this.broadCastRoom('USER_MESSAGE', deskId, { type: 'SYS', posId, msg: '本局游戏无人叫分，重新发牌', id: guid(), time: time() })

        }
      });


      socket.on('PLAY_CARD', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        const game = this.gameDatas[deskId];
        if (game && deskId) {
          const ret = game.validate(posId, data);
          const isPass = !data.length;
          const { status } = ret;
          if (status || !data.length) {
            game.next(posId, data);
            this.broadCastRoom('CTX_PLAY_CHANGE', deskId, {
              ctxData: {
                len: data.length,
                key: ret.key,
                type: ret.type,
                cards: data,
                posId
              },
              posId: game.getContextPosId(),
              timeout: 15,
              isPass
            })
            socket.emit('PLAY_CARD_SUCCESS', data)
            if (game.getStatus() === 3) {
              this.broadCastRoom('GAME_OVER', deskId, game.getResult())
              this.updatePosStatus(deskId, 0, 1)
              this.updatePosStatus(deskId, 1, 1)
              this.updatePosStatus(deskId, 2, 1)
              game.init();
            }

            if (game.getStatus() === 5) {
              socket.emit('PLAY_CARD_ERROR', '游戏出错')
            }
          } else {
            socket.emit('PLAY_CARD_ERROR', data)
          }
        }
      });

      socket.on('disconnect', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const userName = this.getUserName(socket);
        const { deskId, posId } = client;
        this.removeClient(socket);

        if (deskId) {
          //更新座位状态
          this.updatePosStatus(deskId, posId, 0, '');
          //重置房间状态
          this.updateRoomStatus(deskId, posId, 0);
          //解绑座位号 桌号
          this.updateClientState(socket);
          //通知在房间里的其它客户端，更新座位息
          this.broadCastRoom("POS_STATUS_CHANGE", deskId, { posId, state: 0 }, socket);
          //通知大厅其它客户端更新该座位信息
          this.broadCastHouse('STATUS_CHANGE', { deskId, posId, state: 0 });

          //如果在游戏中，则有玩家强行退出，重置此房间其它玩家的状态为未准备
          //获取此桌游戏数据
          const game = this.gameDatas[deskId];
          //判断是否在进行游戏
          if (game) {
            const status = game.getStatus();
            if (game && status && status !== 3) {
              //更新其它两位玩家的座位状态为未准备
              this.updateOtherPosStatus(deskId, posId, 1);
              //获取其它两位玩家的座位信息
              const otherPosInfo = this.getOtherPosInfo(deskId, posId);
              //通知其它两位玩家重置自己的状态为未准备
              this.broadCastRoom("POS_STATUS_RESET", deskId, { pos: otherPosInfo, state: 1 });
              //通知其它两位玩家重置房间状态
              this.broadCastRoom('ROOM_STATUS_CHANGE', deskId, { state: 0 });
              //通知其它两位玩家当前玩家逃跑
              this.broadCastRoom('FORCE_EXIT_EV', deskId, { msg: '有玩家逃跑，游戏结束', posId });
              game.init();
            }
          }
          //推送一条无关紧要的消息
          this.broadCastRoom('USER_MESSAGE', deskId, { type: 'SYS', posId, msg: `玩家[${userName}]退出房间`, id: guid(), time: time() })
          console.log('有客户端退出房间，桌号：%s，座位：%s，时间：', deskId, posId, time());
        }

        console.log('有客户端断开了连接 %s', time());
      })

      socket.on('USER_MESSAGE', msg => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        if (!deskId) {
          return;
        }
        this.broadCastRoom('USER_MESSAGE', deskId, { type: 'USER', posId, msg, time: time(), id: guid() })
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
