/*
  ===========================================================
  Logic Systems - Support Chat Widget (ملف عام موحّد)
  ===========================================================
  ازاي تستخدمه في أي سيستيم عميل (مش محتاج تعدّل جوه الملف ده خالص):

  1) ارفع الملف ده زي ما هو على استضافة السيستيم بتاع العميل
     (أو استضفه مرة واحدة على مكان ثابت زي GitHub Pages، وخلي كل
     عملائك يحطوا نفس الرابط - عشان أي تحديث تعمله يوصلهم كلهم أوتوماتيك).

  2) في صفحة الـ HTML بتاعة العميل، قبل ما تقفل </body> مباشرة، ضيف:

     <script>
       window.SUPPORT_CHAT_CONFIG = {
         chatId: "الكود السري الفريد بتاع العميل ده",
         clientName: "اسم العميل اللي هيظهرلك في لوحة الأدمن"
       };
     </script>
     <script src="support-chat-widget.js"></script>

  3) كل عميل لازم يكون ليه chatId مختلف وطويل وعشوائي (زي كود سري) -
     عشان محدش يقدر يخمنه ويدخل يشوف شات عميل تاني. تقدر تولّد
     واحد لكل عميل من موقع زي: https://www.uuidgenerator.net
     أو أي مولد نصوص عشوائية.

  ملحوظة: الملف ده بيشتغل مع أي سيستيم حتى لو مش شغال بـ Firebase
  أصلاً - بيجيب مكتبة Firebase بنفسه لو مش موجودة.
  ===========================================================
*/

