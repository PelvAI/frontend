# ALMA Care Frontend — Configuração

Aplicação estática (HTML/JS). Liga-se **apenas** ao backend Alma (`:8001`).  
**Nunca** apontar para o chatbot (`:8000`).

## ─── API URL ──────────────────────────────────────────────────────────────────

Por omissão, `js/api.js` usa:

```javascript
http://127.0.0.1:8001/api/v1
```

Para produção (ou outro host), cria `js/config.js` a partir do exemplo e carrega-o **antes** de `api.js`:

```bash
cp js/config.example.js js/config.js
```

```html
<script src="js/config.js"></script>
<script src="js/translations.js"></script>
<script src="js/api.js"></script>
```

```javascript
// js/config.js (não commits segredos; pode ser gerado no deploy)
window.ALMA_API_URL = 'https://api.alma.example/api/v1';
```

## ─── Contrato do chat ─────────────────────────────────────────────────────────

| Acção | Método | Path | Body / notas |
|-------|--------|------|----------------|
| Nova conversa | POST | `/ai/chat/new` | — → `{ conversation_id }` |
| Enviar | POST | `/ai/chat/{id}/send` | `{ "content": "..." }` |
| Histórico | GET | `/ai/chat/{id}/messages` | Lista de mensagens |
| Feedback | POST | `/ai/feedback/{message_id}` | `{ "user_action": "ACCEPTED" \| "REJECTED" \| "IGNORED" }` |

Texto da AI na resposta: campo `content_encrypted` (texto plano no MVP).  
Remetente: `sender` = `user` \| `ai` \| `system`.

O frontend **não** chama o chatbot nem monta `clinical_context`.

## ─── Auth / storage ───────────────────────────────────────────────────────────

| Key | Uso |
|-----|-----|
| `alma_token` | Bearer UID (MVP) |
| `alma_user` | Cache do user |
| `alma_lang` | Idioma da UI |
| `alma_chat_conversation_id` | Última conversa do chat |

Logout limpa token, user e `conversation_id`.

## ─── Portas locais ────────────────────────────────────────────────────────────

| Serviço | Porta |
|---------|-------|
| Frontend (ex. `python3 -m http.server`) | 8080 |
| Backend Alma | **8001** |
| Chatbot (só o backend) | 8000 |

## ─── Smoke test manual ────────────────────────────────────────────────────────

1. Backend em `:8001`; frontend em `:8080`.
2. Login `test@alma.com` (ou seed do backend) → Coach.
3. Network: POST com body `{"content":"..."}`; URL só `8001`.
4. F5 no chat → histórico reaparece.
5. Abrir `chat.html` sem login → redirect `index.html`.
