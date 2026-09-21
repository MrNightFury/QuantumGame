#include "game_controller.h"

#include <Arduino.h>
#include <string.h>
#include <vector>

namespace Game {

GameController::GameController(NfcScanner &scanner, WSController &ws)
    : scanner(scanner), ws(ws) {
    // Stored registry (if any) overrides the hardcoded defaults.
    cards.load();
    scanner.onTag([this](const NfcScanner::TagEvent &event) { handleTag(event); });
    ws.on("startGame", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("startGame", clientId, data);
    });
    ws.on("selectTarget", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("selectTarget", clientId, data);
    });
    ws.on("writeCard", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("writeCard", clientId, data);
    });
    ws.on("giveUp", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("giveUp", clientId, data);
    });
}

void GameController::handleWsEvent(const char *event, uint8_t clientId,
                                   JsonVariantConst data) {
    // Switch by event name.
    if (strcmp(event, "startGame") == 0) {
        startGame(data);
    } else if (strcmp(event, "selectTarget") == 0) {
        selectTarget(clientId, data);
    } else if (strcmp(event, "writeCard") == 0) {
        writeCard(data);
    } else if (strcmp(event, "giveUp") == 0) {
        giveUp(clientId);
    } else {
        Serial.printf("[Game] Unknown ws event: %s\n", event);
    }
}

void GameController::handleTag(const NfcScanner::TagEvent &event) {
    if (!isGameOn || !gameState) {
        // Outside a game: either register an armed card or report the scan.
        CardRegistry::CardType type;
        bool registered = cards.lookup(event.uid, event.uidLength, type);

        if (awaitingCard) {
            cards.set(event.uid, event.uidLength, pendingCardType);
            cards.save();
            awaitingCard = false;
            Serial.printf("[Game] Card registered as %s\n",
                          CardRegistry::toString(pendingCardType));
            return;
        }

        Serial.printf("[Game] Card scanned: %s\n",
                      registered ? CardRegistry::toString(type) : "unknown");
        JsonDocument scannedDoc;
        scannedDoc["registered"] = registered;
        if (registered) {
            scannedDoc["type"] = CardRegistry::toString(type);
        }
        ws.broadcast("cardScanned", scannedDoc);
        return;
    }

    CardRegistry::CardType type;
    if (!cards.lookup(event.uid, event.uidLength, type)) {
        Serial.print("[Game] Unknown card (uid:");
        for (uint8_t i = 0; i < event.uidLength; i++) {
            Serial.printf(" %02X", event.uid[i]);
        }
        Serial.println(")");
        return;
    }

    Serial.printf("[Game] Card %s\n", CardRegistry::toString(type));

    if (gameState->isCardPlayed(event.uid, event.uidLength) && false) { // TODO: remove the && false when we want to enforce one-time use of cards
        Serial.println("[Game] Card ignored, already played this game");
        return;
    }
    if (needsTarget(type) && !hasTarget) {
        Serial.println("[Game] Card ignored, no target selected");
        return;
    }

    // Apply the card, then tell the players what happened.
    Target target = {targetPlayer, targetCubit};
    applyCard(type, *gameState, target);
    gameState->playedCardUids.emplace_back(event.uid, event.uid + event.uidLength);
    hasTarget = false;  // the chosen cubit is consumed by the card

    // Two cards per turn: pass the turn before notifying the players, so the
    // sent state already shows the next player as current.
    gameState->playedCards++;
    if (gameState->playedCards >= GameState::CARDS_PER_TURN) {
        gameState->currentPlayer =
            (gameState->currentPlayer + 1) % gameState->playerIds.size();
        gameState->playedCards = 0;
    }

    JsonDocument playedDoc;
    playedDoc["target"]["register"] = targetPlayer;
    playedDoc["target"]["cubit"] = targetCubit;
    playedDoc["card"] = CardRegistry::toString(type);

    JsonDocument stateDoc = buildGameStateDoc();
    for (uint8_t id : gameState->playerIds) {
        ws.send(id, "cardPlayed", playedDoc);
        ws.send(id, "setGameState", stateDoc);
    }

    // After every played card, check for a register equal to the target.
    for (size_t i = 0; i < gameState->registers.size(); i++) {
        if (gameState->registers[i] == gameState->targetRegister) {
            Serial.printf("[Game] Player %u reached the target register\n",
                          gameState->playerIds[i]);
            endGame(i);
            break;
        }
    }
}

void GameController::startGame(JsonVariantConst data) {
    if (isGameOn) {
        Serial.println("[Game] startGame ignored, a game is already in progress");
        return;
    }

    JsonArrayConst players = data["players"];
    JsonVariantConst cubitCount = data["cubitCount"];
    if (players.isNull() || players.size() == 0 || !cubitCount.is<unsigned int>() ||
        cubitCount.as<unsigned int>() == 0) {
        Serial.println("[Game] startGame has invalid data");
        return;
    }

    std::vector<uint8_t> playerIds;
    for (JsonVariantConst player : players) {
        if (!player.is<unsigned int>()) {
            Serial.println("[Game] startGame has invalid data");
            return;
        }
        playerIds.push_back(player.as<uint8_t>());
    }
    size_t diceCount = cubitCount.as<size_t>();

    // C++11: no std::make_unique.
    gameState.reset(new GameState(playerIds, diceCount));
    isGameOn = true;
    hasTarget = false;
    Serial.printf("[Game] Game started: %u players, %u dice\n",
                  (unsigned int)playerIds.size(), (unsigned int)diceCount);

    // "gameStarted" carries the same payload as "startGame".
    JsonDocument startedDoc;
    JsonArray startedPlayers = startedDoc["players"].to<JsonArray>();
    for (uint8_t id : playerIds) {
        startedPlayers.add(id);
    }
    startedDoc["cubitCount"] = diceCount;
    for (uint8_t id : playerIds) {
        ws.send(id, "gameStarted", startedDoc);
    }

    // Then the full game state.
    JsonDocument stateDoc = buildGameStateDoc();
    for (uint8_t id : playerIds) {
        ws.send(id, "setGameState", stateDoc);
    }
}

