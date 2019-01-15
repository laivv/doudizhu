//数组排序
function arraySort(array, asc) {
  return array.sort(function (a, b) {
    return asc === 'asc' ? a - b : b - a;
  })
}

//数组去重
function arrayClearRepeat(array) {
  var ret = [];
  array.forEach(function (item) {
    if (ret.indexOf(item) === -1) {
      ret.push(item);
    }
  });
  return ret;
}

//从一个数组中过滤掉 <= n 的成员
function removeItemLessOf(array, n) {
  return array.filter(function (item) {
    return item > n;
  });
}


//筛选数组中累计出现过至少n次的成员
function getCardByCountOverOf(array, n) {
  var ret = getGroupByCard(array);
  var r = [];
  for (var i in ret) {
    if (ret[i] >= n) {
      r.push(parseInt(i));
    }
  }
  return r;
}

// 去除数组中指定的项
function removeItem(array, item) {
  var ret = [];
  array.forEach(function (i) {
    if (i !== item) {
      ret.push(i);
    }
  });
  return ret;
}


function A(option, cards) {
  cards = arrayClearRepeat(cards);
  cards = removeItemLessOf(cards, option.key);
  cards = arraySort(cards, 'asc');
  return cards.map(function (card) {
    return [card];
  })
}
function AA(option, cards) {
  cards = getCardByCountOverOf(cards, 2);
  cards = arrayClearRepeat(cards);
  cards = removeItemLessOf(cards, option.key);
  cards = arraySort(cards, 'asc')
  var ret = [];
  cards.forEach(function (card) {
    ret.push([card, card]);
  })
  return ret;
}

function AAA(option, cards) {
  cards = getCardByCountOverOf(cards, 3);
  cards = arrayClearRepeat(cards);
  cards = removeItemLessOf(cards, option.key);
  cards = arraySort(cards, 'asc');
  var ret = [];
  cards.forEach(function (card) {
    ret.push([card, card, card]);
  })
  return ret;
}

function AAAA(option, cards) {
  cards = getCardByCountOverOf(cards, 4);
  cards = arrayClearRepeat(cards);
  cards = removeItemLessOf(cards, option.key);
  cards = arraySort(cards, 'asc');
  var ret = [];
  cards.forEach(function (card) {
    ret.push([card, card, card, card]);
  })
  return ret;
}
function KING(option, cards) {
  return cards.indexOf(16) > -1 && cards.indexOf(17) > - 1 ? [[16, 17]] : [];
}

// function AAAB(option, cards) {
//   var cards_3 = getCardByCountOverOf(cards, 3);
//   cards_3 = removeItemLessOf(cards_3, option.key)
// }

var mapping = {
  A: [A, AAAA, KING],
  AA: [AA, AAAA, KING],
  AAA: [AAA, AAAA, KING],
  AAAB: [AAAB, AAAA, KING],
  AAAA: [AAAA, KING],
  AAABB: [AAABB, AAAA, KING],
  ABCDE: [ABCDE, AAAA, KING],
  AABBCC: [AABBCC, AAAA, KING],
  AAABBB: [AAABBB, AAAA, KING],
  AAAABC: [AAAABC, AAAA, KING],
  AAAABBCC: [AAAABBCC, AAAA, KING],
  KING: []


}

function getSuggest(option, cards) {
  var hooks = mapping[option.type];
  var ret = [];
  hooks.forEach(function (invoke) {
    var retItem = invoke(option, cards);
    if (retItem.length) {
      ret = ret.concat(retItem);
    }
  })
  return ret;
}