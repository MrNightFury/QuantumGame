#include <Adafruit_PN532.h>

bool writeNDEFText(Adafruit_PN532 &nfc, const String &text);
bool readNDEFText(Adafruit_PN532 &nfc, String &out);