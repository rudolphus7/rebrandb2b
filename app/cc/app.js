
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

const loginBtn = document.getElementById('loginBtn');
const initBtn = document.getElementById('initBtn');
const appIdInput = document.getElementById('appIdInput');
const userStatus = document.getElementById('userStatus');
const backToDashBtn = document.getElementById('backToDashBtn');
const sendReplyBtn = document.getElementById('sendReplyBtn');
const replyInput = document.getElementById('replyInput');

// Initialize
function init() {
    if (FB_APP_ID) {
        const card = document.querySelector('.glass-card');
        if (card) card.style.display = 'none';
        showToast('Auto-connecting...');
        loadFacebookSDK();
    }
}

// Event Listeners
if (initBtn) {
    initBtn.addEventListener('click', () => {
        const appId = appIdInput.value.trim();
        if (appId && /^\d+$/.test(appId)) {
            FB_APP_ID = appId;
            localStorage.setItem('fb_app_id', appId);
            loadFacebookSDK();
            showToast('Initializing SDK...');
            document.querySelector('.glass-card').style.display = 'none';
        } else {
            showToast('Invalid App ID. Use numbers only.');
        }
    });
}

if (loginBtn) loginBtn.addEventListener('click', login);

if (backToDashBtn) {
    backToDashBtn.addEventListener('click', () => {
        views.conversation.classList.add('hidden');
        views.dashboard.classList.remove('hidden');
        activeConversationId = null;
        activeReceiverId = null;
    });
}

