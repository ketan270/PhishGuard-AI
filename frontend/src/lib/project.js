export const TEAM = [
  { name: 'Mahika Behal', roll: '231091890' },
  { name: 'Ketan Sharma', roll: '2310992120' },
  { name: 'Ghanshyam Agrawal', roll: '2310990167' },
  { name: 'Aviral Kaushik', roll: '2310990223' },
]
export const SUPERVISOR = { name: 'Lalit Sharma', role: 'Project Supervisor' }

export const PIPELINE = [
  { title: 'User Input', desc: 'A URL or suspicious email is submitted through the web app and sent to the API.', tag: 'React → FastAPI' },
  { title: 'Input Validation', desc: 'Structure, protocol, hostname and length are checked; malformed input is rejected with a clear message.', tag: 'validators' },
  { title: 'Preprocessing', desc: 'URLs are normalised and split into scheme, subdomain, domain, TLD, path and query. Email text is cleaned and tokenised.', tag: 'normalise' },
  { title: 'Feature Extraction', desc: '34 lexical & structural URL features, plus TF-IDF n-grams and linguistic cues for emails.', tag: '34 features' },
  { title: 'ML Classification', desc: 'Gradient Boosting and a char n-gram model vote on URLs; a linear SVM classifies email text.', tag: 'scikit-learn' },
  { title: 'Risk Assessment', desc: 'Calibrated probability becomes a 0-100 risk score and Low / Medium / High level, adjusted by a reputation layer.', tag: 'risk engine' },
  { title: 'Explainable Result', desc: 'Occlusion analysis shows which features or words pushed the model towards phishing or safe.', tag: 'XAI' },
  { title: 'Recommendation', desc: 'Actionable next steps tailored to the risk level and input type.', tag: 'guidance' },
  { title: 'Storage & Reports', desc: 'Every analysis is saved to MongoDB for history, dashboards and downloadable PDF reports.', tag: 'MongoDB' },
]

export const URL_SAMPLES = [
  { label: 'google.com', value: 'https://www.google.com', bad: false },
  { label: 'paypa1 login', value: 'http://paypa1-secure-login.verify-account.tk/webscr?cmd=_login', bad: true },
  { label: 'wikipedia', value: 'https://en.wikipedia.org/wiki/Phishing', bad: false },
  { label: 'IP + bank', value: 'http://192.168.4.21/hdfc/netbanking/login.php', bad: true },
  { label: 'apple-id lookalike', value: 'https://www.icloud.com.verify-apple-id.info/signin', bad: true },
]

export const EMAIL_SAMPLES = [
  {
    label: 'Password expiry',
    bad: true,
    value: `Subject: Action Required: Your Microsoft 365 password expires today

Dear User,

Your mailbox password will expire in 24 hours. To avoid losing access to your emails, confirm your current password immediately using the secure link below.

https://office365-passwordreset.secure-login.xyz/verify

Failure to verify will result in your account being suspended.

Microsoft Security Team`,
  },
  {
    label: 'KYC scam',
    bad: true,
    value: `Dear Customer,

Your SBI account KYC is pending as per RBI guidelines. Your account will be BLOCKED today!!
Update your PAN, Aadhaar and OTP details at http://sbi-kyc-update.top/login to continue banking services.

Regards,
SBI Customer Care`,
  },
  {
    label: 'Meeting note',
    bad: false,
    value: `Hi Ketan,

Thanks for sending the draft of the synopsis. I've added a few comments on the methodology section. Can we meet on Thursday at 11 to go through them? Please also bring the dataset statistics.

Regards,
Lalit`,
  },
  {
    label: 'Order shipped',
    bad: false,
    value: `Your Amazon order #402-1234567 has shipped and will arrive on Monday. You can track your package from Your Orders in the app. No action is needed from your side.

Thanks for shopping with us.`,
  },
]

export const THREATS = [
  'Credential harvesting', 'Typosquatting', 'Brand impersonation', 'IP-based URLs', 'Homograph attacks',
  'URL shorteners', 'KYC & UPI scams', 'Fake invoices', 'Urgency lures', 'Parcel-fee fraud', 'Crypto wallet drains',
]
