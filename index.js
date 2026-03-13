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

        const getIconForLabel = (label) => {
            const l = label.toLowerCase();
            if (l.includes('blog')) return `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`;
            if (l.includes('start')) return `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>`;
            if (l.includes('doc')) return `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`;
            if (l.includes('community') || l.includes('group')) return `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`;
            return `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`;
        };

        const getDescForLabel = (label) => {
            const l = label.toLowerCase();
            if (l.includes('blog')) return 'Latest updates, tutorials, and tech insights.';
            if (l.includes('start')) return 'Quick start guides to launch your project.';
            if (l.includes('doc')) return 'Detailed API references and platform guides.';
            if (l.includes('community')) return 'Connect with other developers and experts.';
            return 'Explore our resources and helpful links.';
        };

        const gridHTML = links.map(link => `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="ragged-link-card">
                <div class="ragged-link-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${getIconForLabel(link.label)}
                    </svg>
                </div>
                <div class="ragged-link-card-title-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <span class="ragged-link-card-title">${link.label}</span>
                </div>
                <div class="ragged-link-card-desc">${getDescForLabel(link.label)}</div>
                <div class="ragged-link-card-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 22 3 22 10"/>
                        <line x1="10" y1="14" x2="22" y2="3"/>
                    </svg>
                </div>
            </a>
        `).join('');

        container.innerHTML = `
            ${gridHTML}
            <div style="grid-column: span 2;">
                // <div class="ragged-links-bottom">Need help? <a mailto="support@raggedai.com" onclick="Ragged.switchTab('support'); return false;">Contact Support</a></div>
            </div>
        `;
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
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    background: #0f1117;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 1000000;
                }
                
                @media (min-width: 640px) {
                    #ragged-chat-window {
                        position: static;
                        width: 320px;
                        height: 520px;
                        margin-bottom: 24px;
                        border-radius: 20px;
                        box-shadow: 0 32px 64px rgba(0,0,0,0.7);
                        display: flex;
                        flex-direction: column;
                    }
                }
                
                #ragged-header-gradient {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
                    z-index: 20;
                }

                #ragged-chat-header {
                    padding: 16px 18px;
                    background: #0f1117;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    flex-shrink: 0;
                    position: relative;
                    z-index: 10;
                }
                
                #ragged-chat-header-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                #ragged-chat-avatar {
                    width: 32px;
                    height: 32px;
                    background: rgba(255, 255, 255, 0.1);
                    color: #a1a1aa;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                
                #ragged-chat-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                #ragged-chat-title {
                    font-weight: 700;
                    font-size: 14px;
                    letter-spacing: -0.01em;
                    line-height: 1;
                    color: #fff;
                }
                
                #ragged-close-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 50%;
                    transition: color 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255, 255, 255, 0.4);
                }
                
                #ragged-close-btn:hover {
                    color: white;
                }
                
                #ragged-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                
                #ragged-empty-state {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 24px 24px;
                    min-height: 300px;
                    background: #0f1117;
                }
                
                #ragged-empty-icon-wrapper {
                    position: relative;
                    margin-bottom: 24px;
                }

                #ragged-empty-icon {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                #ragged-notification-dot {
                    position: absolute;
                    top: 7px;
                    right: 7px;
                    width: 11px;
                    height: 11px;
                    background: #fff;
                    border-radius: 50%;
                    border: 2px solid #0f1117;
                }
                
                #ragged-empty-title {
                    font-size: 18px;
                    font-weight: 800;
                    color: #fff;
                    text-align: center;
                    margin-bottom: 10px;
                    line-height: 1.3;
                    letter-spacing: -0.02em;
                }
                
                #ragged-empty-text {
                    font-size: 12px;
                    color: #71717a;
                    text-align: center;
                    line-height: 1.6;
                    max-width: 220px;
                    margin-bottom: 24px;
                }

                #ragged-start-chat-text {
                    color: #fff;
                    font-size: 16px;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    cursor: default;
                    text-decoration: none;
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
                    padding: 14px 16px;
                    background: #0f1117;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    flex-shrink: 0;
                }
                
                #ragged-input-form {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                
                #ragged-input-bar {
                    flex: 1;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    padding: 4px 10px;
                    gap: 6px;
                    transition: all 0.2s;
                }

                #ragged-input-bar:focus-within {
                    border-color: rgba(255, 255, 255, 0.14);
                    background: rgba(255, 255, 255, 0.05);
                }
                
                #ragged-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #e4e4e7;
                    font-size: 13px;
                    padding: 8px 0;
                }

                .ragged-input-action-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #52525b;
                    display: flex;
                    align-items: center;
                    padding: 4px;
                    transition: color 0.15s;
                }

                .ragged-input-action-btn:hover {
                    color: #a1a1aa;
                }
                
                #ragged-send-btn {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 8px;
                    background: white;
                    color: black;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.1s;
                    flex-shrink: 0;
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
                    background: #161820;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    flex-shrink: 0;
                }

                .ragged-tab-btn {
                    flex: 1;
                    padding: 11px 0;
                    background: transparent;
                    border: none;
                    color: #52525b;
                    font-size: 9px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transition: color 0.15s;
                    position: relative;
                }

                .ragged-tab-btn:hover {
                    color: #a1a1aa;
                }

                .ragged-tab-btn.active {
                    color: white;
                }

                .ragged-tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 20%;
                    right: 20%;
                    height: 2px;
                    background: white;
                    border-radius: 2px;
                }

                #ragged-chat-view, #ragged-links-view, #ragged-support-view {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }

                #ragged-links-view, #ragged-support-view {
                    padding: 24px;
                    gap: 16px;
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

                #ragged-links-list {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                    padding-bottom: 24px;
                }

                .ragged-link-card {
                    background: #0f1117;
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    border-radius: 8px;
                    padding: 9px 10px;
                    display: flex;
                    flex-direction: column;
                    text-decoration: none;
                    min-height: 82px;
                    transition: background 0.15s, border-color 0.15s;
                }

                .ragged-link-card:hover {
                    background: #161618;
                    border-color: rgba(255, 255, 255, 0.13);
                }

                .ragged-link-card-icon {
                    width: 20px;
                    height: 20px;
                    border-radius: 5px;
                    background: rgba(255, 255, 255, 0.07);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                    flex-shrink: 0;
                }

                .ragged-link-card-icon svg {
                    width: 10px;
                    height: 10px;
                    color: #a1a1aa;
                }

                .ragged-link-card-title-row {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-bottom: 4px;
                }

                .ragged-link-card-title-row svg {
                    width: 8px;
                    height: 8px;
                    color: #52525b;
                    flex-shrink: 0;
                }

                .ragged-link-card-title {
                    font-size: 10px;
                    font-weight: 700;
                    color: #fff;
                }

                .ragged-link-card-desc {
                    font-size: 9px;
                    color: #71717a;
                    line-height: 1.5;
                    flex: 1;
                }

                .ragged-link-card-footer {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 6px;
                }

                .ragged-link-card-footer svg {
                    width: 9px;
                    height: 9px;
                    color: #3f3f46;
                    transition: color 0.15s;
                }

                .ragged-link-card:hover .ragged-link-card-footer svg {
                    color: #71717a;
                }

                .ragged-links-bottom {
                    margin-top: 10px;
                    text-align: center;
                    font-size: 9px;
                    color: #52525b;
                }

                .ragged-links-bottom a {
                    color: #a1a1aa;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }

                .ragged-section-label {
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.14em;
                    color: #52525b;
                    margin-bottom: 18px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }

                .ragged-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    margin-bottom: 13px;
                }

                .ragged-form-label {
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.13em;
                    color: #52525b;
                }

                .ragged-form-input,
                .ragged-form-select,
                .ragged-form-textarea {
                    width: 100%;
                    background: #0f1117;
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    border-radius: 7px;
                    color: #e4e4e7;
                    font-size: 13px;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.15s, background 0.15s;
                }

                .ragged-form-input,
                .ragged-form-select {
                    height: 36px;
                    padding: 0 12px;
                    line-height: 36px;
                }

                .ragged-form-input::placeholder,
                .ragged-form-textarea::placeholder {
                    color: #3f3f46;
                }

                .ragged-form-input:focus,
                .ragged-form-select:focus,
                .ragged-form-textarea:focus {
                    border-color: rgba(255, 255, 255, 0.14);
                    background: rgba(255, 255, 255, 0.05);
                }

                .ragged-form-select {
                    appearance: none;
                    cursor: pointer;
                    padding-right: 32px;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                }

                .ragged-form-select option {
                    background: #1c1c1e;
                    color: #e4e4e7;
                }

                .ragged-form-textarea {
                    min-height: 96px;
                    padding: 10px 12px;
                    resize: none;
                    line-height: 1.5;
                }

                #ragged-support-submit {
                    margin-top: 16px;
                    width: 100%;
                    height: 44px;
                    border: none;
                    border-radius: 7px;
                    background: #ffffff !important;
                    color: #09090b !important;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.13em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: background 0.15s, transform 0.1s;
                }

                #ragged-support-submit:hover { background: #f4f4f5 !important; }
                #ragged-support-submit:active { transform: scale(0.98); }

                #ragged-support-submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .ragged-loading-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(0, 0, 0, 0.3);
                    border-radius: 50%;
                    border-top-color: #000;
                    animation: ragged-spin 0.6s linear infinite;
                }

                @keyframes ragged-spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            
            <div id="ragged-widget-container">
                <div id="ragged-chat-window" class="ragged-hidden">
                    <div id="ragged-header-gradient"></div>
                    <div id="ragged-chat-header">
                        <div id="ragged-chat-header-left">
                            <div id="ragged-chat-avatar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                                </svg>
                            </div>
                            <span id="ragged-chat-title">Support</span>
                        </div>
                        <button id="ragged-close-btn" aria-label="Close Chat">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>

                    <div id="ragged-tabs">
                        <button id="ragged-tab-chat" class="ragged-tab-btn active">Chat</button>
                        <button id="ragged-tab-links" class="ragged-tab-btn ragged-hidden">Links</button>
                        <button id="ragged-tab-support" class="ragged-tab-btn ragged-hidden">Support</button>
                    </div>
                        
                    <div id="ragged-chat-view">
                        <div id="ragged-messages">
                            <div id="ragged-empty-state">
                                <div id="ragged-empty-icon-wrapper">
                                    <div id="ragged-empty-icon">
                                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                    </div>
                                    <div id="ragged-notification-dot"></div>
                                </div>
                                <div id="ragged-empty-title">Hello! How can I help you today?</div>
                                <div id="ragged-empty-text">Ask anything about our services, products, or pricing. I'm here to help!</div>
                                <div id="ragged-start-chat-text">Start Chatting</div>
                            </div>
                        </div>
                            
                        <div id="ragged-input-container">
                            <form id="ragged-input-form">
                                <div id="ragged-input-bar">
                                    <button type="button" class="ragged-input-action-btn">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                            <line x1="9" y1="9" x2="9.01" y2="9"/>
                                            <line x1="15" y1="9" x2="15.01" y2="9"/>
                                        </svg>
                                    </button>
                                    <input type="text" id="ragged-input" placeholder="Type your message..." autocomplete="off">
                                    <button type="button" class="ragged-input-action-btn">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2.25 2.25 0 0 1-3.18-3.18l8.48-8.48"/>
                                        </svg>
                                    </button>
                                </div>
                                <button type="submit" id="ragged-send-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <line x1="22" y1="2" x2="11" y2="13" stroke="#09090b" stroke-width="2.5"/>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" fill="#09090b"/>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>

                    <div id="ragged-links-view" class="ragged-hidden">
                        <div class="ragged-section-label">Vital Resources</div>
                        <div id="ragged-links-list"></div>
                    </div>

                    <div id="ragged-support-view" class="ragged-hidden">
                        <div class="ragged-section-label">Support Ticket</div>

                        <form id="ragged-support-form" class="ragged-support-form">
                            <div class="ragged-form-group">
                                <label class="ragged-form-label">Name</label>
                                <input type="text" id="ragged-support-name" class="ragged-form-input" placeholder="Your Name" required>
                            </div>

                            <div class="ragged-form-group">
                                <label class="ragged-form-label">Email</label>
                                <input type="email" id="ragged-support-email" class="ragged-form-input" placeholder="Your Email" required>
                            </div>

                            <div class="ragged-form-group">
                                <label class="ragged-form-label">Type</label>
                                <select id="ragged-support-type" class="ragged-form-select">
                                    <option>Account Creation</option>
                                    <option>General Question</option>
                                    <option>Feature Request</option>
                                    <option>Issue/Bug</option>
                                </select>
                            </div>

                            <div class="ragged-form-group">
                                <label class="ragged-form-label">Impact</label>
                                <select id="ragged-support-impact" class="ragged-form-select">
                                    <option>Low</option>
                                    <option selected>Moderate</option>
                                    <option>High</option>
                                    <option>Blocking</option>
                                </select>
                            </div>

                            <div class="ragged-form-group">
                                <label class="ragged-form-label">Message</label>
                                <textarea id="ragged-support-desc" class="ragged-form-textarea" placeholder="Tell us more..." required></textarea>
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
            // Send button is now white in the new design, removed color override
            if (supportSubmitBtn) supportSubmitBtn.style.backgroundColor = primaryColor;

            if (chatTitle) chatTitle.textContent = chatConfig.name || 'Support';
            if (input) input.placeholder = chatConfig.settings?.placeholder || 'Type your message...';
            if (emptyTitle) emptyTitle.textContent = chatConfig.settings?.welcomeMessage || 'Hello! How can I help you today?';

            // Removed Start Chatting button listener as it is now text

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
                    const iconMsg = document.getElementById('ragged-icon-message');
                    if (iconMsg) iconMsg.classList.add('hidden');
                }
            }
        }

        const toggleBtn = document.getElementById('ragged-toggle-btn');
        const closeBtn = document.getElementById('ragged-close-btn');
        const inputForm = document.getElementById('ragged-input-form');
        const tabChat = document.getElementById('ragged-tab-chat');
        const tabLinks = document.getElementById('ragged-tab-links');
        const tabSupport = document.getElementById('ragged-tab-support');
        const supportForm = document.getElementById('ragged-support-form');

        if (toggleBtn) toggleBtn.addEventListener('click', toggleWidget);
        if (closeBtn) closeBtn.addEventListener('click', toggleWidget);
        if (inputForm) inputForm.addEventListener('submit', handleSend);

        // Tab Listeners
        if (tabChat) tabChat.addEventListener('click', () => switchTab('chat'));
        if (tabLinks) tabLinks.addEventListener('click', () => switchTab('links'));
        if (tabSupport) tabSupport.addEventListener('click', () => switchTab('support'));

        // Support Form Listener
        if (supportForm) supportForm.addEventListener('submit', handleSubmitSupport);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWidget);
    } else {
        initializeWidget();
    }
}