if (sendReplyBtn) sendReplyBtn.addEventListener('click', sendMessage);
if (replyInput) {
    replyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// Methods
function loadFacebookSDK() {
    if (window.FB) {
        try {
            FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            checkLoginState();
        } catch (e) {
            console.error(e);
            showToast('SDK Error (re-init): ' + e.message);
            document.querySelector('.glass-card').style.display = 'flex';
        }
        return;
    }

    window.fbAsyncInit = function () {
        FB.init({
            appId: FB_APP_ID,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
        });

        FB.AppEvents.logPageView();
        checkLoginState();
    };

    (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) { return; }
        js = d.createElement(s); js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
}

function checkLoginState() {
    FB.getLoginStatus(function (response) {
        statusChangeCallback(response);
    });
}

function statusChangeCallback(response) {
    if (response.status === 'connected') {
        currentAccessToken = response.authResponse.accessToken;
        showDashboard(currentAccessToken);
    } else {
        showLogin();
    }
}

function login() {
    const perms = 'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_read_user_content,pages_manage_posts,pages_messaging';

    if (!window.FB) {
        showToast('SDK not ready. Reload page?');
        return;
    }

    FB.login(function (response) {
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
        const card = document.querySelector('.glass-card');
        if (card) card.style.display = 'flex';
    }

    loginBtn.innerHTML = '<i data-lucide="facebook"></i> Login with Facebook';
    loginBtn.onclick = login;
    lucide.createIcons();
}

function showDashboard(userAccessToken) {
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
    lucide.createIcons();
}

function logout() {
    FB.logout(function (response) {
        showLogin();
    });
}

async function fetchPageData(userToken) {
    showToast('Fetching page data...');

    FB.api('/me/accounts', function (response) {
        if (response && !response.error) {
            const page = response.data.find(p => p.id === PAGE_ID);
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

function loadPageStats(token) {
    FB.api(`/${PAGE_ID}?fields=new_like_count,talking_about_count,fan_count`, { access_token: token }, function (response) {
        if (response && !response.error) {
            document.getElementById('newFollowers').innerText = response.fan_count || 0;
        }
    });
}

function loadMessages(token) {
    // Requires pages_messaging permission
    // Request participants to correctly identify the user even if Page updated last
    FB.api(`/${PAGE_ID}/conversations?fields=id,updated_time,participants,messages.limit(1){message,from}`, { access_token: token }, function (response) {
        const container = document.getElementById('messagesList');
        container.innerHTML = '';

        if (response && !response.data) {
            container.innerHTML = '<div class="empty-state">No messages found.</div>';
            return;
        }

        if (response.data.length > 0) {
            response.data.forEach(conv => {
                // Find the participant that is not the current Page
                const participant = conv.participants && conv.participants.data ?
                    conv.participants.data.find(p => p.id !== PAGE_ID) : null;

                if (!participant) return;

                const senderName = participant.name;
                const senderId = participant.id;

                const lastMsgObj = conv.messages && conv.messages.data[0] ? conv.messages.data[0] : null;
                const lastMsg = lastMsgObj ? lastMsgObj.message : 'Attachment/Media';

                // Avatar
                const picUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;

                const card = document.createElement('div');
                card.className = 'message-card';
                // Pass senderId for sending replies
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

function openConversation(convId, name, picUrl, senderId) {
    activeConversationId = convId;
    activeReceiverId = senderId;

    views.dashboard.classList.add('hidden');
    views.conversation.classList.remove('hidden');

    // Update Chat Header
    const title = document.getElementById('chatTitle');
    title.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <img src="${picUrl || 'https://ui-avatars.com/api/?name=User'}" class="avatar">
            <div class="user-info">
                <span>${name || 'Conversation'}</span>
                <span class="status">Active Now</span>
            </div>
        </div>
    `;

    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div class="empty-state">Loading conversation...</div>';

    FB.api(`/${convId}/messages?fields=message,from,created_time,attachments,id`, { access_token: pageAccessToken }, function (response) {
        container.innerHTML = '';
        if (response && response.data) {
            const msgs = response.data.slice().reverse();
            msgs.forEach(msg => {
                const isMe = msg.from.id === PAGE_ID;
                const bubble = document.createElement('div');
                bubble.className = `message-bubble ${isMe ? 'me' : 'them'}`;

                bubble.innerHTML = `
                    ${msg.message ? msg.message : '<i>Attachment/Media</i>'}
                    <span class="message-time">${new Date(msg.created_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                `;
                container.appendChild(bubble);
            });
            container.scrollTop = container.scrollHeight;
        } else {
            container.innerHTML = '<div class="empty-state">Failed to load messages.</div>';
        }
    });
}

function sendMessage() {
    const text = replyInput.value.trim();
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
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble me pending';
    bubble.style.opacity = '0.7';
    bubble.innerHTML = `
        ${text}
        <span class="message-time">Sending...</span>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;

    replyInput.value = '';

    FB.api('/me/messages', 'POST', payload, function (response) {
        if (response && !response.error) {
            bubble.style.opacity = '1';
            bubble.querySelector('.message-time').innerText = 'Just now';
            showToast('Message sent');
        } else {
            console.error("Send Error:", response);
            bubble.style.border = '1px solid red';
            bubble.querySelector('.message-time').innerText = 'Failed';

            // Try fallback to conversation endpoint if recipient ID fails (sometimes page-scoped IDs vary)
            if (response.error && (response.error.code === 100 || response.error.code === 230)) {
                // Fallback: Post to conversation directly (deprecated but sometimes works for replies)
                // Or we might need to use the conversation ID if PSID is wrong
                showToast('ID Error. Trying fallback...');
                FB.api(`/${activeConversationId}/messages`, 'POST', { message: text, access_token: pageAccessToken }, function (retryResp) {
                    if (retryResp && !retryResp.error) {
                        bubble.style.border = 'none';
                        bubble.querySelector('.message-time').innerText = 'Sent (Fallback)';
                    } else {
                        // Still failed
                        showToast(retryResp.error ? retryResp.error.message : 'Fallback failed');
                    }
                });
            } else {
                showToast('Failed: ' + (response.error ? response.error.message : 'Unknown'));
            }
        }
    });
}

function loadComments(token) {
    FB.api(`/${PAGE_ID}/feed`, { access_token: token, fields: 'message,comments.limit(5){message,from{name,picture,id}}' }, function (response) {
        const container = document.getElementById('commentsList');
        container.innerHTML = '';

        if (response && !response.error && response.data.length > 0) {
            response.data.forEach(post => {
                if (post.comments && post.comments.data) {
                    post.comments.data.forEach(comment => {
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

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

window.refreshMessages = () => { if (pageAccessToken) loadMessages(pageAccessToken); };
window.refreshComments = () => { if (pageAccessToken) loadComments(pageAccessToken); };

init();
