# Ragged Chatbot SDK

The official SDK for integrating Ragged Chatbots into your website.

## Installation

```bash
npm install ragged-chat-sdk
```

## Usage

Import the SDK and initialize it with your chatbot's subdomain.

```javascript
import { init } from 'ragged-chat-sdk';

init({
  subdomain: 'your-chatbot-subdomain'
});
```

### Configuration Options

| Option | Type | Description |
| --- | --- | --- |
| `subdomain` | `string` | **Required**. The unique subdomain of your chatbot. |
| `apiUrl` | `string` | Optional. The base URL of the Ragged API. Defaults to `https://ragflowdb.onrender.com/api`. |

## Example

```javascript
import { init } from 'ragged-chat-sdk';

// Initialize the chatbot
init({
  subdomain: 'my-awesome-bot'
});
```
