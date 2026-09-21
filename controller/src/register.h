#pragma once

#include <stddef.h>
#include <vector>

#include "die.h"

namespace Game {

// A register of dice: a fixed number of dice created in random states.
struct Register {
    std::vector<Die> dice;

    // Creates a register of `count` dice with random initial states.
    explicit Register(size_t count);

    // True only when both registers hold the same number of dice and
    // every die state matches (order matters).
    bool operator==(const Register &other) const;
};

} // namespace Game