(function () {
  // ---------- إعدادات مشروع الدعم الفني (ثابتة - بتاعتك إنت كأدمن) ----------
  const SUPPORT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDYJ0_D9KT27_7NNxluz44-s2zGOVugjjQ",
    authDomain: "body-system-dadaf.firebaseapp.com",
    projectId: "body-system-dadaf",
  };
  const SUPPORT_APP_NAME = "logicSupportChatApp";
  const FIREBASE_SDK_VERSION = "10.13.0";

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureFirebaseLoaded() {
    if (window.firebase && window.firebase.firestore) return;
    const base = "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/";
    await loadScript(base + "firebase-app-compat.js");
    await loadScript(base + "firebase-firestore-compat.js");
    await loadScript(base + "firebase-auth-compat.js");
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #lgcSupChatToggleBtn {
        position: fixed; bottom: 22px; left: 22px; z-index: 999998;
        width: 58px; height: 58px; border-radius: 50%; border: none;
        background: #1d4ed8; color: #fff; font-size: 24px; cursor: pointer;
        box-shadow: 0 4px 14px rgba(0,0,0,0.3); font-family: sans-serif;
      }
      #lgcSupChatUnreadDot {
        display: none; position: fixed; bottom: 62px; left: 62px; z-index: 999999;
        width: 13px; height: 13px; border-radius: 50%; background: #ef4444;
        border: 2px solid #fff;
      }
      #lgcSupChatPanel {
        display: none; flex-direction: column; position: fixed;
        bottom: 90px; left: 22px; z-index: 999998;
        width: 320px; max-width: 90vw; height: 440px;
        background: #fff; border-radius: 12px;
        box-shadow: 0 10px 34px rgba(0,0,0,0.35); overflow: hidden;
        font-family: -apple-system, "Segoe UI", Tahoma, sans-serif;
        direction: rtl;
      }
      #lgcSupChatHeader { background: #1d4ed8; color: #fff; padding: 12px 16px; font-weight: bold; font-size: 15px; }
      #lgcSupChatMessages { flex: 1; overflow-y: auto; padding: 12px; background: #f4f6f9; display: flex; flex-direction: column; }
      .lgcSupChat-bubble { max-width: 78%; margin: 5px 0; padding: 8px 12px; border-radius: 10px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
      .lgcSupChat-bubble.me { margin-right: auto; background: #1d4ed8; color: #fff; border-bottom-left-radius: 3px; }
      .lgcSupChat-bubble.support { margin-left: auto; background: #e5e7eb; color: #111827; border-bottom-right-radius: 3px; }
      #lgcSupChatInputRow { display: flex; border-top: 1px solid #e5e7eb; }
      #lgcSupChatInput { flex: 1; border: none; padding: 11px; outline: none; font-size: 14px; font-family: inherit; }
      #lgcSupChatSendBtn { background: #1d4ed8; color: #fff; border: none; padding: 0 18px; cursor: pointer; font-weight: bold; }
    `;
    document.head.appendChild(style);
  }

  function injectMarkup() {
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "lgcSupChatToggleBtn";
    toggleBtn.title = "الدعم الفني";
    toggleBtn.textContent = "💬";
    document.body.appendChild(toggleBtn);

    const dot = document.createElement("span");
    dot.id = "lgcSupChatUnreadDot";
    document.body.appendChild(dot);

    const panel = document.createElement("div");
    panel.id = "lgcSupChatPanel";
    panel.innerHTML = `
      <div id="lgcSupChatHeader">الدعم الفني</div>
      <div id="lgcSupChatMessages"></div>
      <div id="lgcSupChatInputRow">
        <input type="text" id="lgcSupChatInput" placeholder="اكتب رسالتك...">
        <button id="lgcSupChatSendBtn">إرسال</button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  async function init() {
    const config = window.SUPPORT_CHAT_CONFIG;
    if (!config || !config.chatId) {
      console.warn("Support Chat: لازم تحدد window.SUPPORT_CHAT_CONFIG.chatId قبل تحميل الملف ده.");
      return;
    }
    const chatId = config.chatId;
    const clientName = config.clientName || "عميل بدون اسم";

    await ensureFirebaseLoaded();
    injectStyles();
    injectMarkup();

    let supportApp;
    try {
      supportApp = firebase.app(SUPPORT_APP_NAME);
    } catch (e) {
      supportApp = firebase.initializeApp(SUPPORT_FIREBASE_CONFIG, SUPPORT_APP_NAME);
    }
    const supportDb = supportApp.firestore();
    const authReady = supportApp.auth().signInAnonymously().catch(function (err) {
      console.error("Support Chat: فشل تسجيل الدخول المجهول:", err);
    });

    const chatRef = supportDb.collection("supportChats").doc(chatId);
    let unsubscribe = null;
    let chatDocReady = false;

    function ensureChatDoc() {
      if (chatDocReady) return;
      chatDocReady = true;
      chatRef.set({ clientId: chatId, clientName: clientName }, { merge: true })
        .catch(function (err) { console.error(err); });
    }

    function renderBubble(msg) {
      const wrap = document.getElementById("lgcSupChatMessages");
      const bubble = document.createElement("div");
      bubble.className = "lgcSupChat-bubble " + (msg.senderType === "client" ? "me" : "support");
      bubble.textContent = msg.text || "";
      wrap.appendChild(bubble);
    }

    function listenMessages() {
      const q = chatRef.collection("messages").orderBy("createdAt", "asc");
      unsubscribe = q.onSnapshot(function (snapshot) {
        const wrap = document.getElementById("lgcSupChatMessages");
        wrap.innerHTML = "";
        let lastFromSupport = false;
        snapshot.forEach(function (doc) {
          const msg = doc.data();
          renderBubble(msg);
          if (msg.senderType === "admin") lastFromSupport = true;
        });
        wrap.scrollTop = wrap.scrollHeight;
        const panelOpen = document.getElementById("lgcSupChatPanel").style.display === "flex";
        if (lastFromSupport && !panelOpen) {
          document.getElementById("lgcSupChatUnreadDot").style.display = "block";
        }
      }, function (err) { console.error(err); });
    }

    function sendMessage() {
      const input = document.getElementById("lgcSupChatInput");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";

      const doWrite = function () {
        chatRef.collection("messages").add({
          text: text,
          senderType: "client",
          senderName: clientName,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
          chatRef.set({
            lastMessage: text,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSenderType: "client",
            unreadByAdmin: true,
            unreadByClient: false
          }, { merge: true });
        }).catch(function (err) { console.error(err); });
      };
      authReady.then(doWrite).catch(doWrite);
    }

    document.getElementById("lgcSupChatToggleBtn").addEventListener("click", function () {
      const panel = document.getElementById("lgcSupChatPanel");
      const isOpen = panel.style.display === "flex";
      panel.style.display = isOpen ? "none" : "flex";
      document.getElementById("lgcSupChatUnreadDot").style.display = "none";
      if (!isOpen && !unsubscribe) {
        ensureChatDoc();
        listenMessages();
      }
    });
    document.getElementById("lgcSupChatSendBtn").addEventListener("click", sendMessage);
    document.getElementById("lgcSupChatInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendMessage();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
