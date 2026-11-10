import { auth, database } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

const THEME_KEY = "maimai-rating-theme";
const CLOUDINARY_CLOUD_NAME = "b6nyrts0";
const CLOUDINARY_UPLOAD_PRESET = "maimaiLarp";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_SCORES = 50;
const state = { user: null, profile: null, scores: [], unsubscribe: null };
const $ = (selector) => document.querySelector(selector);
const scoreDialog = $("#scoreDialog");
const forgotPasswordDialog = $("#forgotPasswordDialog");
const profileDialog = $("#profileDialog");

function userRef(path = "") {
  return ref(database, `users/${state.user.uid}${path ? `/${path}` : ""}`);
}

function setAuthMessage(message = "") {
  $("#authMessage").textContent = message;
}

function firebaseMessage(error) {
  const messages = {
    "auth/invalid-credential": "That email or password is incorrect.",
    "auth/email-already-in-use": "That email already has an account. Try signing in.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/user-not-found": "No account was found with that email.",
  };
  return messages[error.code] || "Firebase could not complete that request. Try again.";
}

function render() {
  const loggedIn = Boolean(state.user && state.profile);
  $("#authView").classList.toggle("is-hidden", loggedIn);
  $("#dashboardView").classList.toggle("is-hidden", !loggedIn);
  if (!loggedIn) return;
  const profile = state.profile;
  $("#playerName").textContent = profile.name;
  $("#avatarButton").innerHTML = profile.avatarUrl
    ? `<img class="avatar-image" src="${escapeHtml(profile.avatarUrl)}" alt="" />`
    : "";
  $("#scoreCount").textContent = state.scores.length;
  $("#totalRating").textContent = state.scores.reduce((total, score) => total + Number(score.ratingScore), 0).toFixed(2);
  const sortedScores = [...state.scores].sort((a, b) => Number(b.ratingScore) - Number(a.ratingScore));
  $("#scoresList").innerHTML = sortedScores.length
    ? sortedScores.map(scoreTemplate).join("")
    : `<div class="empty-state"><p class="eyebrow">you have no scores!</p><p>add your first score to start building your profile.</p></div>`;
}

