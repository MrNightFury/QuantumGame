#include "register.h"

namespace Game {

Register::Register(size_t count) {
    dice.reserve(count);
    for (size_t i = 0; i < count; i++) {
        dice.emplace_back(static_cast<Die::Face>(random(6)));
    }
}

bool Register::operator==(const Register &other) const {
    if (dice.size() != other.dice.size()) {
        return false;
    }
    for (size_t i = 0; i < dice.size(); i++) {
        if (dice[i].face != other.dice[i].face) {
            return false;
        }
    }
    return true;
}

} // namespace Game
