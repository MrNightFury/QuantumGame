#include "game_state.h"

#include <string.h>

namespace Game {

GameState::GameState(const std::vector<uint8_t> &playerIds, size_t diceCount)
    : targetRegister(diceCount), currentPlayer(0), playedCards(0) {
    this->playerIds = playerIds;
    registers.reserve(playerIds.size());
    for (size_t i = 0; i < playerIds.size(); i++) {
        registers.emplace_back(diceCount);
    }
    cardHistory.resize(playerIds.size());
    for (std::vector<std::vector<CardRegistry::CardType>> &playerHistory : cardHistory) {
        playerHistory.resize(diceCount);
    }
}

bool GameState::isCardPlayed(const uint8_t *uid, uint8_t uidLength) const {
    for (const std::vector<uint8_t> &played : playedCardUids) {
        if (played.size() == uidLength && memcmp(played.data(), uid, uidLength) == 0) {
            return true;
        }
    }
    return false;
}

} // namespace Game
