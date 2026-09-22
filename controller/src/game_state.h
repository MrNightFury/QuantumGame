#pragma once

#include <stddef.h>
#include <stdint.h>
#include <vector>

#include "card_registry.h"
#include "register.h"

namespace Game {

// Full state of a game in progress: players with their registers, the target
// register, whose turn it is and how many cards the current player has
// played this turn.
struct GameState {
    std::vector<uint8_t> playerIds;
    std::vector<Register> registers;
    Register targetRegister;
    size_t currentPlayer;
    // Cards played by the current player in this turn; reaching
    // CARDS_PER_TURN passes the turn to the next player.
    size_t playedCards;
    // Uids of the tag cards already played in this game. A physical card
    // can be played only once, so duplicates are recognized by uid.
    std::vector<std::vector<uint8_t>> playedCardUids;

    // History of the cards played on each cubit during the game, indexed by
    // [player][cubit]. Each entry lists the card types applied to that cubit
    // in play order; a future card will be able to undo the last one.
    std::vector<std::vector<std::vector<CardRegistry::CardType>>> cardHistory;

    // Whether the tag uid has already been played in this game.
    bool isCardPlayed(const uint8_t *uid, uint8_t uidLength) const;

    static const size_t CARDS_PER_TURN = 2;

    // Creates a game for `playerIds` where every register (each player's and
    // the target one) holds `diceCount` dice in random states. The first
    // player in `playerIds` moves first, no cards played yet.
    GameState(const std::vector<uint8_t> &playerIds, size_t diceCount);
};

} // namespace Game
