#include "card_effects.h"

namespace Game {

namespace {

// A x3 card hits three neighbouring dice starting at the chosen one;
// near the end of the register fewer dice are affected.
void rotateRange(Register &reg, size_t start, Die::Axis axis) {
    size_t end = start + 3;
    if (end > reg.dice.size()) {
        end = reg.dice.size();
    }
    for (size_t i = start; i < end; i++) {
        reg.dice[i].rotate(axis, 180);
    }
}

}  // namespace

bool needsTarget(CardRegistry::CardType type) {
    // Every current card is aimed at a cubit; keep the switch so that each
    // new card type forces a conscious choice.
    switch (type) {
        case CardRegistry::CardType::PauliX:
        case CardRegistry::CardType::PauliY:
        case CardRegistry::CardType::PauliZ:
        case CardRegistry::CardType::PauliX3:
        case CardRegistry::CardType::PauliY3:
        case CardRegistry::CardType::PauliZ3:
            return true;
    }
    return true;
}

void applyCard(CardRegistry::CardType type, GameState &state, const Target &target) {
    Register &reg = state.registers[target.player];

    // Pauli gates are 180 degree rotations around the matching axis.
    switch (type) {
        case CardRegistry::CardType::PauliX:
            reg.dice[target.cubit].rotate(Die::Axis::X, 180);
            break;
        case CardRegistry::CardType::PauliY:
            reg.dice[target.cubit].rotate(Die::Axis::Y, 180);
            break;
        case CardRegistry::CardType::PauliZ:
            reg.dice[target.cubit].rotate(Die::Axis::Z, 180);
            break;
        case CardRegistry::CardType::PauliX3:
            rotateRange(reg, target.cubit, Die::Axis::X);
            break;
        case CardRegistry::CardType::PauliY3:
            rotateRange(reg, target.cubit, Die::Axis::Y);
            break;
        case CardRegistry::CardType::PauliZ3:
            rotateRange(reg, target.cubit, Die::Axis::Z);
            break;
    }
}

}  // namespace Game
