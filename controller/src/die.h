#pragma once

#include <stdint.h>
#include <vector>

#include <Arduino.h>

// Game die with six quantum-style faces: "1", "0", "i", "-i", "-", "+".
//
// Every axis passes through a pair of opposite faces. A rotation around an
// axis never changes the two faces lying on it and cycles the other four.
//   X axis (blue):   through "+" and "-"
//   Y axis (green):  through "i" and "-i"
//   Z axis (yellow): through "0" and "1"
namespace Game {

class Die {
    public:
        enum class Face : uint8_t { Plus, Minus, PlusI, MinusI, Zero, One };
        enum class Axis : uint8_t { X, Y, Z };

        // Current face of the die.
        Face face;

        explicit Die(Face face = Face::One);

        // Face label: "+", "-", "i", "-i", "0" or "1".
        static const char *toString(Face face);
        const char *faceString() const;

        // Rotate the die around the axis by 90, -90 or 180 degrees
        // (any other angle is ignored with a log line).
        // Z, +90:  "+" -> "-i" -> "-" -> "i" -> "+", "0"/"1" unchanged;
        // the other axes cycle analogously, faces on the axis stay.
        void rotate(Axis axis, int degrees);

        // All faces reachable from the given one by rotating around the
        // axis: the four side faces for an off-axis face, the face itself
        // for a face lying on the axis.
        static std::vector<Face> reachable(Face face, Axis axis);
};

} // namespace Game
