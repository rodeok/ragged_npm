export function init(config = {}) {


    // Configuration
    const API_URL = config.apiUrl || 'https://ragflowdb.onrender.com/api';
    const subdomain = config.subdomain;
    let widgetShape = config.widgetShape || 'circle'; // Fallback to circle
    let widgetSize = config.widgetSize || 'medium'; // Fallback to medium

    if (!subdomain) {
        console.error('[Ragged SDK] Error: subdomain is required. Usage: Ragged.init({ subdomain: "your-subdomain" })');
        return;
    }

    // State
    let isOpen = false;
    let initialized = false;
    let chatConfig = null;
    let messages = [];
    let isLoading = false;
    let activeTab = 'chat';
    let isSubmittingSupport = false;

    // Fetch chatbot configuration
    async function fetchConfig() {
        try {
            const response = await fetch(`${API_URL}/chat/${subdomain}/config`);
            chatConfig = await response.json();
        } catch (error) {
            console.error('[Ragged SDK] Failed to fetch config:', error);
        }
    }

    // Send message to chatbot
    async function sendMessage(message) {
        try {
            const response = await fetch(`${API_URL}/chat/${subdomain}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: messages })
            });
            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('[Ragged SDK] Failed to send message:', error);
            return "Sorry, I'm having trouble connecting right now.";
        }
    }

    // Switch between tabs
    function switchTab(tabId) {
        activeTab = tabId;

        // Update tab buttons
        const tabs = ['chat', 'links', 'support'];
        tabs.forEach(t => {
            const btn = document.getElementById(`ragged-tab-${t}`);
            if (btn) {
                if (t === tabId) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });

        // Update views
        const views = {
            'chat': document.getElementById('ragged-chat-view'),
            'links': document.getElementById('ragged-links-view'),
            'support': document.getElementById('ragged-support-view')
        };

        Object.keys(views).forEach(t => {
            const view = views[t];
            if (view) {
                if (t === tabId) view.classList.remove('ragged-hidden');
                else view.classList.add('ragged-hidden');
            }
        });

        if (tabId === 'chat') renderMessages();
        if (tabId === 'links') renderLinks();
    }

    // Render links
    function renderLinks() {
        const container = document.getElementById('ragged-links-list');
        if (!container || !chatConfig?.settings?.bookmarks) return;

        const links = chatConfig.settings.bookmarks;
        container.innerHTML = links.map(link => `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="ragged-link-item">
                <span class="ragged-link-label">${link.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 22 3 22 10"></polyline>
                    <line x1="10" y1="14" x2="22" y2="3"></line>
                </svg>
            </a>
        `).join('');
    }

    // Handle support form submission
    async function handleSubmitSupport(e) {
        e.preventDefault();
        if (isSubmittingSupport) return;

        const submitBtn = document.getElementById('ragged-support-submit');
        const originalText = submitBtn.innerHTML;

        const data = {
            name: document.getElementById('ragged-support-name').value,
            email: document.getElementById('ragged-support-email').value,
            type: document.getElementById('ragged-support-type').value,
            impact: document.getElementById('ragged-support-impact').value,
            description: document.getElementById('ragged-support-desc').value
        };

        try {
            isSubmittingSupport = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="ragged-loading-spinner"></div> Sending...';

            const response = await fetch(`${API_URL}/chatbots/${subdomain}/support`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Support ticket submitted successfully!');
                document.getElementById('ragged-support-form').reset();
                switchTab('chat');
            } else {
                throw new Error('Failed to submit');
            }
        } catch (error) {
            console.error('[Ragged SDK] Support submission failed:', error);
            alert('Failed to submit support ticket. Please try again.');
        } finally {
            isSubmittingSupport = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // Format message content (bold, tables, and links)
    function formatMessage(content) {
        if (!content) return '';

        let formatted = content;

        // 1. Emails: user@example.com -> <a href="mailto:user@example.com">user@example.com</a>
        formatted = formatted.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '<a href="mailto:$1">$1</a>');

        // 2. URLs: https://google.com -> <a href="https://google.com" target="_blank">https://google.com</a>
        // Avoid double-wrapping content that is already in an <a> tag (from email step) or has a protocol
        formatted = formatted.replace(/(?<!href=")(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

        // 3. Bold: **text** -> <strong>text</strong>
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 4. Tables: | col1 | col2 |
        const lines = formatted.split('\n');
        let inTable = false;
        let tableHTML = '';
        let result = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableHTML = '<div class="ragged-table-container"><table>';
                }

                const cells = line.split('|').filter(c => c.trim() !== '' || (line.indexOf('|' + c + '|') !== -1));
                // Handle header/separator
                if (line.includes('---')) {
                    continue;
                }

                const isHeader = !tableHTML.includes('</thead>') && !tableHTML.includes('<tbody>');
                if (isHeader) {
                    tableHTML += '<thead><tr>';
                    cells.forEach(cell => {
                        tableHTML += `<th>${cell.trim()}</th>`;
                    });
                    tableHTML += '</tr></thead><tbody>';
                } else {
                    tableHTML += '<tr>';
                    cells.forEach(cell => {
                        tableHTML += `<td>${cell.trim()}</td>`;
                    });
                    tableHTML += '</tr>';
                }
            } else {
                if (inTable) {
                    inTable = false;
                    tableHTML += '</tbody></table></div>';
                    result.push(tableHTML);
                    tableHTML = '';
                }
                result.push(line);
            }
        }

        if (inTable) {
            tableHTML += '</tbody></table></div>';
            result.push(tableHTML);
        }

        return result.join('\n');
    }

    // Create widget HTML
    function createWidget() {
        const container = document.createElement('div');
        container.id = 'ragged-chat-widget';
        container.innerHTML = `
            <style>
                #ragged-chat-widget * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                
                #ragged-widget-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                
                #ragged-chat-window {
                    position: fixed;
                    bottom: 96px;
                    right: 24px;
                    width: calc(100% - 48px);
                    height: calc(100% - 140px);
                    max-width: 380px;
                    max-height: 540px;
                    background: rgba(9, 9, 11, 0.8);
                    backdrop-filter: blur(48px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    border-radius: 24px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
                }
                
                @media (min-width: 640px) {
                    #ragged-chat-window {
                        position: static;
                        width: 380px;
                        height: 540px;
                        margin-bottom: 20px;
                        border-radius: 32px;
                        box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.6);
                    }
                }
                
                #ragged-chat-header {
                    padding: 16px;
                    background: white;
                    color: black;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    flex-shrink: 0;
                }
                
                @media (min-width: 640px) {
                    #ragged-chat-header {
                        padding: 24px;
                    }
                }
                
                #ragged-chat-header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                
                #ragged-chat-avatar {
                    width: 32px;
                    height: 32px;
                    background: black;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
                    overflow: hidden;
                    flex-shrink: 0;
                }
                
                @media (min-width: 640px) {
                    #ragged-chat-avatar {
                        width: 40px;
                        height: 40px;
                    }
                }
                
                #ragged-chat-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                #ragged-chat-title {
                    font-weight: 700;
                    font-size: 13px;
                    letter-spacing: -0.05em;
                }
                
                @media (min-width: 640px) {
                    #ragged-chat-title {
                        font-size: 14px;
                    }
                }
                
                #ragged-chat-status {
                    font-size: 9px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #71717a;
                    margin-top: 2px;
                }
                
                @media (min-width: 640px) {
                    #ragged-chat-status {
                        font-size: 10px;
                        margin-top: 4px;
                    }
                }
                
                #ragged-close-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 12px;
                    border-radius: 50%;
                    transition: background 0.2s;
                    min-width: 44px;
                    min-height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @media (min-width: 640px) {
                    #ragged-close-btn {
                        padding: 8px;
                        min-width: auto;
                        min-height: auto;
                    }
                }
                
                #ragged-close-btn:hover {
                    background: rgba(0, 0, 0, 0.05);
                }
                
                #ragged-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                
                @media (min-width: 768px) {
                    #ragged-messages {
                        padding: 24px;
                    }
                }
                
                #ragged-empty-state {
                    text-align: center;
                    padding: 40px 20px;
                }
                
                @media (min-width: 640px) {
                    #ragged-empty-state {
                        padding: 80px 20px;
                    }
                }
                
                #ragged-empty-icon {
                    width: 64px;
                    height: 64px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                #ragged-empty-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #e4e4e7;
                    margin-bottom: 8px;
                }
                
                @media (min-width: 640px) {
                    #ragged-empty-title {
                        font-size: 20px;
                    }
                }
                
                #ragged-empty-text {
                    color: #71717a;
                    font-size: 14px;
                    max-width: 300px;
                    margin: 0 auto;
                }
                
                .ragged-message {
                    display: flex;
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .ragged-message.user {
                    justify-content: flex-end;
                }
                
                .ragged-message-content {
                    max-width: 85%;
                    padding: 14px 18px;
                    border-radius: 16px;
                    font-size: 14px;
                    line-height: 1.6;
                    font-weight: 600;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    word-break: break-word;
                }
                
                .ragged-message-content a {
                    color: inherit;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                    transition: opacity 0.2s;
                }

                .ragged-message-content a:hover {
                    opacity: 0.8;
                }

                .ragged-message-content iframe, 
                .ragged-message-content embed {
                    max-width: 100%;
                    border-radius: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    margin: 8px 0;
                    font-weight: 700;
                }

                .ragged-message-content strong {
                    font-weight: 800;
                    color: inherit;
                }

                .ragged-table-container {
                    width: 100%;
                    overflow-x: auto;
                    margin: 12px 0;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.02);
                }

                .ragged-message.user .ragged-table-container {
                    border-color: rgba(255, 255, 255, 0.2);
                    background: rgba(0, 0, 0, 0.1);
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                    line-height: 1.4;
                }

                th, td {
                    padding: 8px 12px;
                    text-align: left;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                th {
                    font-weight: 700;
                    color: #a1a1aa;
                    background: rgba(255, 255, 255, 0.03);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                tr:last-child td {
                    border-bottom: none;
                }

                .ragged-message.user td, .ragged-message.user th {
                    border-bottom-color: rgba(255, 255, 255, 0.1);
                }
                
                .ragged-message.user .ragged-message-content {
                    color: white;
                    border-top-right-radius: 4px;
                }
                
                .ragged-message.assistant .ragged-message-content {
                    background: rgba(39, 39, 42, 0.8);
                    color: #fafafa;
                    border-top-left-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .ragged-loading {
                    display: flex;
                    gap: 4px;
                    padding: 16px;
                    background: rgba(39, 39, 42, 0.8);
                    border-radius: 16px;
                    border-top-left-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    width: fit-content;
                }
                
                .ragged-loading-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    animation: bounce 1.4s infinite ease-in-out both;
                }
                
                .ragged-loading-dot:nth-child(1) { animation-delay: -0.32s; }
                .ragged-loading-dot:nth-child(2) { animation-delay: -0.16s; }
                
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                
                #ragged-input-container {
                    padding: 16px 24px;
                    background: rgba(24, 24, 27, 0.5);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    flex-shrink: 0;
                }
                
                @media (min-width: 768px) {
                    #ragged-input-container {
                        padding: 24px;
                    }
                }
                
                #ragged-input-form {
                    display: flex;
                    gap: 12px;
                }
                
                #ragged-input {
                    flex: 1;
                    background: rgba(39, 39, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 12px 20px;
                    font-size: 14px;
                    color: white;
                    outline: none;
                    transition: all 0.2s;
                }
                
                #ragged-input::placeholder {
                    color: #52525b;
                }
                
                #ragged-input:focus {
                    border-color: rgba(59, 130, 246, 0.5);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                #ragged-send-btn {
                    padding: 12px 16px;
                    border: none;
                    border-radius: 16px;
                    font-weight: 500;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: white;
                    min-height: 44px;
                }
                
                @media (min-width: 640px) {
                    #ragged-send-btn {
                        padding: 12px 24px;
                        gap: 8px;
                    }
                }
                
                #ragged-send-btn:hover {
                    transform: scale(1.05);
                }
                
                #ragged-send-btn:active {
                    transform: scale(0.95);
                }
                
                #ragged-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
                
                #ragged-toggle-btn {
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }
                
                /* Size variations */
                #ragged-toggle-btn.size-small {
                    width: 48px;
                    height: 48px;
                }
                
                #ragged-toggle-btn.size-medium {
                    width: 56px;
                    height: 56px;
                }
                
                #ragged-toggle-btn.size-large {
                    width: 68px;
                    height: 68px;
                }
                
                /* Shape variations */
                #ragged-toggle-btn.shape-circle {
                    border-radius: 50%;
                }
                
                #ragged-toggle-btn.shape-rounded-square {
                    border-radius: 16px;
                }
                
                #ragged-toggle-btn:hover {
                    transform: scale(1.1);
                }
                
                #ragged-toggle-btn:active {
                    transform: scale(0.9);
                }
                
                .ragged-toggle-icon {
                    position: absolute;
                    transition: all 0.3s;
                }
                
                .ragged-toggle-icon.hidden {
                    opacity: 0;
                    transform: scale(0);
                }
                
                #ragged-toggle-logo {
                    position: absolute;
                    inset: 0;
                    transition: all 0.3s;
                }
                
                #ragged-toggle-logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                #ragged-toggle-logo.hidden {
                    opacity: 0;
                    transform: scale(0);
                }
                
                .ragged-hidden {
                    display: none !important;
                }

                #ragged-tabs {
                    display: flex;
                    background: #18181b;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    flex-shrink: 0;
                }

                .ragged-tab-btn {
                    flex: 1;
                    padding: 12px 0;
                    background: transparent;
                    border: none;
                    color: #71717a;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s;
                    position: relative;
                }

                .ragged-tab-btn:hover {
                    color: #e4e4e7;
                }

                .ragged-tab-btn.active {
                    color: white;
                }

                .ragged-tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 4px;
                    background: white;
                    border-radius: 50%;
                }

                #ragged-links-view, #ragged-support-view {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .ragged-view-title {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #71717a;
                    margin-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 8px;
                }

                .ragged-link-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    text-decoration: none;
                    color: #e4e4e7;
                    transition: all 0.2s;
                }

                .ragged-link-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }

                .ragged-link-label {
                    font-weight: 600;
                    font-size: 14px;
                }

                .ragged-support-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .ragged-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .ragged-form-label {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #71717a;
                    margin-left: 4px;
                }

                .ragged-form-input, .ragged-form-select, .ragged-form-textarea {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 10px 14px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                    width: 100%;
                }

                .ragged-form-input:focus, .ragged-form-select:focus, .ragged-form-textarea:focus {
                    border-color: rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.08);
                }

                .ragged-form-textarea {
                    height: 100px;
                    resize: none;
                }

                .ragged-form-row {
                    display: grid;
                    grid-template-cols: 1fr 1fr;
                    gap: 12px;
                }

                #ragged-support-submit {
                    margin-top: 8px;
                    height: 48px;
                    border-radius: 16px;
                    border: none;
                    color: white;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }

                #ragged-support-submit:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }

                #ragged-support-submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .ragged-loading-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: ragged-spin 0.6s linear infinite;
                }

                @keyframes ragged-spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            
            <div id="ragged-widget-container">
                <div id="ragged-chat-window" class="ragged-hidden">
                        <div id="ragged-tabs">
                            <button id="ragged-tab-chat" class="ragged-tab-btn active">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 2px;">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <span>Chat</span>
                            </button>
                            <button id="ragged-tab-links" class="ragged-tab-btn ragged-hidden">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 2px;">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                                <span>Links</span>
                            </button>
                            <button id="ragged-tab-support" class="ragged-tab-btn ragged-hidden">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 2px;">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <circle cx="12" cy="12" r="4"></circle>
                                    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line>
                                    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line>
                                    <line x1="14.83" y1="4.93" x2="10.59" y2="9.17"></line>
                                    <line x1="4.93" y1="14.83" x2="9.17" y2="19.07"></line>
                                </svg>
                                <span>Support</span>
                            </button>
                        </div>
                        
                        <div id="ragged-chat-view">
                            <div id="ragged-messages">
                                <div id="ragged-empty-state">
                                    <div id="ragged-empty-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                    </div>
                                    <div id="ragged-empty-title">How can I help you?</div>
                                    <div id="ragged-empty-text">Ask anything about our services, products, or pricing. I'm here to help!</div>
                                </div>
                            </div>
                            
                            <div id="ragged-input-container">
                                <form id="ragged-input-form">
                                    <input 
                                        type="text" 
                                        id="ragged-input" 
                                        placeholder="Type your message here..."
                                        autocomplete="off"
                                    />
                                    <button type="submit" id="ragged-send-btn">
                                        <span>Send</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div id="ragged-links-view" class="ragged-hidden">
                            <div class="ragged-view-title">Vital Resources</div>
                            <div id="ragged-links-list"></div>
                        </div>

                        <div id="ragged-support-view" class="ragged-hidden">
                            <div class="ragged-view-title">Support Ticket</div>
                            <form id="ragged-support-form" class="ragged-support-form">
                                <div class="ragged-form-group">
                                    <label class="ragged-form-label">Name</label>
                                    <input type="text" id="ragged-support-name" class="ragged-form-input" required placeholder="Your Name" />
                                </div>
                                <div class="ragged-form-group">
                                    <label class="ragged-form-label">Email</label>
                                    <input type="email" id="ragged-support-email" class="ragged-form-input" required placeholder="Your Email" />
                                </div>
                                <div class="ragged-form-row">
                                    <div class="ragged-form-group">
                                        <label class="ragged-form-label">Type</label>
                                        <select id="ragged-support-type" class="ragged-form-select">
                                            <option value="general question">General Question</option>
                                            <option value="feature request">Feature Request</option>
                                            <option value="issue/bug">Issue/Bug</option>
                                            <option value="account creation">Account Creation</option>
                                            <option value="unclear">Unclear</option>
                                        </select>
                                    </div>
                                    <div class="ragged-form-group">
                                        <label class="ragged-form-label">Impact</label>
                                        <select id="ragged-support-impact" class="ragged-form-select">
                                            <option value="low">Low</option>
                                            <option value="moderate" selected>Moderate</option>
                                            <option value="high">High</option>
                                            <option value="blocking">Blocking</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="ragged-form-group">
                                    <label class="ragged-form-label">Message</label>
                                    <textarea id="ragged-support-desc" class="ragged-form-textarea" required placeholder="Tell us more..."></textarea>
                                </div>
                                <button type="submit" id="ragged-support-submit">Submit Ticket</button>
                            </form>
                        </div>
                </div>
                
                <button id="ragged-toggle-btn">
                    <div id="ragged-toggle-logo" class="hidden"></div>
                    <svg class="ragged-toggle-icon" id="ragged-icon-message" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <svg class="ragged-toggle-icon hidden" id="ragged-icon-close" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(container);
        return container;
    }

    // Render messages
    function renderMessages() {
        const messagesContainer = document.getElementById('ragged-messages');
        const emptyState = document.getElementById('ragged-empty-state');

        if (!messagesContainer) {
            console.error('[Ragged SDK] Messages container not found. Widget might not be fully initialized.');
            return;
        }

        if (!emptyState) {
            console.warn('[Ragged SDK] Empty state container not found.');
        }

        if (messages.length === 0) {
            if (emptyState) emptyState.classList.remove('ragged-hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('ragged-hidden');

        const messagesHTML = messages.map(msg => `
            <div class="ragged-message ${msg.role}">
                <div class="ragged-message-content" style="${msg.role === 'user' ? `background-color: ${chatConfig?.settings?.primaryColor || '#3b82f6'}` : ''}">${formatMessage(msg.content)}</div>
            </div>
        `).join('');

        const loadingHTML = isLoading ? `
            <div class="ragged-message assistant">
                <div class="ragged-loading">
                    <div class="ragged-loading-dot" style="background-color: ${chatConfig?.settings?.primaryColor || '#3b82f6'}"></div>
                    <div class="ragged-loading-dot" style="background-color: ${chatConfig?.settings?.primaryColor || '#3b82f6'}"></div>
                    <div class="ragged-loading-dot" style="background-color: ${chatConfig?.settings?.primaryColor || '#3b82f6'}"></div>
                </div>
            </div>
        ` : '';

        messagesContainer.innerHTML = messagesHTML + loadingHTML;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Toggle widget
    function toggleWidget() {
        isOpen = !isOpen;
        const chatWindow = document.getElementById('ragged-chat-window');
        const toggleBtn = document.getElementById('ragged-toggle-btn');
        const iconMessage = document.getElementById('ragged-icon-message');
        const iconClose = document.getElementById('ragged-icon-close');
        const toggleLogo = document.getElementById('ragged-toggle-logo');

        if (isOpen) {
            chatWindow.classList.remove('ragged-hidden');
            iconMessage.classList.add('hidden');
            iconClose.classList.remove('hidden');
            if (chatConfig?.settings?.brandLogo) {
                toggleLogo.classList.add('hidden');
            }
            toggleBtn.style.backgroundColor = '#000000';
        } else {
            chatWindow.classList.add('ragged-hidden');
            if (!chatConfig?.settings?.brandLogo) {
                iconMessage.classList.remove('hidden');
            }
            iconClose.classList.add('hidden');
            if (chatConfig?.settings?.brandLogo) {
                toggleLogo.classList.remove('hidden');
            }
            toggleBtn.style.backgroundColor = chatConfig?.settings?.primaryColor || '#000000';
        }
    }

    // Handle message send
    async function handleSend(e) {
        e.preventDefault();

        const input = document.getElementById('ragged-input');
        if (!input) {
            console.error('[Ragged SDK] Input element not found');
            return;
        }

        const message = input.value.trim();

        if (!message || isLoading) return;

        messages.push({ role: 'user', content: message });
        input.value = '';
        isLoading = true;
        renderMessages();

        const response = await sendMessage(message);
        messages.push({ role: 'assistant', content: response });
        isLoading = false;
        renderMessages();
    }

    // Initialize widget
    async function initializeWidget() {
        // Prevent double initialization
        if (initialized) return;
        initialized = true;

        await fetchConfig();

        const widget = createWidget();

        if (chatConfig) {
            const toggleBtn = document.getElementById('ragged-toggle-btn');
            const sendBtn = document.getElementById('ragged-send-btn');
            const chatTitle = document.getElementById('ragged-chat-title');
            const input = document.getElementById('ragged-input');
            const emptyTitle = document.getElementById('ragged-empty-title');
            const avatar = document.getElementById('ragged-chat-avatar');
            const toggleLogo = document.getElementById('ragged-toggle-logo');
            const supportSubmitBtn = document.getElementById('ragged-support-submit');

            const primaryColor = chatConfig.settings?.primaryColor || '#000000';
            toggleBtn.style.backgroundColor = primaryColor;
            sendBtn.style.backgroundColor = primaryColor;
            if (supportSubmitBtn) supportSubmitBtn.style.backgroundColor = primaryColor;

            chatTitle.textContent = chatConfig.name || 'AI Agent';
            input.placeholder = chatConfig.settings?.placeholder || 'Type your message here...';
            emptyTitle.textContent = chatConfig.settings?.welcomeMessage || 'How can I help you?';

            // Show Tabs based on config
            if (chatConfig.settings?.bookmarks?.length > 0) {
                document.getElementById('ragged-tab-links').classList.remove('ragged-hidden');
            }
            if (chatConfig.settings?.supportSettings?.enabled) {
                document.getElementById('ragged-tab-support').classList.remove('ragged-hidden');
            }

            // Apply widget shape and size customization
            if (chatConfig.settings) {
                // Prioritize backend settings if they exist, otherwise use init config
                if (chatConfig.settings.widgetShape) widgetShape = chatConfig.settings.widgetShape;
                if (chatConfig.settings.widgetSize) widgetSize = chatConfig.settings.widgetSize;
            }

            if (toggleBtn) {
                // Clear any existing shape/size classes
                toggleBtn.classList.remove('shape-circle', 'shape-rounded-square', 'size-small', 'size-medium', 'size-large');
                toggleBtn.classList.add(`shape-${widgetShape}`);
                toggleBtn.classList.add(`size-${widgetSize}`);

                // Also update icon sizing
                const iconMessage = document.getElementById('ragged-icon-message');
                const iconClose = document.getElementById('ragged-icon-close');
                if (iconMessage) {
                    iconMessage.setAttribute('width', widgetSize === 'small' ? '24' : widgetSize === 'large' ? '32' : '28');
                    iconMessage.setAttribute('height', widgetSize === 'small' ? '24' : widgetSize === 'large' ? '32' : '28');
                }
                if (iconClose) {
                    iconClose.setAttribute('width', widgetSize === 'small' ? '24' : widgetSize === 'large' ? '32' : '28');
                    iconClose.setAttribute('height', widgetSize === 'small' ? '24' : widgetSize === 'large' ? '32' : '28');
                }
            }

            // Set custom logo for all users (free platform)
            if (chatConfig.settings?.brandLogo) {
                const logoUrl = chatConfig.settings.brandLogo;
                if (avatar) {
                    avatar.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:100%; height:100%; object-fit:cover;" />`;
                }
                if (toggleLogo) {
                    toggleLogo.innerHTML = `<img src="${logoUrl}" alt="Chat" style="width:100%; height:100%; object-fit:cover;" />`;
                    toggleLogo.classList.remove('hidden');
                    // Hide the default message icon if logo is present
                    const iconMessage = document.getElementById('ragged-icon-message');
                    if (iconMessage) iconMessage.classList.add('hidden');
                }
            }
        }

        document.getElementById('ragged-toggle-btn').addEventListener('click', toggleWidget);
        document.getElementById('ragged-close-btn').addEventListener('click', toggleWidget);
        document.getElementById('ragged-input-form').addEventListener('submit', handleSend);

        // Tab Listeners
        document.getElementById('ragged-tab-chat').addEventListener('click', () => switchTab('chat'));
        document.getElementById('ragged-tab-links').addEventListener('click', () => switchTab('links'));
        document.getElementById('ragged-tab-support').addEventListener('click', () => switchTab('support'));

        // Support Form Listener
        document.getElementById('ragged-support-form').addEventListener('submit', handleSubmitSupport);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWidget);
    } else {
        initializeWidget();
    }
}
