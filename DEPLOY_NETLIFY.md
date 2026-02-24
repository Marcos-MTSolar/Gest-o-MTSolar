# Deploy para a Netlify

O projeto foi reestruturado para rodar na Netlify usando Netlify Functions! Isso quer dizer que o nosso backend Express agora roda perfeitamente em modo "Serverless".

### Passos para subir o projeto:

**1. Subir o código para o GitHub**
- Certifique-se de que todo o seu código, incluindo a pasta `netlify/functions` e o arquivo `netlify.toml`, foi commitado e "pushado" para o seu GitHub.

**2. Importar o projeto na Netlify**
- Acesse [netlify.com](https://www.netlify.com/) e faça login usando o GitHub.
- Clique em **Add new site** > **Import an existing project**.
- Conecte ao GitHub e selecione o repositório do seu projeto.

**3. Configurações de Build**
A Netlify irá ler o arquivo `netlify.toml` automaticamente, então as configurações Base Directory, Build Command e Publish Directory já estarão preenchidas corretamente! Apenas confirme as informações:
- **Base directory:** Vazio (ou `/` se obrigatório)
- **Build command:** `npm run build`
- **Publish directory:** `dist`

**4. Configurar Variáveis de Ambiente (`.env`)**
- Na tela de Deploy, antes de finalizar, clique em **Add environment variables** (ou adicione-as depois no painel Site Settings > Environment Variables).
- Você DEVE adicionar as seguintes variáveis:
  - `VITE_SUPABASE_URL` = [url do seu Supabase]
  - `VITE_SUPABASE_ANON_KEY` = [chave anon do seu Supabase]
  - `SUPABASE_SERVICE_ROLE_KEY` = [chave service role do Supabase - recomendada para não ter bloqueio no backend]
  - `JWT_SECRET` = (crie uma senha segura e aleatória aqui)

**5. Deploy**
- Clique no botão **Deploy site**.
- A Netlify vai baixar as dependências (`npm install`), gerar o build do React (`npm run build`) e disponibilizar os arquivos. A API rodará automaticamente em `.netlify/functions/api`.

Tudo pronto! Seu sistema deve rodar perfeitamente.
