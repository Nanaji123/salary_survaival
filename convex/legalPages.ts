/**
 * Public legal pages served by convex/http.ts. The store listings link to them:
 *   <deployment>.convex.site/privacy         (App Store and Play privacy policy URL)
 *   <deployment>.convex.site/delete-account  (Play account deletion URL)
 */

const STYLE = `
  :root { --bg: #F7F4EC; --text: #17140F; --muted: #6B655A; --line: #E7E1D3; --accent: #177A3E; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0E0D0A; --text: #F4F1EA; --muted: #A39D90; --line: #2E2A22; --accent: #C6F45A; }
  }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 -apple-system, BlinkMacSystemFont, "SF Pro Rounded", system-ui, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 20px 80px; }
  h1 { font-size: 32px; line-height: 1.2; margin: 0 0 4px; }
  h2 { font-size: 20px; margin: 36px 0 8px; padding-top: 20px; border-top: 1px solid var(--line); }
  p, li { color: var(--text); }
  .muted { color: var(--muted); }
  a { color: var(--accent); }
  ul, ol { padding-left: 20px; }
`;

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Salary Survival · ${title}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

export const privacyPolicyPage = page(
  'Privacy Policy',
  `<h1>Privacy Policy</h1>
<p class="muted">Salary Survival · Effective October 4, 2026</p>

<p>Salary Survival helps you make each salary last until payday. This policy explains what the app collects, why, who it is shared with and how to delete it. We do not show ads, we do not sell your data and we do not track you across other apps or websites.</p>

<h2>Information the app collects</h2>
<ul>
  <li><strong>What you enter.</strong> Your name (optional), currency, payday, salary amounts, expenses (title, amount, category, date, payment method and an optional note), budgets and your savings goal.</li>
  <li><strong>App progress.</strong> XP, levels, streaks, trophies and how many free features you used today.</li>
  <li><strong>A device identifier.</strong> The app creates your account from your device's app identifier (identifierForVendor on iOS, Android ID on Android), so you don't need an email or password. It is used only to connect this device to your data.</li>
  <li><strong>Voice, only when you use it.</strong> When you hold the microphone button, your speech is turned into text so it can be logged. Recordings are not stored.</li>
  <li><strong>Subscription status.</strong> If you subscribe, whether your subscription is active.</li>
</ul>

<h2>How it is used</h2>
<p>Only to run the app: to save and sync your salaries, expenses and budgets, calculate your daily limit, insights and progress, apply the free plan's daily limits, and unlock Pro for subscribers.</p>

<h2>AI features</h2>
<p>The voice assistant, AI summary and AI salary plan use OpenAI. Before the first time any of them sends data, the app asks for your permission, and each summary or plan shows exactly what it will read before you confirm.</p>
<ul>
  <li>The assistant sends the words you say or type.</li>
  <li>The AI summary sends your totals per category and your five biggest expenses (name and amount) for the current salary.</li>
  <li>The AI salary plan sends your salary and your spending totals per category.</li>
</ul>
<p>Expense notes are never sent. Under OpenAI's API terms this data is not used to train their models. You can use the whole app without AI by choosing "Not now".</p>

<h2>Speech recognition</h2>
<p>To show your words as you speak, the app uses your phone's built-in speech recognition: Apple's on iOS and Google's on Android. Depending on your device and settings, Apple or Google may process the audio on their servers under their own privacy policies. If built-in recognition is unavailable, the recording is sent to OpenAI to be transcribed and is not kept.</p>

<h2>Reminders</h2>
<p>If you turn on reminders, they are scheduled on your phone by the operating system. No reminder data is sent to us or anyone else, and you can turn them off in the app or in your phone's Settings.</p>

<h2>Service providers</h2>
<ul>
  <li><strong>Convex</strong> hosts the app's database, where your account and entries are stored.</li>
  <li><strong>OpenAI</strong> powers the AI features described above, only with your permission.</li>
  <li><strong>Apple and Google</strong> provide speech recognition and process subscription payments. We never see your payment details.</li>
  <li><strong>RevenueCat</strong> keeps track of whether your subscription is active, using your app account identifier.</li>
</ul>
<p>We don't share your data with anyone else, and we don't use advertising or analytics SDKs.</p>

<h2>Keeping and deleting your data</h2>
<p>Your data is kept while your account exists. To delete everything, open <strong>Settings → Erase all data</strong> in the app, or see <a href="/delete-account">how to delete your account</a>. Your account, salaries, expenses, budgets and progress are permanently deleted from our database straight away. Logging out keeps your data so you can sign back in on the same device.</p>

<h2>Security</h2>
<p>Data travels over encrypted connections (HTTPS) and is stored with our database provider. No system is perfectly secure, but we only collect what the app needs.</p>

<h2>Children</h2>
<p>Salary Survival is not directed at children under 13, and we do not knowingly collect their data.</p>

<h2>Your rights</h2>
<p>You can see and edit your data in the app at any time and delete it with Erase all data. Depending on where you live (for example under the GDPR or CCPA), you may have further rights, such as asking for a copy of your data. Contact us and we will help.</p>

<h2>Changes</h2>
<p>If this policy changes, we will update this page and its effective date. Significant changes will also be noted in the app.</p>

<h2>Contact</h2>
<p>Questions about privacy: <a href="mailto:gundapunanaji123@gmail.com">gundapunanaji123@gmail.com</a></p>`,
);

export const deleteAccountPage = page(
  'Delete Your Account',
  `<h1>Delete your account</h1>
<p class="muted">Salary Survival · Updated October 5, 2026</p>

<p>Salary Survival creates your account from your device, with no email or password. You can delete your account and all of its data at any time. Uninstalling the app does not delete your account, so please use one of the options below.</p>

<h2>Delete it in the app</h2>
<ol>
  <li>Open Salary Survival.</li>
  <li>Go to the <strong>Settings</strong> tab.</li>
  <li>Tap <strong>Erase all data</strong>, then tap <strong>Erase</strong> to confirm.</li>
</ol>
<p>Your account and everything in it are permanently deleted from our database straight away. This cannot be undone.</p>

<h2>Can't open the app?</h2>
<p>Email <a href="mailto:gundapunanaji123@gmail.com?subject=Delete%20my%20Salary%20Survival%20data">gundapunanaji123@gmail.com</a> with the subject "Delete my Salary Survival data". Because the app has no email login, tell us the currency and payday you set and roughly when you started using the app, so we can find your account. We will delete it within 30 days and reply to confirm.</p>

<h2>What is deleted</h2>
<ul>
  <li>Your account: device identifier, name, currency, payday and savings goal.</li>
  <li>All salaries, expenses, budgets and notes.</li>
  <li>Your progress: XP, levels, streaks and trophies, plus your daily usage counts.</li>
</ul>

<h2>What is kept</h2>
<ul>
  <li>Nothing stays in our database.</li>
  <li>If you subscribed, Apple or Google and our subscription provider RevenueCat keep the purchase record, linked to an anonymous app ID, as needed for billing and refunds.</li>
  <li>Deleting your data does not cancel a subscription. Cancel it in your App Store or Google Play subscription settings.</li>
  <li>Data stored on your phone, such as scheduled reminders, is removed when you uninstall the app.</li>
</ul>

<p class="muted">See the full <a href="/privacy">privacy policy</a>.</p>`,
);
