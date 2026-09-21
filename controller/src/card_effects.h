#pragma once

#include "card_registry.h"
#include "game_state.h"

namespace Game {

// Cubit chosen by the current player via "selectTarget".
struct Target {
    size_t player;  // index into GameState::playerIds
    size_t cubit;   // index into that player's register
};

// Pure card rules: mutate the game state, never talk to WS or Serial.
// The controller validates the turn and the target, applies the card and
// then notifies the players.

// Whether the card is aimed with "selectTarget" before it is scanned.
// (Field-wide and turn-flow cards will not need a target.)
bool needsTarget(CardRegistry::CardType type);

// Applies the card to the game state. The switch is exhaustive: adding a
// card type forces a decision here.
void applyCard(CardRegistry::CardType type, GameState &state, const Target &target);

}  // namespace Game
