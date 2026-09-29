#include <Adafruit_PN532.h>

// Writes NDEF text message as first in tag. Ignores anything that is already on tag.
// true on success, false on failure
bool writeNDEFText(Adafruit_PN532 &nfc, const String &text);
// Reads first NDEF message. If not text - not works
// true on success, false on failure
bool readNDEFText(Adafruit_PN532 &nfc, String &out);