#pragma once

#include "card_registry.h"
#include "game_state.h"

namespace Game {

// Cubit chosen by the current player via "selectTarget"
struct Target {
    size_t player;  // index into GameState::playerIds
    size_t cubit;   // index into that player's register
};

// Pure card rules: mutate the game state, never talk to WS or Serial.
// The controller validates the turn and the target, applies the card and then notifies the players.

// What input a card needs from the player before it can be applied.
// The controller collects the inputs and then calls applyCard once with all of them filled in.
enum class CardRequirement {
    None,
    OneTarget,     // a single cubit ("selectTarget") selected before the scan
    TwoTargets,    // a primary cubit ("selectTarget") plus a second one requested after the scan
    TargetAndFace, // a cubit plus a face chosen from a list that depends on the die state and the card
    PlayerChoice,  // choose a player. For now there are only two so not used
};

// Static per-card input requirements
CardRequirement cardRequirement(CardRegistry::CardType type);

// Whether the card is aimed with "selectTarget" before it is scanned
bool needsTarget(CardRegistry::CardType type);

// Inputs collected by the controller before the card is applied.
// Cards with a single extra input set exactly one of hasSecond/hasFace.
struct CardParams {
    Target primary{0, 0};  // "selectTarget"
    bool hasSecond = false;
    Target second{0, 0};
    bool hasFace = false;
    Die::Face face = Die::Face::One;
};

// Applies the card to the game state. Return true if the card was applied, false if it was ignored.
bool applyCard(CardRegistry::CardType type, GameState &state, const CardParams &params);

// Check if card can be undone by Quantum Noise
// Single-cubit cards whose effect is exactly invertible (x3 and input cards are not)
bool isUndoable(CardRegistry::CardType type);

// QuantumNoise effect: undoes the last card recorded on the target cubit by applying the inverse effect
// Returns false when there is nothing to undo or the last card is not undoable
bool undoLastCard(GameState &state, const Target &target);

// Static playability check for a card aimed at `target`
// Returns nullptr when the card can be played, otherwise a textual reason id sent to the
// player as the "cantPlay" event ("windowDoesNotFit", "nothingToUndo").
// `cardsPlayedInPair` is the number of cards already applied in the active
// kronecker pair (0 outside a pair).
const char *cantPlayReason(CardRegistry::CardType type, const GameState &state,
                           const Target &target, size_t cardsPlayedInPair = 0);

// True when the last card recorded on the cubit is a measurement:
// the cubit is locked, only quantum noise may be played on it (it cancels the measurement).
bool cubitMeasured(const GameState &state, size_t player, size_t cubit);

// Fills outFaces with the faces the card may set on the target die, given the live state
// Returns the number of faces (0 = the card cannot be applied to this target)
size_t allowedFaces(CardRegistry::CardType type, const GameState &state,
                    const Target &target, Die::Face *outFaces, size_t maxFaces);

// Cubit indices (relative to the target player's register) that the card
// affects when applied to `target`: 1 for single-cubit cards, up to 3 for
// the x3 cards (target in the middle, clamped at the register edges).
// Writes at most `maxCubits` indices into `outCubits` and returns the count.
size_t affectedCubits(CardRegistry::CardType type, const GameState &state,
                      const Target &target, size_t *outCubits, size_t maxCubits);

// Records the played card in the history of every cubit it affected
// (the whole window for the x3 cards, both dice for swap, none for quantum_noise and cards without cubits)
void recordPlayedCards(CardRegistry::CardType type, GameState &state,
                       const CardParams &params);

}  // namespace Game
