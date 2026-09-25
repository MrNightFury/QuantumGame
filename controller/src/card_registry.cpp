#include "card_registry.h"

#include <string.h>

#include <Arduino.h>
#include <Preferences.h>

namespace Game {

namespace {

// NVS location of the persisted registry.
const char STORAGE_NAMESPACE[] = "cards";
const char STORAGE_KEY[] = "registry";

// RFID UIDs are at most 8 bytes.
const uint8_t MAX_UID_LENGTH = 8;

// Hardcoded default mappings. Placeholder UIDs: replace at runtime via
// set() + save(), or edit them here.
const uint8_t DEFAULT_PAULI_X_UID[] = {0x04, 0x0D, 0x67, 0x02, 0x7B, 0x13, 0x91};
const uint8_t DEFAULT_PAULI_Y_UID[] = {0x04, 0x0D, 0x66, 0x02, 0x7B, 0x13, 0x91};
const uint8_t DEFAULT_PAULI_Z_UID[] = {0x04, 0x11, 0x22, 0x33, 0x44, 0x55, 0x88};
const uint8_t DEFAULT_PAULI_X3_UID[] = {0x04, 0x11, 0x22, 0x33, 0x44, 0x55, 0x99};
const uint8_t DEFAULT_PAULI_Y3_UID[] = {0x04, 0x11, 0x22, 0x33, 0x44, 0x55, 0xAA};
const uint8_t DEFAULT_PAULI_Z3_UID[] = {0x04, 0x11, 0x22, 0x33, 0x44, 0x55, 0xBB};

const char *const TYPE_NAMES[] = {
    "pauli_x", "pauli_y", "pauli_z", "pauli_x3", "pauli_y3", "pauli_z3",

    "phase_forward",
    "phase_backward",
    "rotate_x",
    "rotate_y",
    "rotate_z",
    "hadamard",
    "hadamard_3",
    "swap",
    "quantum_noise",
    "kronecker_multiplication",
    "measurement",
    "identity",
    "barrier",
    "reshuffle",
    "quantum_lucky",
};
const size_t TYPE_COUNT = sizeof(TYPE_NAMES) / sizeof(TYPE_NAMES[0]);

bool sameUid(const std::vector<uint8_t> &uid, const uint8_t *other, uint8_t otherLength) {
    return uid.size() == otherLength && memcmp(uid.data(), other, otherLength) == 0;
}

// Table format: uint16 count, then per entry: uidLength, uid bytes, type.
std::vector<uint8_t> serializeTable(const std::vector<CardRegistry::Entry> &table) {
    std::vector<uint8_t> buffer;
    buffer.push_back(table.size() & 0xFF);
    buffer.push_back(table.size() >> 8);
    for (const CardRegistry::Entry &entry : table) {
        buffer.push_back(entry.uid.size());
        buffer.insert(buffer.end(), entry.uid.begin(), entry.uid.end());
        buffer.push_back(static_cast<uint8_t>(entry.type));
    }
    return buffer;
}

bool deserializeTable(const uint8_t *data, size_t length, std::vector<CardRegistry::Entry> &outTable) {
    if (length < 2) {
        return false;
    }
    size_t count = data[0] | (data[1] << 8);
    size_t offset = 2;
    std::vector<CardRegistry::Entry> parsed;
    parsed.reserve(count);
    for (size_t i = 0; i < count; i++) {
        if (offset >= length) {
            return false;
        }
        uint8_t uidLength = data[offset++];
        if (uidLength == 0 || uidLength > MAX_UID_LENGTH) {
            return false;
        }
        if (offset + uidLength + 1 > length) {
            return false;
        }
        uint8_t type = data[offset + uidLength];
        if (type >= TYPE_COUNT) {
            return false;
        }
        CardRegistry::Entry entry;
        entry.uid.assign(data + offset, data + offset + uidLength);
        entry.type = static_cast<CardRegistry::CardType>(type);
        parsed.push_back(entry);
        offset += uidLength + 1;
    }
    outTable = parsed;
    return true;
}

} // namespace

CardRegistry::CardRegistry() {
    // set(DEFAULT_PAULI_X_UID, sizeof(DEFAULT_PAULI_X_UID), CardType::PauliX);
    // set(DEFAULT_PAULI_Y_UID, sizeof(DEFAULT_PAULI_Y_UID), CardType::PauliY);
    // set(DEFAULT_PAULI_Z_UID, sizeof(DEFAULT_PAULI_Z_UID), CardType::PauliZ);
    // set(DEFAULT_PAULI_X3_UID, sizeof(DEFAULT_PAULI_X3_UID), CardType::PauliX3);
    // set(DEFAULT_PAULI_Y3_UID, sizeof(DEFAULT_PAULI_Y3_UID), CardType::PauliY3);
    // set(DEFAULT_PAULI_Z3_UID, sizeof(DEFAULT_PAULI_Z3_UID), CardType::PauliZ3);
}

bool CardRegistry::lookup(const uint8_t *uid, uint8_t uidLength, CardType &type) const {
    for (const Entry &entry : table) {
        if (sameUid(entry.uid, uid, uidLength)) {
            type = entry.type;
            return true;
        }
    }
    return false;
}

void CardRegistry::set(const uint8_t *uid, uint8_t uidLength, CardType type) {
    for (Entry &entry : table) {
        if (sameUid(entry.uid, uid, uidLength)) {
            entry.type = type;
            return;
        }
    }
    Entry entry;
    entry.uid.assign(uid, uid + uidLength);
    entry.type = type;
    table.push_back(entry);
}

bool CardRegistry::remove(const uint8_t *uid, uint8_t uidLength) {
    for (size_t i = 0; i < table.size(); i++) {
        if (sameUid(table[i].uid, uid, uidLength)) {
            table.erase(table.begin() + i);
            return true;
        }
    }
    return false;
}

size_t CardRegistry::size() const {
    return table.size();
}

const std::vector<CardRegistry::Entry> &CardRegistry::entries() const {
    return table;
}

bool CardRegistry::load() {
    Preferences prefs;
    if (!prefs.begin(STORAGE_NAMESPACE, true)) {
        return false;
    }
    size_t length = prefs.getBytesLength(STORAGE_KEY);
    if (length == 0) {
        prefs.end();
        return false;
    }
    std::vector<uint8_t> buffer(length);
    prefs.getBytes(STORAGE_KEY, buffer.data(), length);
    prefs.end();

    std::vector<Entry> loaded;
    if (!deserializeTable(buffer.data(), buffer.size(), loaded)) {
        Serial.println("[Cards] Stored registry is corrupt, keeping defaults");
        return false;
    }
    table = loaded;
    return true;
}

void CardRegistry::save() {
    std::vector<uint8_t> buffer = serializeTable(table);
    Preferences prefs;
    if (!prefs.begin(STORAGE_NAMESPACE, false)) {
        Serial.println("[Cards] Failed to open NVS for writing");
        return;
    }
    prefs.putBytes(STORAGE_KEY, buffer.data(), buffer.size());
    prefs.end();
}

const char *CardRegistry::toString(CardType type) {
    size_t index = static_cast<size_t>(type);
    if (index >= TYPE_COUNT) {
        return "unknown";
    }
    return TYPE_NAMES[index];
}

bool CardRegistry::fromString(const char *name, CardType &type) {
    for (size_t i = 0; i < TYPE_COUNT; i++) {
        if (strcmp(name, TYPE_NAMES[i]) == 0) {
            type = static_cast<CardType>(i);
            return true;
        }
    }
    return false;
}

} // namespace Game
