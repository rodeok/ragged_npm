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
| `widgetShape` | `'circle' \| 'rounded-square'` | Optional. The shape of the floating widget button. Defaults to `'circle'`. |
| `widgetSize` | `'small' \| 'medium' \| 'large'` | Optional. The size of the floating widget button. Defaults to `'medium'`. |

### Widget Customization

You can customize the appearance of the floating chat widget button:

**Shape Options:**
- `'circle'` - Circular button (default)
- `'rounded-square'` - Square button with rounded corners

**Size Options:**
- `'small'` - 48x48 pixels
- `'medium'` - 56x56 pixels (default)
- `'large'` - 68x68 pixels

## Examples

### Basic Setup

```javascript
import { init } from 'ragged-chat-sdk';

// Initialize the chatbot with default settings
init({
  subdomain: 'my-awesome-bot'
});
```

### Custom Widget Appearance

```javascript
import { init } from 'ragged-chat-sdk';

// Large rounded square button
init({
  subdomain: 'my-awesome-bot',
  widgetShape: 'rounded-square',
  widgetSize: 'large'
});
```

### Small Circular Button

```javascript
import { init } from 'ragged-chat-sdk';

// Small circular button
init({
  subdomain: 'my-awesome-bot',
  widgetShape: 'circle',
  widgetSize: 'small'
});
```
