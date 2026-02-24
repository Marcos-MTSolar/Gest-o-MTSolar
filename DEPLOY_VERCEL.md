# Deploy para a Vercel

O projeto já está estruturado para rodar perfeitamente na Vercel! Ele utiliza uma configuração Serverless para rodar o backend Express na mesma estrutura do React.

### Passos para subir o projeto:

**1. Subir o código para o GitHub** (se ainda não fez)
- O seu código precisa estar num repositório (público ou privado) no GitHub.

**2. Importar o projeto na Vercel**
- Acesse [vercel.com](https://vercel.com/) e faça login (recomendo usar a conta do GitHub).
- Clique em **Add New...** > **Project**.
- Autorize a Vercel a visualizar seus repositórios do GitHub e importe o repositório do "APP - Gestão".
- **IMPORTANTE:** Como o seu código está dentro da pasta `Gest-o-MTSolar`, na tela de importação, procure a seção **Root Directory** e digite `Gest-o-MTSolar` para que a Vercel foque na pasta certa.

**3. Configurar Variáveis de Ambiente (`.env`)**
- Na mesma tela de configuração (antes de clicar em Deploy), abra a seção **Environment Variables**.
- Você precisa adicionar todas as variáveis que rodam o seu sistema, especificamente:
  - `VITE_SUPABASE_URL` = [url do seu Supabase]
  - `VITE_SUPABASE_ANON_KEY` = [chave do seu Supabase]
  - `JWT_SECRET` = (crie uma senha segura e aleatória aqui)
  
**4. Configurações de Build**
- A Vercel normalmente detecta o projeto Vite. As configurações padrão devem estar assim:
  - **Framework Preset:** Vite
  - **Build Command:** `npm run build` ou `vite build`
  - **Output Directory:** `dist`
  - **Install Command:** `npm install`

**5. Deploy**
- Clique no botão azul **Deploy**.
- A Vercel vai instalar, gerar a build (compilar o React) e disponibilizar a sua API (o arquivo `server.ts`).

### Observação importante
A estrutura criada no `vercel.json` e `api/index.ts` permite que todo o backend (Express) seja transformado numa "Serverless Function" da AWS pela Vercel automaticamente! Você não precisa de um servidor separado para o backend :)
