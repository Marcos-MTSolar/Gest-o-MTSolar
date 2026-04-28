# Como gerar o APK Android

## Pré-requisitos (instale uma vez)
- Node.js 18+
- Android Studio (https://developer.android.com/studio)
- Java JDK 17+ (já vem com Android Studio)

## Passo a passo

### 1. Substitua a URL do backend
No arquivo src/lib/api.ts, substitua:
  'https://SEU_BACKEND_URL_AQUI'
pela URL real do seu backend no Vercel, por exemplo:
  'https://gestao-mtsolar.vercel.app'

### 2. Instale as dependências
  npm install

### 3. Gere o build e sincronize com o Capacitor
  npm run build:mobile

### 4. Adicione a plataforma Android (apenas na primeira vez)
  npx cap add android

### 5. Abra o Android Studio
  npx cap open android

### 6. No Android Studio
  - Aguarde o Gradle sincronizar (barra de progresso na parte inferior)
  - Menu: Build → Generate Signed Bundle / APK
  - Escolha: APK
  - Crie ou selecione um keystore (guarde a senha — ela é necessária para atualizações futuras)
  - Escolha: release
  - Clique em Finish
  - O APK será gerado em: android/app/build/outputs/apk/release/

### 7. Instalar no celular
  - Transfira o arquivo .apk para o celular via USB ou WhatsApp
  - No celular, ative "Instalar de fontes desconhecidas" nas configurações
  - Abra o arquivo APK e instale

## Para iOS (requer Mac + Xcode)
  npx cap add ios
  npx cap open ios
  - No Xcode: Product → Archive → Distribute App
