#include "settings.h"

#include <Arduino.h>
#include <Preferences.h>

#include <stdint.h>
#include <vector>

namespace {

// NVS location of the persisted options
const char STORAGE_NAMESPACE[] = "settings";
const char STORAGE_KEY[] = "options";

// Table format: uint8 count, then per entry: nameLength, name bytes, type and
// the value itself: a single byte for bool, nameLength-style uint8 + bytes for
// a string, nothing for an unset option. Fails when the table does not fit the
// uint8 length fields, leaving outBuffer untouched.
bool serialize(const std::map<String, Option> &options, std::vector<uint8_t> &outBuffer) {
    if (options.size() > UINT8_MAX) {
        Serial.printf("[Options] Cannot store %u options, the count is limited to %u\n",
                      static_cast<unsigned int>(options.size()), static_cast<unsigned int>(UINT8_MAX));
        return false;
    }

    std::vector<uint8_t> buffer;
    buffer.reserve(1 + options.size() * 6);
    buffer.push_back(static_cast<uint8_t>(options.size()));
    for (const std::pair<const String, Option> &entry : options) {
        const String &name = entry.first;
        const Option &option = entry.second;
        if (name.length() > UINT8_MAX) {
            Serial.printf("[Options] Name of \"%s\" is too long (%u bytes, limit %u)\n",
                          name.c_str(), static_cast<unsigned int>(name.length()),
                          static_cast<unsigned int>(UINT8_MAX));
            return false;
        }
        if (option.type == OptionType::String && option.strValue.length() > UINT8_MAX) {
            Serial.printf("[Options] Value of \"%s\" is too long (%u bytes, limit %u)\n",
                          name.c_str(), static_cast<unsigned int>(option.strValue.length()),
                          static_cast<unsigned int>(UINT8_MAX));
            return false;
        }
        buffer.push_back(static_cast<uint8_t>(name.length()));
        buffer.insert(buffer.end(), name.begin(), name.end());
        buffer.push_back(static_cast<uint8_t>(option.type));
        switch (option.type) {
            case OptionType::String:
                buffer.push_back(static_cast<uint8_t>(option.strValue.length()));
                buffer.insert(buffer.end(), option.strValue.begin(), option.strValue.end());
                break;
            case OptionType::Bool:
                buffer.push_back(option.boolValue ? 1 : 0);
                break;
            case OptionType::None:
                break;
        }
    }
    outBuffer.swap(buffer);
    return true;
}

bool deserialize(const uint8_t *data, size_t length, std::map<String, Option> &outOptions) {
    if (length < 1) {
        return false;
    }
    uint8_t count = data[0];
    size_t offset = 1;
    std::map<String, Option> parsed;
    for (uint8_t i = 0; i < count; i++) {
        if (offset + 1 > length) {
            return false;
        }
        uint8_t nameLength = data[offset++];
        if (offset + nameLength + 1 > length) {
            return false;
        }
        String name(reinterpret_cast<const char *>(data + offset), nameLength);
        offset += nameLength;
        uint8_t type = data[offset++];
        Option option;
        if (type == static_cast<uint8_t>(OptionType::String)) {
            if (offset + 1 > length) {
                return false;
            }
            uint8_t valueLength = data[offset++];
            if (offset + valueLength > length) {
                return false;
            }
            option = Option(String(reinterpret_cast<const char *>(data + offset), valueLength));
            offset += valueLength;
        } else if (type == static_cast<uint8_t>(OptionType::Bool)) {
            if (offset + 1 > length) {
                return false;
            }
            option = Option(data[offset++] != 0);
        } else if (type != static_cast<uint8_t>(OptionType::None)) {
            return false;
        }
        parsed[name] = option;
    }
    outOptions = parsed;
    return true;
}

} // namespace

String Option::string() const {
    if (this->type == OptionType::String) {
        return this->strValue;
    } else {
        return "";
    }
}

bool Option::boolean() const {
    if (this->type == OptionType::Bool) {
        return this->boolValue;
    } else {
        return false;
    }
}

Option::Option(String str)  : strValue(str),    boolValue(false),   type(OptionType::String)    {}
Option::Option(bool b)      : strValue(""),     boolValue(b),       type(OptionType::Bool)      {}
Option::Option()            : strValue(""),     boolValue(false),   type(OptionType::None)      {}

Options::Options() {}

bool Options::load() {
    Preferences prefs;
    if (!prefs.begin(STORAGE_NAMESPACE, true)) {
        Serial.println("[Options] Failed to open NVS for reading");
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

    std::map<String, Option> loaded;
    if (!deserialize(buffer.data(), buffer.size(), loaded)) {
        Serial.println("[Options] Stored options are corrupt, keeping current values");
        return false;
    }
    this->options = loaded;
    return true;
}

bool Options::save() {
    std::vector<uint8_t> buffer;
    if (!serialize(this->options, buffer)) {
        return false;
    }
    Preferences prefs;
    if (!prefs.begin(STORAGE_NAMESPACE, false)) {
        Serial.println("[Options] Failed to open NVS for writing");
        return false;
    }
    size_t written = prefs.putBytes(STORAGE_KEY, buffer.data(), buffer.size());
    prefs.end();
    return written == buffer.size();
}

Option Options::getOption(const char *name) const {
    if (this->options.find(name) != this->options.end()) {
        return this->options.at(name);
    } else {
        return Option();
    }
}

void Options::setOption(const char *name, const Option &option) {
    this->options[name] = option;
}

Option Options::operator[](const char *name) const {
    return this->getOption(name);
}

void Options::reset() {
    this->options.clear();
    this->options["ssid"] = Option("BoardGame");
    this->options["password"] = Option("boardgame");
    this->options["allowCardReplay"] = Option(false);
};