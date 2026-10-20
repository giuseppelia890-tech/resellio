#!/bin/bash
# ===== Resellio — compila l'APK Android =====
# Uso:  ./build-apk.sh
# Il file finale compare in:
#   android/app/build/outputs/apk/debug/app-debug.apk
set -e
cd "$(dirname "$0")"

# 1. Java 21 (scaricato una tantum in ~/.resellio-android-tools)
JDK21=$(ls -d "$HOME/.resellio-android-tools"/jdk-21*/Contents/Home 2>/dev/null | head -1)
if [ -z "$JDK21" ]; then
  echo "❌ Non trovo il Java 21. Scaricalo da: https://adoptium.net/temurin/releases/?version=21"
  exit 1
fi
export JAVA_HOME="$JDK21"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

echo "☕ Java: $(java -version 2>&1 | head -1)"
echo "🤖 SDK Android: $ANDROID_HOME"

# 2. Copia i file dell'app nella cartella www (ciò che finisce nell'APK)
npm run copy

# 3. Sincronizza con Android e compila
npx cap sync android
cd android
./gradlew assembleDebug "$@"

APK="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  echo ""
  echo "✅ APK PRONTO: $(pwd)/$APK"
  echo "📦 Dimensione: $(du -h "$APK" | cut -f1)"
  echo ""
  echo "Per trasferirlo sul telefono: AirDrop, email, WhatsApp o cavo USB."
  echo "Sul telefono: apri il file e consenti l'installazione da origini sconosciute."
else
  echo "⚠️ APK non trovato — controlla i messaggi di errore qui sopra."
  exit 1
fi
