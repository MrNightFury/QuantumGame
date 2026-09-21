#pragma once

#include <ArduinoJson.h>
#include <memory>

#include "card_effects.h"
#include "card_registry.h"
#include "game_state.h"
#include "nfc_scanner.h"
#include "ws_controller.h"

namespace Game {

// Central place for the game flow: reacts to scanned cards and ws events,
// talks to the players through WebSockets.
class GameController {
    public:
        GameController(NfcScanner &scanner, WSController &ws);

    private:
        // Ws event handler; switch by event name.
        void handleWsEvent(const char *event, uint8_t clientId,
                           JsonVariantConst data);
        // Tag handler; switch by card type. Runs in the main loop context
        // (NfcScanner delivers events through its queue).
        void handleTag(const NfcScanner::TagEvent &event);

        // "startGame": creates a fresh GameState and notifies the players.
        void startGame(JsonVariantConst data);
        // "selectTarget": the current player picks the cubit (player index +
        // cubit index in their register) the next scanned card will hit.
        void selectTarget(uint8_t clientId, JsonVariantConst data);
        // "writeCard": arms card registration - the next tag scanned while
        // no game is running is bound to the given card type.
        void writeCard(JsonVariantConst data);
        // "giveUp": the sender admits defeat, the game ends with another
        // player as the winner.
        void giveUp(uint8_t clientId);
        // Ends the running game and sends "gameEnded" to the participants.
        void endGame(size_t winnerIndex);
        // Builds the data payload of a "setGameState" event.
        JsonDocument buildGameStateDoc() const;

        NfcScanner &scanner;
        WSController &ws;

        CardRegistry cards;                    // uid -> card type (NVS-backed)
        std::unique_ptr<GameState> gameState;  // null = no game yet
        bool isGameOn = false;                 // a game session is running

        // Armed by "writeCard": the next tag scanned outside a game is
        // registered with this type instead of being reported.
        bool awaitingCard = false;
        CardRegistry::CardType pendingCardType;

        // Cubit chosen by the current player for the next scanned card.
        bool hasTarget = false;
        size_t targetPlayer = 0;
        size_t targetCubit = 0;
};

}  // namespace Game
