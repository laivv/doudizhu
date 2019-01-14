var validator = require('./core-validator');


//获取 0-num范围的随机整数
function getRandomNumForRange(num) {
  return Math.round(Math.random() * num);
}

const originalCards = [
  { value: 3, type: 0 }, { value: 3, type: 1 }, { value: 3, type: 2 }, { value: 3, type: 3 },
  { value: 4, type: 0 }, { value: 4, type: 1 }, { value: 4, type: 2 }, { value: 4, type: 3 },
  { value: 5, type: 0 }, { value: 5, type: 1 }, { value: 5, type: 2 }, { value: 5, type: 3 },
  { value: 6, type: 0 }, { value: 6, type: 1 }, { value: 6, type: 2 }, { value: 6, type: 3 },
  { value: 7, type: 0 }, { value: 7, type: 1 }, { value: 7, type: 2 }, { value: 7, type: 3 },
  { value: 8, type: 0 }, { value: 8, type: 1 }, { value: 8, type: 2 }, { value: 8, type: 3 },
  { value: 9, type: 0 }, { value: 9, type: 1 }, { value: 9, type: 2 }, { value: 9, type: 3 },
  { value: 10, type: 0 }, { value: 10, type: 1 }, { value: 10, type: 2 }, { value: 10, type: 3 },
  { value: 11, type: 0 }, { value: 11, type: 1 }, { value: 11, type: 2 }, { value: 11, type: 3 },
  { value: 12, type: 0 }, { value: 12, type: 1 }, { value: 12, type: 2 }, { value: 12, type: 3 },
  { value: 13, type: 0 }, { value: 13, type: 1 }, { value: 13, type: 2 }, { value: 13, type: 3 },
  { value: 14, type: 0 }, { value: 14, type: 1 }, { value: 14, type: 2 }, { value: 14, type: 3 },
  { value: 15, type: 0 }, { value: 15, type: 1 }, { value: 15, type: 2 }, { value: 15, type: 3 },
  { value: 16, type: 0 },
  { value: 17, type: 0 }
];


