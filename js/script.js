"use strict";

Array.prototype.remove = function (value) {
    var idx = this.indexOf(value);
    if (~idx) {
        this.splice(idx, 1);
    }
}

function Card(Value) {
    var IsShirtSide = false;
    var TimeoutRemoveImage = null;
    var Element = $('<li class="card-container">' +
    '<div class="card-item">' +
    '<div class="card-shirt" data-tid="Card"></div>' +
    '<div class="card-inside" data-tid="Card-flipped"></div>' +
    '</div>' +
    '</li>');

    var result = {
        ToShirt: function () {
            IsShirtSide = true;
            Element.find(".card-item").removeClass("invert");
            TimeoutRemoveImage = setTimeout(function () {
                IsShirtSide && Element.find(".card-inside").removeAttr("style");
            }, 300);
        },
        ToValue: function () {
            IsShirtSide = false;
            Element.find(".card-item").addClass("invert");
            TimeoutRemoveImage && clearTimeout(TimeoutRemoveImage);
            Element.find(".card-inside").css("background-image", "url('images/cards/" + Value + ".png')");
        },
        get Value() {
            return Value;
        },
        get Element() {
            return Element;
        },
        get IsShirtSide() {
            return IsShirtSide;
        }
    };

    $(Element).click(function () {
        result.OnClick && result.OnClick(result);
    });

    return result;
}

Card.GenerateCardItems = function(DIFFERENT_CARD_COUNT, OnCardItemCreated) {
    /* Generate card values*/
    var CARD_COMPONENTS = {
        NUMBERS: ['2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K', 'A'],
        SUITS: ['C', 'D', 'H', 'S']
    };

    var cardValues = [];
    while (cardValues.length != DIFFERENT_CARD_COUNT * 2) {
        var number_index = Math.floor(Math.random() * CARD_COMPONENTS.NUMBERS.length),
            suit_index = Math.floor(Math.random() * CARD_COMPONENTS.SUITS.length),
            card = CARD_COMPONENTS.NUMBERS[number_index] + CARD_COMPONENTS.SUITS[suit_index];
        if (cardValues.indexOf(card) == -1) {
            cardValues.push(card);
            cardValues.push(card);
        }
    }
    cardValues.sort(function () {
        return Math.random() - 0.5;
    });

    /* Generate Card object array */
    var cardItems = [];
    cardValues.forEach(function (cardValue, index) {
        var cardItem = new Card(cardValue);
        cardItems.push(cardItem);
        OnCardItemCreated && OnCardItemCreated(cardItem, index);
    });

    return cardItems;
}

function CardOpenThread() {
    var first = undefined,
        second = undefined;
    var pairCloseTimeout = null,
        shakeAnimationTimeout = null;

    var result = {
        Open: function (cardItem) {
            if (!cardItem.IsShirtSide) return;

            cardItem.ToValue();
            if (!first ) {
                first = cardItem;
            } else if (second) {
                result.Reset();
                first = cardItem;
                second = undefined;
            } else {
                second = cardItem;
                first.Value == second.Value ? CorrectPairOpened() : IncorrectPairOpened();
            }
        },
        Reset: function() {
            pairCloseTimeout && clearTimeout(pairCloseTimeout);
            shakeAnimationTimeout && clearTimeout(shakeAnimationTimeout);
            if (first) {
                $(first.Element).find(".card-item").finish().removeAttr("style");
                first.ToShirt();
                first = undefined;
            }
            if (second) {
                $(second.Element).find(".card-item").finish().removeAttr("style");
                second.ToShirt();
                second = undefined;
            }
        }
    }

    function CorrectPairOpened() {
        result.OnCorrectPairOpened && result.OnCorrectPairOpened(first, second);

        var _first = first,
            _second = second;

        setTimeout(function () {
            $(_first.Element).add(_second.Element).find(".card-item").effect("puff", {
                percent: 150
            }, 300);
        }, 300);

        setTimeout(function(){
            $(_first.Element).add(_second.Element).empty();
        }, 600);

        first = undefined;
        second = undefined;
    }

    function IncorrectPairOpened() {
        result.OnIncorrectPairOpened && result.OnIncorrectPairOpened(first, second);

        shakeAnimationTimeout = setTimeout(function () {
            $(first.Element).add(second.Element).find(".card-item").effect("shake", {
                distance: 2,
                times: 2
            }, 200);
        }, 300);

        pairCloseTimeout = setTimeout(function () {
            first.ToShirt();
            second.ToShirt();
            first = undefined;
            second = undefined;
        }, 800);
    }

    return result;
}

