
#!/bin/bash

# Criar projeto Expo
npx create-expo-app@latest . --template blank-typescript

# Instalar dependências
npm install @react-native-async-storage/async-storage
npm install @expo/vector-icons
npm install expo-linear-gradient
npm install axios