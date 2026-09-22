#include "card_effects.h"

namespace Game {

namespace {

// Window of cubits hit by an x3 card: the target in the middle, clamped at
// the register edges.
void x3Window(size_t targetCubit, size_t diceCount, size_t *start, size_t *end) {
    *start = (targetCubit > 0) ? targetCubit - 1 : 0;
    *end = (*start + 2 < diceCount) ? *start + 2 : diceCount;
}

// A x3 card hits three neighbouring, target dice is in middle
void rotateRange(Register &reg, size_t start, Die::Axis axis) {
    size_t windowStart, windowEnd;
    x3Window(start, reg.dice.size(), &windowStart, &windowEnd);
    for (size_t i = windowStart; i < windowEnd; i++) {
        reg.dice[i].rotate(axis, 180);
    }
}

const Game::Die::Face HADAMARD[6] = {
    Game::Die::Face::Zero,      // +
    Game::Die::Face::One,       // -
    Game::Die::Face::MinusI,    // +i
    Game::Die::Face::PlusI,     // -i
    Game::Die::Face::Plus,      // 0
    Game::Die::Face::Minus      // 1
};
}; // namespace



CardRequirement cardRequirement(CardRegistry::CardType type) {
    switch (type) {
        case CardRegistry::CardType::PauliX:
        case CardRegistry::CardType::PauliY:
        case CardRegistry::CardType::PauliZ:
        case CardRegistry::CardType::PauliX3:
        case CardRegistry::CardType::PauliY3:
        case CardRegistry::CardType::PauliZ3:

        case CardRegistry::CardType::Hadamard:
        case CardRegistry::CardType::Hadamard3:
            return CardRequirement::OneTarget;
    }
    return CardRequirement::None;
}

bool needsTarget(CardRegistry::CardType type) {
    switch (cardRequirement(type)) {
        case CardRequirement::OneTarget:
        case CardRequirement::TwoTargets:
        case CardRequirement::TargetAndFace:
            return true;
        default:
            return false;
    }
}

bool applyCard(CardRegistry::CardType type, GameState &state, const CardParams &params) {
    Register &reg = state.registers[params.primary.player];

    // Pauli gates are 180 degree rotations around the matching axis.
    switch (type) {
        case CardRegistry::CardType::PauliX:
            reg.dice[params.primary.cubit].rotate(Die::Axis::X, 180);
            break;
        case CardRegistry::CardType::PauliY:
            reg.dice[params.primary.cubit].rotate(Die::Axis::Y, 180);
            break;
        case CardRegistry::CardType::PauliZ:
            reg.dice[params.primary.cubit].rotate(Die::Axis::Z, 180);
            break;
        case CardRegistry::CardType::PauliX3:
            rotateRange(reg, params.primary.cubit, Die::Axis::X);
            break;
        case CardRegistry::CardType::PauliY3:
            rotateRange(reg, params.primary.cubit, Die::Axis::Y);
            break;
        case CardRegistry::CardType::PauliZ3:
            rotateRange(reg, params.primary.cubit, Die::Axis::Z);
            break;
        case CardRegistry::CardType::Hadamard:
            reg.dice[params.primary.cubit].face = HADAMARD[(uint8_t)reg.dice[params.primary.cubit].face];
            break;
        case CardRegistry::CardType::Hadamard3: {
            size_t windowStart, windowEnd;
            x3Window(params.primary.cubit, reg.dice.size(), &windowStart, &windowEnd);
            for (size_t i = windowStart; i < windowEnd; i++) {
                reg.dice[i].face = HADAMARD[(uint8_t)reg.dice[i].face];
            }
            break;
        }
        default:
            break;
    }
    return true;
}

// Cubit indices (relative to the target player's register) that the card
// affects when applied to `target`: 1 for single-cubit cards, up to 3 for
// the x3 cards (target in the middle, clamped at the register edges).
// Writes at most `maxCubits` indices into `outCubits` and returns the count.
size_t affectedCubits(CardRegistry::CardType type, const GameState &state,
                      const Target &target, size_t *outCubits, size_t maxCubits) {
    size_t count = 0;
    switch (type) {
        case CardRegistry::CardType::PauliX:
        case CardRegistry::CardType::PauliY:
        case CardRegistry::CardType::PauliZ:
            if (maxCubits >= 1) {
                outCubits[0] = target.cubit;
                count = 1;
            }
            break;
        case CardRegistry::CardType::PauliX3:
        case CardRegistry::CardType::PauliY3:
        case CardRegistry::CardType::PauliZ3:
        case CardRegistry::CardType::Hadamard3: {
            size_t windowStart, windowEnd;
            x3Window(target.cubit, state.registers[target.player].dice.size(),
                     &windowStart, &windowEnd);
            for (size_t i = windowStart; i < windowEnd && count < maxCubits; i++) {
                outCubits[count++] = i;
            }
            break;
        }
        default:
            break;
    }
    return count;
}

size_t allowedFaces(CardRegistry::CardType type, const GameState &state,
                    const Target &target, Die::Face *outFaces, size_t maxFaces) {
    // No current card type asks for a face choice; fill this in when one does.
    (void)type;
    (void)state;
    (void)target;
    (void)outFaces;
    (void)maxFaces;
    return 0;
}

}  // namespace Game

