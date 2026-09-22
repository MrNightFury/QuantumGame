#pragma once

#include <stddef.h>
#include <stdint.h>
#include <vector>

namespace Game {

// Maps RFID tag UIDs to card types. Starts from hardcoded defaults, but the
// mapping can be changed at runtime and persisted to controller flash (NVS).
class CardRegistry {
public:
    enum class CardType : uint8_t {
        PauliX, PauliY, PauliZ,
        PauliX3, PauliY3, PauliZ3,

        RotateX, RotateY, RotateZ,
        PhaseForward, PhaseBackward,
        Hadamard, Hadamard3,
        Swap,
        KroneckerMultiplication,
        Measurement,
        Identity,
        Reshuffle
    };

    struct Entry {
        std::vector<uint8_t> uid;
        CardType type;
    };

    CardRegistry();

    // Looks up the card type for a tag UID. Returns false if the UID is unknown.
    bool lookup(const uint8_t *uid, uint8_t uidLength, CardType &type) const;

    // Adds or updates the mapping for a UID (kept in RAM until save()).
    void set(const uint8_t *uid, uint8_t uidLength, CardType type);

    // Removes the mapping for a UID. Returns false if it was not present.
    bool remove(const uint8_t *uid, uint8_t uidLength);

    size_t size() const;
    const std::vector<Entry> &entries() const;

    // Replaces the table with the copy stored in flash. Returns false when
    // nothing valid is stored (hardcoded defaults are kept then).
    bool load();

    // Persists the current table to flash.
    void save();

    static const char *toString(CardType type);
    static bool fromString(const char *name, CardType &type);

private:
    std::vector<Entry> table;
};

} // namespace Game