function scoreTemplate(score) {
  return `<article class="score-row"><div><p class="song-name">${escapeHtml(score.songName)}</p><p class="song-meta">${score.difficulty} · level ${score.level} · ${score.accuracy}%</p></div><div class="rank">${escapeHtml(score.rank)}</div><div class="score-value"><strong>${Number(score.ratingScore).toFixed(2)}</strong><small>rating score</small></div><button class="delete-score-button" type="button" data-score-id="${escapeHtml(score.id)}" aria-label="Delete ${escapeHtml(score.songName)} score" title="Delete score">×</button></article>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

async function loadUserData(user) {
  state.user = user;
  const snapshot = await get(userRef());
  const data = snapshot.val() || {};
  state.profile = data.profile || { name: "Player", avatarUrl: "" };
  state.scores = data.scores ? Object.entries(data.scores).map(([id, score]) => ({ id, ...score })) : [];
  if (!data.profile) await set(userRef("profile"), state.profile);
  await enforceScoreLimit();
  state.unsubscribe = onValue(userRef(), (current) => {
    const value = current.val() || {};
    state.profile = value.profile || state.profile;
    state.scores = value.scores ? Object.entries(value.scores).map(([id, score]) => ({ id, ...score })) : [];
    render();
    if (state.scores.length > MAX_SCORES) {
      enforceScoreLimit().catch((error) => setAuthMessage(`Could not enforce score limit: ${error.message}`));
    }
  }, (error) => setAuthMessage(`Sync failed: ${error.message}`));
  render();
}

async function enforceScoreLimit() {
  if (state.scores.length <= MAX_SCORES) return;
  const scoresToRemove = [...state.scores]
    .sort((a, b) => (Number(a.ratingScore) || 0) - (Number(b.ratingScore) || 0))
    .slice(0, state.scores.length - MAX_SCORES);
  await Promise.all(scoresToRemove.map((score) => remove(userRef(`scores/${score.id}`))));
}

for (let level = 1; level <= 15; level += 1) {
  $("#level").insertAdjacentHTML("beforeend", `<option>${level}</option>`);
  if (level >= 7) $("#level").insertAdjacentHTML("beforeend", `<option>${level}+</option>`);
}

$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("connecting...");
  const email = $("#email").value.trim();
  const password = $("#password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (!["auth/user-not-found", "auth/invalid-credential"].includes(error.code)) {
      setAuthMessage(firebaseMessage(error));
      return;
    }
    setAuthMessage("hold on...");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (createError) {
      setAuthMessage(createError.code === "auth/email-already-in-use"
        ? "email or password is incorrect."
        : firebaseMessage(createError));
    }
  }
});

$("#forgotPasswordButton").addEventListener("click", () => {
  $("#resetEmail").value = $("#email").value.trim();
  $("#resetMessage").textContent = "";
  forgotPasswordDialog.showModal();
});

$("#forgotPasswordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#resetMessage").textContent = "Sending reset link...";
  try {
    await sendPasswordResetEmail(auth, $("#resetEmail").value.trim());
    $("#resetMessage").textContent = "Reset link sent. Check your inbox.";
  } catch (error) {
    $("#resetMessage").textContent = firebaseMessage(error);
  }
});

$("#logoutButton").addEventListener("click", () => signOut(auth).catch((error) => setAuthMessage(firebaseMessage(error))));
$("#addScoreButton").addEventListener("click", () => { $("#scoreForm").reset(); scoreDialog.showModal(); });
$("#scoreForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const score = { songName: $("#songName").value.trim(), difficulty: $("#difficulty").value, level: $("#level").value, rank: $("#rank").value, accuracy: $("#accuracy").value, ratingScore: $("#ratingScore").value };
  try {
    await set(push(userRef("scores")), score);
    await enforceScoreLimit();
    scoreDialog.close();
  } catch (error) { alert(`Could not save score: ${error.message}`); }
});
$("#scoresList").addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-score-id]");
  if (!deleteButton) return;
  const score = state.scores.find(({ id }) => id === deleteButton.dataset.scoreId);
  if (!score || !confirm(`Delete your ${score.songName} score?`)) return;
  try {
    await remove(userRef(`scores/${score.id}`));
  } catch (error) {
    alert(`Could not delete score: ${error.message}`);
  }
});

$("#editProfileButton").addEventListener("click", () => {
  $("#profileName").value = state.profile.name;
  $("#avatarFile").value = "";
  $("#uploadMessage").textContent = "";
  profileDialog.showModal();
});
$("#avatarButton").addEventListener("click", () => $("#editProfileButton").click());
$("#avatarFile").addEventListener("change", async () => {
  const file = $("#avatarFile").files[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_AVATAR_SIZE) {
    $("#uploadMessage").textContent = "Choose a JPG, PNG, or WebP image up to 2 MB.";
    $("#avatarFile").value = "";
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  $("#uploadMessage").textContent = "Uploading image...";
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`Cloudinary upload failed (${response.status}).`);
    const result = await response.json();
    if (!result.secure_url) throw new Error("Cloudinary did not return an image URL.");
    state.profile.pendingAvatarUrl = result.secure_url;
    $("#uploadMessage").textContent = "Image uploaded. Save profile to apply it.";
  } catch (error) { $("#uploadMessage").textContent = error.message; $("#avatarFile").value = ""; }
});
$("#profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const profile = {
    name: $("#profileName").value.trim(),
    avatarUrl: state.profile.pendingAvatarUrl || state.profile.avatarUrl || "",
  };
  delete state.profile.pendingAvatarUrl;
  try { await set(userRef("profile"), profile); profileDialog.close(); } catch (error) { $("#uploadMessage").textContent = `Could not save profile: ${error.message}`; }
});
$("#deleteAccountButton").addEventListener("click", async () => {
  if (!confirm("Delete your account and all synced scores? This cannot be undone.")) return;
  try { await remove(userRef()); await deleteUser(state.user); } catch (error) { $("#uploadMessage").textContent = firebaseMessage(error); }
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => {
  scoreDialog.close();
  forgotPasswordDialog.close();
  profileDialog.close();
}));
$("#themeToggle").addEventListener("click", () => { document.body.classList.toggle("light"); localStorage.setItem(THEME_KEY, document.body.classList.contains("light") ? "light" : "dark"); });
if (localStorage.getItem(THEME_KEY) === "light") document.body.classList.add("light");
onAuthStateChanged(auth, (user) => {
  if (state.unsubscribe) state.unsubscribe();
  state.user = user;
  state.profile = null;
  state.scores = [];
  if (user) loadUserData(user).catch((error) => setAuthMessage(`Could not load your data: ${error.message}`));
  else {
    setAuthMessage();
    render();
  }
});
