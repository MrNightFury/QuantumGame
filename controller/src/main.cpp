#include "game_controller.h"
#include "nfc_scanner.h"
#include "web_server.h"
#include "ws_controller.h"

// Signal PIN (Q) connects to specified PIN (17)
// SDA, SLC connects to 21, 22 resprectfully (default I2C PINs)
#define NFC_READER_PIN 17
#define NFC_RESET_PIN 100

void assertOrDie(bool condition, const char *msg) {
    if (!condition) {
        Serial.println(msg);
        while (1);
    }
}

BoardGameWeb *web = nullptr;
WSController *wsController = nullptr;
NfcScanner *scanner = nullptr;
Game::GameController *gameController = nullptr;

void setup() {
    Serial.begin(9600);

    scanner = new NfcScanner(NFC_READER_PIN, NFC_RESET_PIN);
    assertOrDie(scanner->begin(), "Couldn't find RFID/NFC reader");
    Serial.println("Found RFID/NFC reader");

    BoardGameWeb::Config webConfig;
    webConfig.ssid = "BoardGame";
    webConfig.password = "boardgame";
    web = new BoardGameWeb(webConfig);
    wsController = new WSController();

    // Subscribes to tags itself; start scanning only after that.
    gameController = new Game::GameController(*scanner, *wsController);
    scanner->start();

    delay(1000);
}

void loop() {
    web->loop();
    wsController->loop();
    scanner->loop();
    delay(1);
}
