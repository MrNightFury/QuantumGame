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

// What input a card needs from the player before it can be applied. The
// controller collects the inputs and then calls applyCard once with all of
// them filled in.
enum class CardRequirement {
    None,          // no input: the card applies on its own
    OneTarget,     // a single cubit, chosen with "selectTarget" before the scan
    TwoTargets,    // a primary cubit ("selectTarget") plus a second one requested after the scan
    TargetAndFace, // a cubit plus a face chosen from a list that depends on the die state and the card
    PlayerChoice,  // choose a player (reserved: only two players today)
};

// Static per-card input requirements. The allowed-face list for
// TargetAndFace is computed separately, from the live state and the target.
CardRequirement cardRequirement(CardRegistry::CardType type);

// Whether the card is aimed with "selectTarget" before it is scanned.
// (Field-wide and turn-flow cards will not need a target.)
bool needsTarget(CardRegistry::CardType type);

// Inputs collected by the controller before the card is applied. Cards with
// a single extra input (a second target or a chosen face) set exactly one of
// hasSecond / hasFace.
struct CardParams {
    Target primary{0, 0};  // the aim chosen with "selectTarget"
    bool hasSecond = false;
    Target second{0, 0};
    bool hasFace = false;
    Die::Face face = Die::Face::One;
};

// Applies the card to the game state. Return true if the card was applied, false if it was ignored.
bool applyCard(CardRegistry::CardType type, GameState &state, const CardParams &params);

// Fills outFaces with the faces the card may set on the target die, given
// the live state. Returns the number of faces (0 = the card cannot be
// applied to this target). No current card type needs a face choice yet.
size_t allowedFaces(CardRegistry::CardType type, const GameState &state,
                    const Target &target, Die::Face *outFaces, size_t maxFaces);

// Cubit indices (relative to the target player's register) that the card
// affects when applied to `target`: 1 for single-cubit cards, up to 3 for
// the x3 cards (target in the middle, clamped at the register edges).
// Writes at most `maxCubits` indices into `outCubits` and returns the count.
size_t affectedCubits(CardRegistry::CardType type, const GameState &state,
                      const Target &target, size_t *outCubits, size_t maxCubits);

}  // namespace Game
