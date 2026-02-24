# Deploy para a Vercel

O projeto foi reajustado para rodar em **100% Serverless** na Vercel!
Todo o código do servidor NodeJS (Express) foi movido diretamente para o arquivo `api/index.ts` e não depende mais do arquivo raiz "server.ts". Isso resolveu o problema do Vercel não encontrar os pacotes ao rodar.

### Passos para subir o projeto:

**1. Subir o código para o GitHub** 
- Certifique-se de fazer um `git commit` e `git push` com todas as novas mudanças.

**2. Importar o projeto na Vercel**
- Acesse [vercel.com](https://vercel.com/) e faça login usando o GitHub.
- Clique em **Add New...** > **Project**.
- Conecte ao GitHub e selecione o repositório `Gest-o-MTSolar` (lembre-se de configurar o **Root Directory** adequadamente, se sua pasta principal for uma sub-pasta, coloque o nome dela).

**3. Configurar Variáveis de Ambiente (`.env`)**
- Na mesma tela de deploy na Vercel (aba 'Environment Variables'), é **MUITO IMPORTANTE** que você registre todas as CHAVES do sistema. Se as chaves estiverem vazias, o servidor não compila.
- Insira as 4 chaves que você já tem no seu arquivo `.env`:
  - `VITE_SUPABASE_URL` = [url do seu Supabase]
  - `VITE_SUPABASE_ANON_KEY` = [chave do seu Supabase]
  - `SUPABASE_SERVICE_ROLE_KEY` = [aquela secret master key que você copiou da dashboard do Supabase]
  - `JWT_SECRET` = [senha que geramos pra você]
  
**4. Configurações de Build**
- A Vercel normalmente detecta o projeto Vite. As configurações devem ficar:
  - **Framework Preset:** Vite
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`

**5. Deploy**
- Clique no botão azul **Deploy**.
- Tudo pronto! A Vercel vai instalar tudo, criar o Frontend estático do seu React e instanciar sua API.
