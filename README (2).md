# Workmana

App de gestão de tarefas da Alltoral — Kanban + Timeline, com login por integrante, permissões, controle de tempo por tarefa e chat/recados por tarefa. Front-end puro (HTML/CSS/JS), sincronizado em tempo real via Firebase Firestore.

## Estrutura

```
/
├── index.html               ← o app inteiro (HTML + CSS + JS em um único arquivo)
├── manifest.json            ← metadados do app instalável (PWA)
├── sw.js                    ← service worker (permite instalar e abrir offline a interface)
├── favicon.ico
├── favicon-16.png / favicon-32.png
├── apple-touch-icon.png     ← ícone usado no iOS ao "Adicionar à Tela de Início"
├── icon-192.png / icon-512.png
├── icon-192-maskable.png / icon-512-maskable.png   ← versões com margem de segurança para Android
└── README.md                ← este guia
```

Todos esses arquivos precisam ficar juntos, na **raiz** do repositório (não dentro de nenhuma subpasta), para os caminhos relativos (`./manifest.json`, `./sw.js`, `./icon-192.png` etc.) funcionarem.

## 1. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto (ou use um existente).
2. **Firestore Database** → *Criar banco de dados* → modo produção.
3. **Authentication** → *Sign-in method* → habilite o provedor **Anônimo**.
   - Isso não é o login que os usuários veem — o app continua com o próprio sistema de perfil + senha. O anônimo do Firebase só autoriza o navegador a ler/escrever no Firestore.
4. **Firestore Database → Regras**, cole:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /teams/{teamId} {
         allow read, create, update: if request.auth != null;
         allow delete: if false;
       }
     }
   }
   ```

   Isso permite que qualquer pessoa autenticada (mesmo anonimamente, como o app faz) leia e escreva em documentos da coleção `teams` — inclusive para localizar uma equipe pelo código de convite. A proteção real de "quem consegue entrar em qual equipe" acontece na aplicação (você só entra numa equipe existente se tiver o código de convite, que só o dono vê) — veja a nota em Limitações mais abaixo.

5. **Configurações do projeto → Seus apps** → adicione um app **Web** (ícone `</>`) e copie o objeto `firebaseConfig` gerado.

## 2. Colar a configuração no `index.html`

Abra `index.html`, procure por `firebaseConfig` (perto do início da tag `<script>`) e substitua pelos seus valores:

```javascript
var firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

A `apiKey` do Firebase não é secreta — pode subir pro GitHub sem problema. Quem protege os dados são as regras do Firestore do passo anterior.

## 3. Publicar com GitHub Pages

1. Suba este repositório pro GitHub (com `index.html` na raiz).
2. **Settings → Pages** → Source: `Deploy from a branch` → branch `main`, pasta `/root` → Save.
3. Após alguns minutos, o GitHub Pages gera uma URL tipo `https://seu-usuario.github.io/nome-do-repo/`.
4. No Firebase Console → **Authentication → Settings → Authorized domains**, adicione esse domínio (`seu-usuario.github.io`), senão o login anônimo pode ser bloqueado.

Pronto. A primeira pessoa que abrir o link cria a própria equipe (nome da equipe + seu nome + senha) e recebe um código de convite; esse código é o que ela compartilha com o resto do time pra eles entrarem na mesma equipe. Cada equipe tem seus próprios dados, completamente separados das demais.

## Instalar como app

- **Android / Chrome / Edge (desktop)**: um botão "⬇ Instalar app" aparece na tela de login e dentro do app assim que o navegador permitir. Também dá pra usar o ícone de instalação que o próprio navegador mostra na barra de endereço.
- **iPhone / iPad (Safari)**: não existe esse botão automático — abra o site no Safari, toque no ícone de compartilhar (o quadrado com a seta pra cima) e escolha **"Adicionar à Tela de Início"**.

## Como funciona o sistema de equipes

- Quem abre o app pela primeira vez escolhe entre **criar uma equipe nova** (vira o dono dela e recebe um código de convite) ou **entrar com um código de convite** que o dono de uma equipe já existente compartilhou.
- Só o **dono da equipe** vê o código de convite (em Equipe → topo do modal), pode adicionar integrantes diretamente pelo nome, remover integrantes e dar a permissão "Move tudo". Ou seja, novos integrantes só entram numa equipe existente se o dono compartilhar o código com eles (ou adicionar direto pelo modal) — ninguém entra por conta própria numa equipe que não é a dele.
- Cada dispositivo "lembra" a última equipe usada (pra não pedir o código de novo a cada vez); o botão "Sair" desloga a pessoa mas mantém o dispositivo associado à equipe. "Não é essa equipe? Trocar" (na tela de escolher perfil) esquece a equipe do dispositivo por completo.

## Limitações a saber

- **A separação entre equipes é garantida pela aplicação, não pelas regras do Firestore.** As regras permitem que qualquer usuário autenticado (mesmo anonimamente) leia/escreva qualquer documento da coleção `teams` — é assim que a busca por código de convite funciona. Isso significa que alguém com conhecimento técnico e acesso ao console do navegador *poderia*, em teoria, ler dados de outra equipe se descobrisse o ID do documento dela no Firestore (não é algo exposto normalmente na interface, mas também não é criptografado). Pra a maioria dos times isso é um risco aceitável; se sua equipe lida com informação muito sensível, vale considerar Firebase Auth "de verdade" (com e-mail/senha por usuário) no lugar do login por PIN.
- **Fotos de perfil** ficam salvas como base64 dentro do mesmo documento do Firestore, que tem limite de 1MB. Com poucas pessoas e fotos pequenas não deve dar problema; se a equipe crescer bastante, vale migrar fotos para o Firebase Storage.
- **Último a salvar vence** — não há resolução de conflito. Se duas pessoas editarem a mesma tarefa no mesmo instante, uma sobrescreve a outra. Para uma equipe pequena isso raramente é um problema real.
- O login por PIN é uma trava de uso interno da equipe, não uma autenticação robusta de verdade (não usa senha criptografada, recuperação de senha, etc.).
