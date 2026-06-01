/* Supabase client + auth helpers
 * Используется новыми кабинетами на magic-link Auth.
 * Старая PIN-механика (cabinet.js + NGECabinet) продолжает работать параллельно.
 */
(function () {
  "use strict";

  // Публичные параметры — anon key безопасен для browser-side.
  // RLS защищает все данные.
  var SUPABASE_URL = "https://iqzlphbvmfgoygnozbya.supabase.co";
  var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";

  // Lazy-load Supabase JS SDK from CDN (single script, ~70 KB gzip)
  var loadPromise = null;
  function loadSDK() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if (loadPromise) return loadPromise;
    loadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
      s.async = true;
      s.onload = function () { resolve(window.supabase); };
      s.onerror = function () { reject(new Error("Не удалось загрузить supabase-js с CDN")); };
      document.head.appendChild(s);
    });
    return loadPromise;
  }

  // -------- High-level helpers --------
  var clientPromise = null;
  function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = loadSDK().then(function (sb) {
      return sb.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storageKey: "nge-supabase-auth",
        },
      });
    });
    return clientPromise;
  }

  async function getSession() {
    var c = await getClient();
    var res = await c.auth.getSession();
    return res.data ? res.data.session : null;
  }

  async function getUser() {
    var c = await getClient();
    var res = await c.auth.getUser();
    return res.data ? res.data.user : null;
  }

  async function getProfile() {
    var c = await getClient();
    var user = await getUser();
    if (!user) return null;
    var res = await c.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return res.data || null;
  }

  async function sendMagicLink(email, redirectTo) {
    var c = await getClient();
    return await c.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
  }

  async function signOut() {
    var c = await getClient();
    return await c.auth.signOut();
  }

  // Redirect helper — куда отправлять пользователя по роли
  function urlFor(role) {
    if (role === "teacher") return "./teacher.html";
    if (role === "parent")  return "./parent.html";
    if (role === "student") return "./student.html";
    return "./me.html";
  }

  // Public API
  window.NGESupa = {
    getClient: getClient,
    getSession: getSession,
    getUser: getUser,
    getProfile: getProfile,
    sendMagicLink: sendMagicLink,
    signOut: signOut,
    urlFor: urlFor,
    SUPABASE_URL: SUPABASE_URL,
  };
})();
