#include "card_effects.h"

namespace Game {

namespace {

// Window of cubits hit by an x3 card: the target in the middle, clamped at
// the register edges.
void x3Window(size_t targetCubit, size_t diceCount, size_t *start, size_t *end) {
    *start = (targetCubit > 0) ? targetCubit - 1 : 0;
    *end = (*start + 3 < diceCount) ? *start + 3 : diceCount;
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

// The card whose application reverses the given undoable card.
CardRegistry::CardType inverseOf(CardRegistry::CardType type) {
    switch (type) {
        case CardRegistry::CardType::PhaseForward:
            return CardRegistry::CardType::PhaseBackward;
        case CardRegistry::CardType::PhaseBackward:
            return CardRegistry::CardType::PhaseForward;
        default:
            // pauli_* (180 degrees) and hadamard are their own inverses.
            return type;
    }
}
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
        case CardRegistry::CardType::PhaseForward:
        case CardRegistry::CardType::PhaseBackward:
        case CardRegistry::CardType::QuantumNoise:
        case CardRegistry::CardType::Measurement:
            return CardRequirement::OneTarget;
        case CardRegistry::CardType::RotateX:
        case CardRegistry::CardType::RotateY:
        case CardRegistry::CardType::RotateZ:
        case CardRegistry::CardType::QuantumLucky:
            return CardRequirement::TargetAndFace;
        case CardRegistry::CardType::Swap:
            return CardRequirement::TwoTargets;
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
        case CardRegistry::CardType::PhaseForward:
            reg.dice[params.primary.cubit].rotate(Die::Axis::Z, 90);
            break;
        case CardRegistry::CardType::PhaseBackward:
            reg.dice[params.primary.cubit].rotate(Die::Axis::Z, -90);
            break;
        case CardRegistry::CardType::RotateX:
        case CardRegistry::CardType::RotateY:
        case CardRegistry::CardType::RotateZ: {
            // Turn the chosen die until it shows the requested face.
            Die::Axis axis = Die::Axis::Z;
            if (type == CardRegistry::CardType::RotateX) {
                axis = Die::Axis::X;
            } else if (type == CardRegistry::CardType::RotateY) {
                axis = Die::Axis::Y;
            }
            Die &die = reg.dice[params.primary.cubit];
            for (uint8_t step = 0; step < 4 && die.face != params.face; step++) {
                die.rotate(axis, 90);
            }
            break;
        }
        case CardRegistry::CardType::QuantumNoise:
            // Undo the last card on the chosen cubit; false = no effect.
            return undoLastCard(state, params.primary);
        case CardRegistry::CardType::QuantumLucky:
            // Set the chosen die to any of the six faces.
            reg.dice[params.primary.cubit].face = params.face;
            break;
        case CardRegistry::CardType::Swap: {
            // Exchange the states of the two chosen dice. The second die may
            // live in another player's register, so go through state.
            Die &first = state.registers[params.primary.player].dice[params.primary.cubit];
            Die &second = state.registers[params.second.player].dice[params.second.cubit];
            Die::Face temp = first.face;
            first.face = second.face;
            second.face = temp;
            break;
        }
        case CardRegistry::CardType::Barrier:
            // The next player in turn order skips their next turn. The flag
            // is consumed when the turn passes over them.
            state.skipNextTurn[(state.currentPlayer + 1) % state.playerIds.size()] = true;
            break;
        case CardRegistry::CardType::KroneckerMultiplication:
            // Turn-flow card: the pair mode it arms is handled by the
            // controller (commitCard), the game state itself is unchanged.
            break;
        case CardRegistry::CardType::Measurement:
            // The measurement does not change the die: it locks the cubit
            // (see cantPlayReason) until quantum noise cancels it.
            break;
        default:
            break;
    }
    return true;
}

bool isUndoable(CardRegistry::CardType type) {
    switch (type) {
        case CardRegistry::CardType::PauliX:
        case CardRegistry::CardType::PauliY:
        case CardRegistry::CardType::PauliZ:
        case CardRegistry::CardType::PhaseForward:
        case CardRegistry::CardType::PhaseBackward:
        case CardRegistry::CardType::Hadamard:
        case CardRegistry::CardType::Measurement:
            // Quantum noise cancels a measurement too: the marker has no
            // dice effect, so its inverse is a no-op.
            return true;
        default:
            return false;
    }
}

bool undoLastCard(GameState &state, const Target &target) {
    std::vector<CardRegistry::CardType> &history =
        state.cardHistory[target.player][target.cubit];
    if (history.empty() || !isUndoable(history.back())) {
        return false;
    }

    CardParams params;
    params.primary = target;
    applyCard(inverseOf(history.back()), state, params);
    history.pop_back();
    return true;
}

bool cubitMeasured(const GameState &state, size_t player, size_t cubit) {
    const std::vector<CardRegistry::CardType> &history =
        state.cardHistory[player][cubit];
    return !history.empty() &&
           history.back() == CardRegistry::CardType::Measurement;
}

const char *cantPlayReason(CardRegistry::CardType type, const GameState &state,
                           const Target &target, size_t cardsPlayedInPair) {
    // A measured cubit is locked: every aimed card is refused, including
    // x3 cards whose window merely touches it. Quantum noise is the only
    // exception - it cancels the measurement. (Swap's second die is
    // checked by the controller when the input arrives.)
    if (type != CardRegistry::CardType::QuantumNoise && needsTarget(type)) {
        if (cubitMeasured(state, target.player, target.cubit)) {
            return "measured";
        }
        size_t cubits[3];
        size_t count = affectedCubits(type, state, target, cubits, 3);
        for (size_t i = 0; i < count; i++) {
            if (cubitMeasured(state, target.player, cubits[i])) {
                return "measured";
            }
        }
    }

    switch (type) {
        case CardRegistry::CardType::PauliX3:
        case CardRegistry::CardType::PauliY3:
        case CardRegistry::CardType::PauliZ3:
        case CardRegistry::CardType::Hadamard3: {
            // The window keeps the target in the middle, so the first and
            // the last cubit of a register cannot host an x3 card.
            const std::vector<Die> &dice =
                state.registers[target.player].dice;
            if (dice.size() < 3 || target.cubit == 0 ||
                target.cubit + 1 >= dice.size()) {
                return "windowDoesNotFit";
            }
            return nullptr;
        }
        case CardRegistry::CardType::QuantumNoise: {
            const std::vector<CardRegistry::CardType> &history =
                state.cardHistory[target.player][target.cubit];
            if (history.empty()) {
                return "nothingToUndo";
            }
            if (!isUndoable(history.back())) {
                return "notUndoable";
            }
            return nullptr;
        }
        case CardRegistry::CardType::Barrier: {
            // The barrier flags the next player; flagging the same player
            // twice is pointless, so the second barrier is refused.
            size_t next = (state.currentPlayer + 1) % state.playerIds.size();
            if (state.skipNextTurn[next]) {
                return "barrierAlreadySet";
            }
            return nullptr;
        }
        case CardRegistry::CardType::Identity:
            // Identity only burns a card slot of the turn; it cannot open
            // the turn. Inside a kronecker pair the turn counter does not
            // grow yet, so the pair progress counts as "already played".
            return (state.playedCards == 0 && cardsPlayedInPair == 0)
                       ? "identityFirst"
                       : nullptr;
        default:
            return nullptr;
    }
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
        case CardRegistry::CardType::Hadamard:
        case CardRegistry::CardType::PhaseForward:
        case CardRegistry::CardType::PhaseBackward:
        case CardRegistry::CardType::RotateX:
        case CardRegistry::CardType::RotateY:
        case CardRegistry::CardType::RotateZ:
        case CardRegistry::CardType::QuantumLucky:
        case CardRegistry::CardType::Measurement:
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
    // Quantum lucky may set any of the six faces.
    if (type == CardRegistry::CardType::QuantumLucky) {
        size_t count = 0;
        while (count < 6 && count < maxFaces) {
            outFaces[count] = static_cast<Die::Face>(count);
            count++;
        }
        return count;
    }

    // Rotate cards may turn the die to any face reachable around their axis
    // (Die::reachable includes the current face - a full turn, no effect).
    Die::Axis axis;
    switch (type) {
        case CardRegistry::CardType::RotateX:
            axis = Die::Axis::X;
            break;
        case CardRegistry::CardType::RotateY:
            axis = Die::Axis::Y;
            break;
        case CardRegistry::CardType::RotateZ:
            axis = Die::Axis::Z;
            break;
        default:
            return 0;
    }

    Die::Face current = state.registers[target.player].dice[target.cubit].face;
    std::vector<Die::Face> faces = Die::reachable(current, axis);
    size_t count = 0;
    for (Die::Face face : faces) {
        if (count >= maxFaces) {
            break;
        }
        outFaces[count++] = face;
    }
    return count;
}

// Records the played card in the per-cubit histories: the whole window for
// x3 cards, both dice for swap, the single cubit for the rest.
void recordPlayedCards(CardRegistry::CardType type, GameState &state,
                       const CardParams &params) {
    if (type == CardRegistry::CardType::Swap) {
        state.cardHistory[params.primary.player][params.primary.cubit].push_back(type);
        state.cardHistory[params.second.player][params.second.cubit].push_back(type);
        return;
    }

    size_t cubits[3];
    size_t count = affectedCubits(type, state, params.primary, cubits, 3);
    for (size_t i = 0; i < count; i++) {
        state.cardHistory[params.primary.player][cubits[i]].push_back(type);
    }
}

}  // namespace Game