void GameController::selectTarget(uint8_t clientId, JsonVariantConst data) {
    if (!isGameOn || !gameState) {
        Serial.println("[Game] selectTarget ignored, no game in progress");
        return;
    }

    // Only the player whose turn it is may aim the next card.
    const GameState &state = *gameState;
    if (state.playerIds[state.currentPlayer] != clientId) {
        Serial.printf("[Game] selectTarget ignored, not client %u's turn\n",
                      clientId);
        return;
    }

    JsonVariantConst player = data["player"];
    JsonVariantConst cubit = data["cubit"];
    if (!player.is<unsigned int>() || !cubit.is<unsigned int>()) {
        Serial.println("[Game] selectTarget has invalid data");
        return;
    }
    size_t playerIndex = player.as<size_t>();
    size_t cubitIndex = cubit.as<size_t>();
    if (playerIndex >= state.registers.size() ||
        cubitIndex >= state.registers[playerIndex].dice.size()) {
        Serial.println("[Game] selectTarget points outside the registers");
        return;
    }

    targetPlayer = playerIndex;
    targetCubit = cubitIndex;
    hasTarget = true;
    Serial.printf("[Game] Target: player %u cubit %u\n",
                  (unsigned int)playerIndex, (unsigned int)cubitIndex);
}

void GameController::writeCard(JsonVariantConst data) {
    if (!data.is<const char *>()) {
        Serial.println("[Game] writeCard has invalid data");
        return;
    }
    const char *typeName = data.as<const char *>();
    CardRegistry::CardType type;
    if (!CardRegistry::fromString(typeName, type)) {
        Serial.printf("[Game] writeCard: unknown card type %s\n", typeName);
        return;
    }

    pendingCardType = type;
    awaitingCard = true;
    Serial.printf("[Game] Waiting for a card to register as %s\n", typeName);
}

void GameController::giveUp(uint8_t clientId) {
    if (!isGameOn || !gameState) {
        Serial.println("[Game] giveUp ignored, no game in progress");
        return;
    }

    const GameState &state = *gameState;
    size_t senderIndex = state.playerIds.size();
    for (size_t i = 0; i < state.playerIds.size(); i++) {
        if (state.playerIds[i] == clientId) {
            senderIndex = i;
            break;
        }
    }
    if (senderIndex == state.playerIds.size()) {
        Serial.printf("[Game] giveUp ignored, client %u is not a player\n",
                      clientId);
        return;
    }

    if (state.playerIds.size() < 2) {
        // Nobody else is left to declare the winner - just stop the game.
        isGameOn = false;
        hasTarget = false;
        Serial.println("[Game] Sole player gave up, game stopped");
        return;
    }

    // The next participant in player order wins (with two players: the other
    // one).
    size_t winnerIndex = (senderIndex + 1) % state.playerIds.size();
    Serial.printf("[Game] Player %u gave up\n", clientId);
    endGame(winnerIndex);
}

void GameController::endGame(size_t winnerIndex) {
    uint8_t winnerId = gameState->playerIds[winnerIndex];
    isGameOn = false;
    hasTarget = false;

    // Same naming as the online users list.
    String winnerName = "player";
    winnerName += winnerId;

    JsonDocument endedDoc;
    endedDoc["winnerId"] = winnerId;
    endedDoc["winnerName"] = winnerName;
    for (uint8_t id : gameState->playerIds) {
        ws.send(id, "gameEnded", endedDoc);
    }
}

JsonDocument GameController::buildGameStateDoc() const {
    const GameState &state = *gameState;

    JsonDocument doc;

    JsonArray players = doc["players"].to<JsonArray>();
    for (uint8_t id : state.playerIds) {
        players.add(id);
    }

    JsonArray registers = doc["registers"].to<JsonArray>();
    for (const Register &reg : state.registers) {
        JsonArray faces = registers.add<JsonArray>();
        for (const Die &die : reg.dice) {
            faces.add(die.faceString());
        }
    }

    JsonArray target = doc["targetRegister"].to<JsonArray>();
    for (const Die &die : state.targetRegister.dice) {
        target.add(die.faceString());
    }

    JsonArray fieldCards = doc["cardsOnField"].to<JsonArray>();
    for (const GameState::FieldCard &card : state.cardsOnField) {
        JsonObject cardObj = fieldCards.add<JsonObject>();
        cardObj["player"] = card.player;
        cardObj["cubit"] = card.cubit;
        cardObj["card"] = CardRegistry::toString(card.type);
    }

    doc["currentPlayer"] = state.currentPlayer;
    doc["playedCards"] = state.playedCards;
    return doc;
}

}  // namespace Game