function Score() {
    var Total = 0;

    return {
        More: function (Delta) {
            Total += Delta;
            Delta != 0 && this.OnUpdateScoreTotal && this.OnUpdateScoreTotal(Delta, Total);
        },
        Less: function (Delta) {
            Total -= Delta;
            Delta != 0 && this.OnUpdateScoreTotal && this.OnUpdateScoreTotal(-Delta, Total);
        },
        Reset: function () {
            Total = 0;
            this.OnResetScore && this.OnResetScore();
        },
        get Total() {
            return Total;
        },
    }
}

var game = new function() {
    /* consts */
    var START_VIEW_DELAY = 5000;
    var DIFFERENT_CARD_COUNT = 9; // Correct values [1..52]

    /* Variables */
    var self = this;
    var score = new Score();
    var canReplay = true;
    var cards = {
        visible: [],
        thread: new CardOpenThread()
    }
    var selector = {
        gameScore: $("#game-score"),
        endScore: $("#end-score"),
        gameScoreDelta: $("#game-score-delta"),
        startPage: $("#start-page"),
        endPage: $("#end-page"),
        gamePage: $("#game-page"),
        cardList: $("#card-list"),
        replayButton: $("#replay-button")
    }
    
    /* Score settings */
    score.OnResetScore = function() {
        selector.gameScore.text(0);
        selector.endScore.text(0);
    }
    score.OnUpdateScoreTotal = function(Delta, Total) {
        var More = Delta > 0;

        selector.gameScoreDelta
            .text((More ? "+" : "") + Delta)
            .stop()
            .css({
                top: (More ? "-15px" : "inherit"),
                bottom: (!More ? "-15px" : "inherit"),
                color: (More ? "#0f0" : "#f00"),
                opacity: 1
            })
            .animate({
                top: (More ? "10px" : "inherit"),
                bottom: (!More ? "10px" : "inherit"),
                opacity: 0
            }, 1000);

        setTimeout(function() {
            selector.gameScore.text(Total);
        }, 200);
    }

    /* Card thread settings */
    cards.thread.OnCorrectPairOpened = function(first, second) {
        score.More(cards.visible.length / 2 * 42);

        cards.visible.remove(first);
        cards.visible.remove(second);

        !cards.visible.length && setTimeout(OnGameOver, 500);
    }

    cards.thread.OnIncorrectPairOpened = function(first, second) {
        score.Less((DIFFERENT_CARD_COUNT - cards.visible.length / 2) * 42);
    }

    /* Actions */
    this.Start = function() {
        selector.startPage.fadeOut(200);
        selector.endPage.fadeOut(200);
        setTimeout(function () {
            ResetValues();
            selector.gamePage.fadeIn(200);
        }, 200);
    }

    this.Replay = function() {
        if (canReplay && confirm("Вы точно хотите начать игру сначала?")) {
            selector.gamePage.fadeOut(200);
            self.Start();
        }
    }

    /* Functions */
    function ResetValues() {
        PreviewBlockReplayButton();

        selector.cardList.empty();

        cards.visible = Card.GenerateCardItems(DIFFERENT_CARD_COUNT, OnCardItemCreated);
        cards.thread.Reset();

        score.Reset();
    }

    function PreviewBlockReplayButton() {
        canReplay = false;
        selector.replayButton.addClass("game-restart-link-disabled");
        setTimeout(function () {
            selector.replayButton.removeClass("game-restart-link-disabled");
            canReplay = true;
        }, START_VIEW_DELAY + Math.ceil(DIFFERENT_CARD_COUNT / 6 + 5) * 100);
    }

    /* Event functions */
    function OnCardItemCreated(cardItem, index) {
        cardItem.OnClick = cards.thread.Open;
        selector.cardList.append(cardItem.Element);
        cardItem.ToValue();

        var Delay = START_VIEW_DELAY + (Math.floor(index / 6) + index % 6) * 100;
        setTimeout(cardItem.ToShirt, Delay);
    }

    function OnGameOver() {
        selector.endScore.text(score.Total);
        selector.gamePage.fadeOut(200);
        selector.endPage.delay(200).fadeIn(200);
    }

    /* Keydown actions */
    addEventListener("keydown", function (e) {
        var Enter = 13, Q = 81;
        if (selector.startPage.is(":visible") && e.keyCode == Enter) {
            game.Start();
        } else if (selector.gamePage.is(":visible") && e.keyCode == Q) {
            game.Replay();
        } else if (selector.endPage.is(":visible") && e.keyCode == Enter) {
            game.Start();
        }
    });
}