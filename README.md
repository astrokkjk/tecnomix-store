# TecnoMix

Loja demonstrativa com catálogo no Supabase, registro de pedidos e hospedagem preparada para a Vercel.

## 1. Criar o banco

1. Crie um projeto em [Supabase](https://supabase.com/dashboard).
2. Abra o SQL Editor do projeto e execute o conteúdo de `supabase/schema.sql`.
3. Em Project Settings → API Keys, copie a Project URL e a chave `secret` (começa com `sb_secret_`). Ela dá acesso administrativo e deve ficar somente no servidor; nunca a publique nem a envie em mensagens.

## 2. Rodar localmente

1. Instale Node.js e Git, se ainda não estiverem instalados.
2. Na pasta deste projeto, execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha `SUPABASE_URL` e `SUPABASE_SECRET_KEY`.
4. Execute `npm run dev` e abra o endereço local mostrado no terminal.

## 3. Publicar na Vercel

1. Envie esta pasta para um repositório Git privado no GitHub.
2. Na Vercel, escolha **Add New → Project** e importe o repositório.
3. Em Environment Variables, cadastre `SUPABASE_URL` e `SUPABASE_SECRET_KEY` para Production e Preview.
4. Selecione **Deploy**. A Vercel fornece um endereço `*.vercel.app`; um domínio próprio pode ser conectado depois.

## O que já funciona

- Catálogo consultado no banco de dados.
- Sacola no navegador e formulário para registrar pedido.
- Verificação de estoque e gravação atômica de pedidos e itens.
- A chave administrativa do banco fica apenas nas funções do servidor.

O pedido ainda não cobra pagamento. Para vender online, conecte um provedor de pagamento e revise políticas de entrega, privacidade e atendimento antes de divulgar a loja.
