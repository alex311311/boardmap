const source = window.supabaseBoardmapDataSource;
const notice = document.querySelector("#configNotice");
const form = document.querySelector("#authForm");
const displayName = document.querySelector("#displayName");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const signUpButton = document.querySelector("#signUpButton");
const signOutButton = document.querySelector("#signOutButton");
const message = document.querySelector("#authMessage");

async function renderSession() {
  if (!source?.configured) {
    notice.innerHTML = "<strong>Supabase configuration required</strong><p><code>supabase-config.js</code>에 Project URL과 Publishable key를 입력하세요.</p>";
    form.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
    return;
  }
  notice.innerHTML = "<strong>Supabase connected</strong><p>인증과 데이터 권한은 서버의 RLS 정책으로 검사됩니다.</p>";
  const session = await source.getSession();
  const signedIn = Boolean(session);
  email.value = session?.user?.email || "";
  email.disabled = signedIn;
  password.hidden = signedIn;
  displayName.hidden = signedIn;
  form.querySelector('button[type="submit"]').hidden = signedIn;
  signUpButton.hidden = signedIn;
  signOutButton.hidden = !signedIn;
  message.textContent = signedIn ? `Signed in as ${session.user.email}` : "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await source.signIn(email.value.trim(), password.value); await renderSession(); }
  catch (error) { message.textContent = error.message; }
});

signUpButton.addEventListener("click", async () => {
  if (!form.reportValidity()) return;
  try {
    const result = await source.signUp(email.value.trim(), password.value, displayName.value.trim());
    message.textContent = result.session ? "Account created and signed in." : "확인 이메일을 열어 가입을 완료하세요.";
    await renderSession();
  } catch (error) { message.textContent = error.message; }
});

signOutButton.addEventListener("click", async () => { await source.signOut(); await renderSession(); });
renderSession().catch((error) => { message.textContent = error.message; });