function Game() {
  this.contextCards = [];
  this.contextScore = [1, 2, 3];
  this.status = 0; //0未开始 1叫分 2游戏中 3结束 4需要重发 5错误
  this.ratio = 1;//分数翻倍数，
  this.lastCardInfo = {
    posId: '',
    len: 0,
    key: '',
    type: ''
  };
  this.contextPosId = '';
  this.userScore = {
    0: -1,
    1: -1,
    2: -1
  }
  // 每个位置出了几次牌 ，为了统计是否出现春天或反春
  this.sumCount = {
    0: 0,
    1: 0,
    2: 0,
  }

}
Object.assign(
  Game.prototype,
  {
    initCards() {
      var ret = [];
      var mCards = originalCards.slice(0);
      var maxIndex = mCards.length - 1;
      for (var i = 0; i < 3; i++) {
        var group = [];
        for (var j = 0; j < 17; j++) {
          var offset = getRandomNumForRange(maxIndex);
          group.push(mCards[offset]);
          mCards.splice(offset, 1);
          maxIndex--;
        }
        group = group.sort(function (a, b) {
          return a.value - b.value;
        });
        ret.push({ id: i, cards: group });
      }
      ret.push({ id: 3, cards: mCards });
      this.contextCards = ret;
      return ret;
    },
    //验证牌型 posId座位号
    validate(posId, cards) {
      var int_cards = cards.map(function (card) {
        return card.value;
      });
      if (!this.checkExist(cards, posId)) {
        return { status: false };
      }
      var ret = validator(int_cards);
      if (!ret.status) {
        return {
          status: false
        }
      }
      if (this.lastCardInfo.posId === posId) {
        return {
          status: true,
          key: ret.types[0].key,
          len: ret.len,
          type: ret.types[0].type
        }
      }

      if (this.lastCardInfo.type === 'KING') {
        return {
          status: false,
        }
      }
      for (let i = 0, len = ret.types.length; i < len; i++) {
        var type = ret.types[i].type;
        var key = ret.types[i].key;
        if (type === 'KING') {
          return {
            status: true,
            key,
            type,
            len: ret.len
          }
        }

        if (this.lastCardInfo.type === 'AAAA') {
          if (type === 'AAAA' && key > this.lastCardInfo.key) {
            return {
              status: true,
              key,
              type,
              len: ret.len
            }

          }
        } else {
          if (type === 'AAAA') {
            return {
              status: true,
              key,
              type,
              len: ret.len
            }
          } else {
            if (type === this.lastCardInfo.type && ret.len === this.lastCardInfo.len && key > this.lastCardInfo.key) {
              return {
                status: true,
                key,
                type,
                len: ret.len
              }
            }
          }
        }
      }
      return { status: false }
    },
    //检查牌是否存在，防客户端作弊
    checkExist(cards, posId) {
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var index = this.getCardIndexByPosId(card, posId);
        if (index === -1) {
          return false;
        }
      }
      return true;
    },
    removeCards(cards, posId) {
      var sourceCards = this.getCardsByPosId(posId);
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var index = this.getCardIndexByCards(card, sourceCards);
        if (index !== -1) {
          sourceCards.splice(index, 1);
        }
      }
    },
    getCardsByPosId(posId) {
      for (var i = 0, len = this.contextCards.length; i < len; i++) {
        var item = this.contextCards[i];
        if (item.id === posId) {
          return item.cards;
        }
      }
      return null;
    },
    getCardIndexByPosId(card, posId) {
      var cards = this.getCardsByPosId(posId);
      for (var i = 0, len = cards.length; i < len; i++) {
        var curr = cards[i];
        if (curr.value === card.value && curr.type === card.type) {
          return i;
        }
      }
      return -1;
    },
    mergeCardsByPosId(posId) {
      const cards = this.getCardsByPosId(posId);
      const topCards = this.getCardsByPosId(3);
      cards.push(...topCards);
    },
    getCardIndexByCards(card, cards) {
      for (var i = 0, len = cards.length; i < len; i++) {
        var curr = cards[i];
        if (curr.value === card.value && curr.type === card.type) {
          return i;
        }
      }
      return -1;
    },
    getCards() {
      return this.contextCards;
    },
    init() {
      this.contextCards = [];
      this.contextScore = [1, 2, 3];
      this.status = 0; //0未开始 1叫分 2游戏中 3结束 4需要重发 5错误
      this.ratio = 1;
      this.lastCardInfo = {
        posId: '',
        len: 0,
        key: '',
        type: ''
      };
      this.contextPosId = '';
      this.userScore = {
        0: -1,
        1: -1,
        2: -1
      }
      this.sumCount = {
        0: 0,
        1: 0,
        2: 0,
      }
      return this;

    },
    start() {
      this.status = 1;
      this.contextPosId = getRandomNumForRange(2);
      this.initCards();
      return this;
    },
    getStatus() {
      return this.status;
    },
    getContextPosId() {
      return this.contextPosId;
    },
    getContextScore() {
      return this.contextScore;
    },
    checkAllUserCalledScore() {
      var ret = true;
      for (var key in this.userScore) {
        if (this.userScore.hasOwnProperty(key)) {
          if (this.userScore[key] < 0) {
            ret = false;
          }
          if (this.userScore[key] === 3) {
            return true;
          }
        }
      }
      return ret;
    },
    getMaxScoreInfo() {
      let score = 0;
      let posId = 0;
      for (var key in this.userScore) {
        if (this.userScore.hasOwnProperty(key)) {
          if (this.userScore[key] > score) {
            score = this.userScore[key];
            posId = Number(key);
          }
        }
      }
      return {
        score,
        posId
      }
    },
    getDiZhuPosId() {
      return this.getMaxScoreInfo().posId;
    },
    getCalledScores() {
      return this.userScore;
    },
    getTopCards() {
      return this.getCardsByPosId(3);
    },
    isGameOver() {
      for (var i = 0; i < 3; i++) {
        if (!this.contextCards[i].cards.length) {
          return true;
        }
      }
      return false;
    },
    getResult() {
      const diZhuData = this.getMaxScoreInfo();
      const diZhuId = diZhuData.posId;
      const posIds = [0, 1, 2];
      var winnerId = '';
      var ret = {
        winner: [],
        loser: [],
        score: diZhuData.score,
        ratio: this.isSpring() ? ++this.ratio : this.ratio
      }
      for (var i = 0; i < 3; i++) {
        if (!this.contextCards[i].cards.length) {
          winnerId = this.contextCards[i].id;
          break;
        }
      }
      posIds.splice(posIds.indexOf(diZhuId), 1)
      if (winnerId === diZhuId) {
        ret.winner.push(diZhuId);
        ret.loser = posIds;
      } else if (winnerId !== diZhuId) {
        ret.winner = posIds;
        ret.loser.push(diZhuId);
      }
      return ret;
    },
    isSpring() {
      const diZhuId = this.getMaxScoreInfo().posId;
      const diZhuLen = this.getCardsByPosId(diZhuId).length;
      const posIds = [0, 1, 2];
      posIds.splice(posIds.indexOf(diZhuId), 1);
      const playerLen1 = this.getCardsByPosId(posIds[0]).length;
      const playerLen2 = this.getCardsByPosId(posIds[1]).length;
      return (diZhuLen === 0 && playerLen1 === 17 && playerLen2 === 17) || (diZhuLen !== 0 && this.sumCount[diZhuId] === 1 && (playerLen1 === 0 || playerLen2 === 0))
    },
    next(posId, data) {

      if (posId == this.contextPosId) {
        if (this.status === 1) {
          this.userScore[posId] = data;
          const maxScoreInfo = this.getMaxScoreInfo();
          if (this.checkAllUserCalledScore()) {
            if (maxScoreInfo.score > 0) {
              this.status = 2;
              this.contextPosId = Number(maxScoreInfo.posId);
              this.lastCardInfo.posId = this.contextPosId;
              this.mergeCardsByPosId(this.contextPosId);
            } else {
              //需要重新发牌
              this.status = 4;
            }

          } else {
            if (posId == 0) {
              this.contextPosId = 1;
            }
            if (posId == 1) {
              this.contextPosId = 2;
            }
            if (posId == 2) {
              this.contextPosId = 0;
            }

            if (maxScoreInfo.score < 1) {
              this.contextScore = [1, 2, 3];
            } else if (maxScoreInfo.score == 1) {
              this.contextScore = [2, 3];
            } else if (maxScoreInfo.score == 2) {
              this.contextScore = [3];
            } else {
              this.contextScore = [];
            }

          }

        } else if (this.status === 2) {
          if (posId == 0) {
            this.contextPosId = 1;
          }
          if (posId == 1) {
            this.contextPosId = 2;
          }
          if (posId == 2) {
            this.contextPosId = 0;
          }

          const { type, len, key, status } = this.validate(posId, data);
          if (status) {
            this.lastCardInfo.type = type
            this.lastCardInfo.len = len
            this.lastCardInfo.key = key;
            this.lastCardInfo.posId = posId;

            if (type === 'AAAA' || type === 'KING') {
              this.ratio++;
            }
            this.sumCount[posId]++;
          }


          this.removeCards(data, posId);
          if (this.isGameOver()) {
            this.status = 3;
          }
        }
      } else {
        this.status = 5;
      }
      return this;
    }

  }

)


module.exports = Game;