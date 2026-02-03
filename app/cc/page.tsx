'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import './style.css';

export default function CommunicationCenter() {

    useEffect(() => {
        // App logic moved here to ensure it runs after hydration
        const runCCApp = () => {
            const PAGE_ID = '965040846691414';
            let FB_APP_ID = localStorage.getItem('fb_app_id') || '';
            let currentAccessToken = '';
            let pageAccessToken = '';
            let activeConversationId = null;
            let activeReceiverId = null;

            // DOM Elements
            const views = {
                login: document.getElementById('loginView'),
                dashboard: document.getElementById('dashboardView'),
                conversation: document.getElementById('conversationView')
            };

            // Allow null checks because React might re-render
            if (!views.login) return;

            const loginBtn = document.getElementById('loginBtn');
            const initBtn = document.getElementById('initBtn');
            const appIdInput = document.getElementById('appIdInput');
            const backToDashBtn = document.getElementById('backToDashBtn');
            const sendReplyBtn = document.getElementById('sendReplyBtn');
            const replyInput = document.getElementById('replyInput');

            // Initialize
            async function init() {
                try {
                    const res = await fetch('/api/config');
                    if (res.ok) {
                        const config = await res.json();
                        if (config.appId) {
                            FB_APP_ID = config.appId;
                            localStorage.setItem('fb_app_id', FB_APP_ID);
                        }
                    }
                } catch (e) {
                    console.log("Using local config");
                }

                if (FB_APP_ID) {
                    const card = document.querySelector('.glass-card') as HTMLElement;
                    if (card) card.style.display = 'none';
                    showToast('Auto-connecting...');
                    loadFacebookSDK();
                }
            }

            // Event Listeners (Use onclick to prevent duplicate listeners on re-renders)
            if (initBtn) {
                initBtn.onclick = () => {
                    const val = (appIdInput as HTMLInputElement).value.trim();
                    if (val && /^\d+$/.test(val)) {
                        FB_APP_ID = val;
                        localStorage.setItem('fb_app_id', val);
                        loadFacebookSDK();
                        showToast('Initializing SDK...');
                        (document.querySelector('.glass-card') as HTMLElement).style.display = 'none';
                    } else {
                        showToast('Invalid App ID. Use numbers only.');
                    }
                };
            }

            if (loginBtn) loginBtn.onclick = login;

            if (backToDashBtn) {
                backToDashBtn.onclick = () => {
                    views.conversation.classList.add('hidden');
                    views.dashboard.classList.remove('hidden');
                    activeConversationId = null;
                    activeReceiverId = null;
                    // Stop polling
                    if ((window as any).chatInterval) clearInterval((window as any).chatInterval);
                };
            }

            if (sendReplyBtn) sendReplyBtn.onclick = sendMessage;
            if (replyInput) {
                replyInput.onkeypress = (e) => {
                    if (e.key === 'Enter') sendMessage();
                };
            }

            // Methods
            function loadFacebookSDK() {
                if ((window as any).FB) {
                    try {
                        (window as any).FB.init({
                            appId: FB_APP_ID,
                            cookie: true,
                            xfbml: true,
                            version: 'v18.0'
                        });
                        checkLoginState();
                    } catch (e: any) {
                        console.error(e);
                        showToast('SDK Error (re-init): ' + e.message);
                        (document.querySelector('.glass-card') as HTMLElement).style.display = 'flex';
                    }
                    return;
                }

                (window as any).fbAsyncInit = function () {
                    (window as any).FB.init({
                        appId: FB_APP_ID,
                        cookie: true,
                        xfbml: true,
                        version: 'v18.0'
                    });

                    (window as any).FB.AppEvents.logPageView();
                    checkLoginState();
                };

                // Remove existing script if any to prevent duplicates? 
                // Actually FB SDK handles this check usually.
                (function (d, s, id) {
                    var js: any, fjs = d.getElementsByTagName(s)[0];
                    if (d.getElementById(id)) { return; }
                    js = d.createElement(s); js.id = id;
                    js.src = "https://connect.facebook.net/en_US/sdk.js";
                    fjs.parentNode.insertBefore(js, fjs);
                }(document, 'script', 'facebook-jssdk'));
            }

            function checkLoginState() {
                (window as any).FB.getLoginStatus(function (response: any) {
                    statusChangeCallback(response);
                });
            }

            function statusChangeCallback(response: any) {
                if (response.status === 'connected') {
                    currentAccessToken = response.authResponse.accessToken;
                    showDashboard(currentAccessToken);
                } else {
                    showLogin();
                }
            }

            function login() {
                const perms = 'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_read_user_content,pages_manage_posts,pages_messaging';

                if (!(window as any).FB) {
                    showToast('SDK not ready. Reload page?');
                    return;
                }

                (window as any).FB.login(function (response: any) {
                    if (response.status === 'connected') {
                        currentAccessToken = response.authResponse.accessToken;
                        showDashboard(currentAccessToken);
                    } else {
                        showToast('Login cancelled');
                    }
                }, { scope: perms });
            }

            function showLogin() {
                views.login.classList.remove('hidden');
                views.login.classList.add('active');
                views.dashboard.classList.add('hidden');
                views.conversation.classList.add('hidden');

                if (!FB_APP_ID) {
                    const card = document.querySelector('.glass-card') as HTMLElement;
                    if (card) card.style.display = 'flex';
                }

                if (loginBtn) {
                    loginBtn.innerHTML = '<i data-lucide="facebook"></i> Login with Facebook';
                    loginBtn.onclick = login;
                }
                (window as any).lucide.createIcons();
            }

            function showDashboard(userAccessToken: string) {
                views.login.classList.add('hidden');
                views.login.classList.remove('active');
                views.dashboard.classList.remove('hidden');
                views.dashboard.classList.add('active');
                views.conversation.classList.add('hidden');

                if (loginBtn) {
                    loginBtn.innerHTML = '<i data-lucide="log-out"></i> Logout';
                    loginBtn.onclick = logout;
                }

                fetchPageData(userAccessToken);
                (window as any).lucide.createIcons();
            }

            function logout() {
                (window as any).FB.logout(function (response: any) {
                    showLogin();
                });
            }

            async function fetchPageData(userToken: string) {
                showToast('Fetching page data...');

                (window as any).FB.api('/me/accounts', function (response: any) {
                    if (response && !response.error) {
                        const page = response.data.find((p: any) => p.id === PAGE_ID);
                        if (page) {
                            pageAccessToken = page.access_token;
                            loadPageStats(pageAccessToken);
                            loadMessages(pageAccessToken);
                            loadComments(pageAccessToken);
                        } else {
                            showToast('Page not found. Are you admin?');
                        }
                    } else {
                        console.error(response.error);
                        showToast('Error fetching accounts');
                    }
                });
            }

            function loadPageStats(token: string) {
                (window as any).FB.api(`/${PAGE_ID}?fields=new_like_count,talking_about_count,fan_count`, { access_token: token }, function (response: any) {
                    if (response && !response.error) {
                        const newFollowers = document.getElementById('newFollowers');
                        if (newFollowers) newFollowers.innerText = response.fan_count || 0;
                    }
                });
            }

            function loadMessages(token: string) {
                (window as any).FB.api(`/${PAGE_ID}/conversations?fields=id,updated_time,participants,messages.limit(1){message,from,attachments}`, { access_token: token }, function (response: any) {
                    const container = document.getElementById('messagesList');
                    if (!container) return;
                    container.innerHTML = '';

                    if (response && !response.data) {
                        container.innerHTML = '<div class="empty-state">No messages found.</div>';
                        return;
                    }

                    if (response.data.length > 0) {
                        response.data.forEach((conv: any) => {
                            const participant = conv.participants && conv.participants.data ?
                                conv.participants.data.find((p: any) => p.id !== PAGE_ID) : null;

                            if (!participant) return;

                            const senderName = participant.name;
                            const senderId = participant.id;

                            const lastMsgObj = conv.messages && conv.messages.data[0] ? conv.messages.data[0] : null;
                            let lastMsg = 'No content';

                            if (lastMsgObj) {
                                if (lastMsgObj.message) {
                                    lastMsg = lastMsgObj.message;
                                } else if (lastMsgObj.attachments && lastMsgObj.attachments.data) {
                                    const type = lastMsgObj.attachments.data[0].type || 'file';
                                    lastMsg = `[${type}] Attachment`;
                                }
                            }

                            const picUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;

                            const card = document.createElement('div');
                            card.className = 'message-card';
                            card.onclick = () => openConversation(conv.id, senderName, picUrl, senderId);

                            card.innerHTML = `
                                <img src="${picUrl}" alt="${senderName}" class="avatar">
                                <div class="item-content">
                                    <div class="item-header">
                                        <span class="item-title">${senderName}</span>
                                        <span class="item-date">${new Date(conv.updated_time).toLocaleDateString()}</span>
                                    </div>
                                    <div class="item-snippet">${lastMsg}</div>
                                </div>
                            `;
                            container.appendChild(card);
                        });
                    }
                });
            }

            function openConversation(convId: string, name: string, picUrl: string, senderId: string) {
                activeConversationId = convId;
                activeReceiverId = senderId;

                views.dashboard.classList.add('hidden');
                views.conversation.classList.remove('hidden');

                const title = document.getElementById('chatTitle');
                if (title) {
                    title.innerHTML = `
                        <div style="display:flex; align-items:center; gap:10px; width:100%;">
                            <img src="${picUrl || 'https://ui-avatars.com/api/?name=User'}" class="avatar">
                            <div class="user-info" style="flex:1;">
                                <span>${name || 'Conversation'}</span>
                                <span class="status">Active Now</span>
                            </div>
                            <a href="https://www.facebook.com/${senderId}" target="_blank" class="btn btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;">
                                <i data-lucide="external-link"></i> Profile
                            </a>
                            <button class="btn btn-secondary" style="padding:0.4rem;" id="refreshChatBtn">
                                <i data-lucide="refresh-cw"></i>
                            </button>
                        </div>
                    `;
                }
                const refreshBtn = document.getElementById('refreshChatBtn');
                if (refreshBtn) refreshBtn.onclick = () => loadChatMessages(convId);

                (window as any).lucide.createIcons();

                loadChatMessages(convId);

                if ((window as any).chatInterval) clearInterval((window as any).chatInterval);
                (window as any).chatInterval = setInterval(() => {
                    if (activeConversationId === convId && !document.hidden) {
                        loadChatMessages(convId, true);
                    }
                }, 10000);
            }

            function loadChatMessages(convId: string, silent = false) {
                const container = document.getElementById('chatMessages');
                if (!container) return;

                if (!silent) container.innerHTML = '<div class="empty-state">Loading conversation...</div>';

                (window as any).FB.api(`/${convId}/messages?fields=message,from,created_time,attachments,id`, { access_token: pageAccessToken }, function (response: any) {
                    if (response && response.data) {
                        const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

                        let html = '';
                        const msgs = response.data.slice().reverse();
                        msgs.forEach((msg: any) => {
                            const isMe = msg.from.id === PAGE_ID;
                            let content = msg.message || '';

                            if (msg.attachments && msg.attachments.data) {
                                msg.attachments.data.forEach((att: any) => {
                                    if (att.image_data) {
                                        content += `<br><img src="${att.image_data.url}" class="chat-image" style="max-width:200px; border-radius:8px; margin-top:5px;">`;
                                    } else if (att.video_data) {
                                        content += `<br><video src="${att.video_data.url}" controls style="max-width:200px; margin-top:5px;"></video>`;
                                    } else if (att.file_url) {
                                        content += `<br><a href="${att.file_url}" target="_blank" style="color:var(--accent-blue); text-decoration:underline;">[File] Download</a>`;
                                    }
                                });
                            }

                            html += `
                                <div class="message-bubble ${isMe ? 'me' : 'them'}">
                                    ${content}
                                    <span class="message-time">${new Date(msg.created_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            `;
                        });

                        if (silent) {
                            if (container.innerHTML !== html) {
                                container.innerHTML = html;
                                if (wasAtBottom) container.scrollTop = container.scrollHeight;
                            }
                        } else {
                            container.innerHTML = html;
                            container.scrollTop = container.scrollHeight;
                        }

                    } else if (!silent) {
                        container.innerHTML = '<div class="empty-state">Failed to load messages.</div>';
                    }
                });
            }

            function sendMessage() {
                const text = (replyInput as HTMLInputElement).value.trim();
                if (!text) return;
                if (!activeReceiverId && !activeConversationId) {
                    showToast('Error: No recipient selected');
                    return;
                }

                const payload = {
                    recipient: { id: activeReceiverId },
                    message: { text: text },
                    access_token: pageAccessToken
                };

                const container = document.getElementById('chatMessages');
                if (container) {
                    const bubble = document.createElement('div');
                    bubble.className = 'message-bubble me pending';
                    bubble.style.opacity = '0.7';
                    bubble.innerHTML = `
                        ${text}
                        <span class="message-time">Sending...</span>
                    `;
                    container.appendChild(bubble);
                    container.scrollTop = container.scrollHeight;
                }

                (replyInput as HTMLInputElement).value = '';

                (window as any).FB.api('/me/messages', 'POST', payload, function (response: any) {
                    // Logic simpler for now - bubble added optimistically
                });
            }

            function loadComments(token: string) {
                // ... Comment logic simplified for brevity in this migration, assume similar structure
                // Or actually let's keep it to avoid breaking
                (window as any).FB.api(`/${PAGE_ID}/feed`, { access_token: token, fields: 'message,comments.limit(5){message,from{name,picture,id}}' }, function (response: any) {
                    const container = document.getElementById('commentsList');
                    if (!container) return;
                    container.innerHTML = '';

                    if (response && !response.error && response.data.length > 0) {
                        response.data.forEach((post: any) => {
                            if (post.comments && post.comments.data) {
                                post.comments.data.forEach((comment: any) => {
                                    const sender = comment.from ? comment.from.name : 'Unknown';
                                    const picUrl = comment.from && comment.from.picture && comment.from.picture.data ?
                                        comment.from.picture.data.url :
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(sender)}&background=random`;

                                    const div = document.createElement('div');
                                    div.className = 'comment-item';
                                    div.innerHTML = `
                                        <img src="${picUrl}" alt="${sender}" class="avatar">
                                        <div class="item-content">
                                            <div class="item-header">
                                                <span class="item-title">${sender}</span>
                                            </div>
                                            <div class="item-snippet">${comment.message}</div>
                                            <div class="comment-context">On post: "${post.message ? post.message.substring(0, 20) + '...' : 'Untitled'}"</div>
                                        </div>
                                    `;
                                    container.appendChild(div);
                                });
                            }
                        });
                        if (container.children.length === 0) {
                            container.innerHTML = '<div class="empty-state">No recent comments found.</div>';
                        }
                    } else {
                        container.innerHTML = '<div class="empty-state">No feed posts found.</div>';
                    }
                });
            }

            function showToast(msg: string) {
                const toast = document.getElementById('toast');
                if (toast) {
                    toast.innerText = msg;
                    toast.classList.remove('hidden');
                    setTimeout(() => {
                        toast.classList.add('hidden');
                    }, 3000);
                }
            }

            // Expose helpers
            (window as any).refreshMessages = () => { if (pageAccessToken) loadMessages(pageAccessToken); };
            (window as any).refreshComments = () => { if (pageAccessToken) loadComments(pageAccessToken); };

            init();

        }; // End runCCApp

        // Small delay to ensure lucide and DOM ready
        setTimeout(runCCApp, 100);

    }, []);

    return (
        <div id="app">
            <Script src="https://unpkg.com/lucide@latest" strategy="beforeInteractive" />
            <header class="navbar">
                <div class="logo">
                    <i data-lucide="message-square"></i>
                    <span>CommsCenter</span>
                </div>
                <div class="user-status" id="userStatus">
                    <button id="loginBtn" class="btn btn-primary">
                        <i data-lucide="facebook"></i> Login with Facebook
                    </button>
                </div>
            </header>

            <main class="container">
                {/* Login View */}
                <section id="loginView" class="view active">
                    <div class="hero">
                        <h1>Manage Your Community</h1>
                        <p>Connect your Facebook Page to start managing messages and comments in one place.</p>
                        <div class="glass-card">
                            <div class="input-group">
                                <label htmlFor="appIdInput">Facebook App ID</label>
                                <input type="text" id="appIdInput" placeholder="Enter your FB App ID to initialize" />
                            </div>
                            <button id="initBtn" class="btn btn-secondary">Initialize SDK</button>
                        </div>

                        <div class="setup-guide">
                            <h3><i data-lucide="alert-circle"></i> Setup Instructions</h3>
                            <p>If you see an "Invalid Scopes" error, check your App Type:</p>
                            <ol>
                                <li>Go to <a href="https://developers.facebook.com/apps/" target="_blank">Facebook Developers</a></li>
                                <li>Create New App &rarr; Select <strong>Other</strong> &rarr; Next</li>
                                <li>Select <strong>Business</strong> (Manage a business...)</li>
                                <li><strong>Do NOT</strong> select "Consumer" or "None".</li>
                                <li>Use the new App ID to initialize.</li>
                            </ol>
                        </div>
                    </div>
                </section>

                {/* Dashboard View */}
                <section id="dashboardView" class="view hidden">
                    <div class="dashboard-header">
                        <h2>Page Overview</h2>
                        <div class="page-badge">
                            <span class="label">Page ID:</span>
                            <span class="value">965040846691414</span>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="icon-box blue"><i data-lucide="message-circle"></i></div>
                            <div class="info">
                                <h3>Unread Messages</h3>
                                <p class="number" id="unreadMessages">-</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="icon-box green"><i data-lucide="mic"></i></div>
                            <div class="info">
                                <h3>New Comments</h3>
                                <p class="number" id="newComments">-</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="icon-box purple"><i data-lucide="users"></i></div>
                            <div class="info">
                                <h3>New Followers</h3>
                                <p class="number" id="newFollowers">-</p>
                            </div>
                        </div>
                    </div>

                    <div class="content-split">
                        <div class="panel">
                            <div class="panel-header">
                                <h3><i data-lucide="inbox"></i> Recent Messages</h3>
                                <button class="btn-icon" onClick={() => (window as any).refreshMessages()}><i data-lucide="refresh-cw"></i></button>
                            </div>
                            <div class="list-container" id="messagesList">
                                <div class="empty-state">
                                    <p>Loading messages...</p>
                                </div>
                            </div>
                        </div>

                        <div class="panel">
                            <div class="panel-header">
                                <h3><i data-lucide="message-square"></i> Recent Comments</h3>
                                <button class="btn-icon" onClick={() => (window as any).refreshComments()}><i data-lucide="refresh-cw"></i></button>
                            </div>
                            <div class="list-container" id="commentsList">
                                <div class="empty-state">
                                    <p>Loading comments...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Conversation View */}
                <section id="conversationView" class="view hidden">
                    <div class="chat-layout">
                        <div class="chat-header">
                            <button class="btn btn-secondary" id="backToDashBtn">
                                <i data-lucide="arrow-left"></i> Back
                            </button>
                            <h3 id="chatTitle">Conversation</h3>
                        </div>
                        <div class="chat-messages" id="chatMessages">
                            {/* Messages go here */}
                            <div class="empty-state">Select a conversation to view messages</div>
                        </div>
                        <div class="chat-input-area">
                            <input type="text" id="replyInput" placeholder="Type a reply..." />
                            <button class="btn btn-primary" id="sendReplyBtn">
                                <i data-lucide="send"></i> Send
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <div id="toast" class="toast hidden"></div>
        </div>
    );
}
