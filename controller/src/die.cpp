#include "die.h"

namespace {
// State of every face after a +90 degree rotation around each axis
// (rows: X, Y, Z). Faces lying on the rotation axis map to themselves.
//   X: "i" -> "0" -> "-i" -> "1" -> "i"
//   Y: "+" -> "1" -> "-" -> "0" -> "+"
//   Z: "+" -> "i" -> "-" -> "-i" -> "+"
// Something weird is happening with rotations... TODO - check on real cube and maybe fix later
// Oh, green is not... Ohh... Well... Green arrows is not full circle... It still works cause of cards set but... Better dont think about it
const Game::Die::Face ROTATE_PLUS_90[3][6] = {
    {Game::Die::Face::Plus, Game::Die::Face::Minus, Game::Die::Face::Zero, Game::Die::Face::One, Game::Die::Face::MinusI, Game::Die::Face::PlusI},
    {Game::Die::Face::One, Game::Die::Face::Zero, Game::Die::Face::PlusI, Game::Die::Face::MinusI, Game::Die::Face::Plus, Game::Die::Face::Minus},
    {Game::Die::Face::PlusI, Game::Die::Face::MinusI, Game::Die::Face::Minus, Game::Die::Face::Plus, Game::Die::Face::Zero, Game::Die::Face::One},
};
} // namespace  { Plus, Minus, PlusI, MinusI, Zero, One };

namespace Game {

Die::Die(Face face) : face(face) {}

const char *Die::toString(Face face) {
    static const char *const LABELS[6] = {"+", "-", "i", "-i", "0", "1"};
    return LABELS[(uint8_t)face];
}

const char *Die::faceString() const {
    return toString(face);
}

void Die::rotate(Axis axis, int degrees) {
    int steps;
    switch (degrees) {
        case 90:
            steps = 1;
            break;
        case 180:
            steps = 2;
            break;
        case -90:
            steps = 3;
            break;
        default:
            Serial.printf("[Die] ignoring rotation by %d degrees\n", degrees);
            return;
    }

    for (int i = 0; i < steps; i++) {
        face = ROTATE_PLUS_90[(uint8_t)axis][(uint8_t)face];
    }
}

std::vector<Die::Face> Die::reachable(Face face, Axis axis) {
    // Walk the +90 cycle until the start face repeats
    std::vector<Face> orbit;
    Face current = face;
    do {
        orbit.push_back(current);
        current = ROTATE_PLUS_90[(uint8_t)axis][(uint8_t)current];
    } while (current != face);
    return orbit;
}

} // namespace Game
