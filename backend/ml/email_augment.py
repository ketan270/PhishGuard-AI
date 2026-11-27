"""
Template-based augmentation for the email corpus.

The Enron spam/ham corpus (1999-2006) is the main training source, but it does
not contain modern credential-harvesting styles (Microsoft 365 password
expiry, parcel-delivery fees, UPI/KYC scams, crypto wallets) or modern
legitimate notifications (OTP notices, order confirmations, calendar invites).
These templates add that coverage. They are combined programmatically with
random brands, names, amounts and phrasings so no two samples are identical.

The share of augmented samples is reported in metrics.json so the evaluation
remains transparent.
"""
from __future__ import annotations

import random

BRANDS = ["Microsoft 365", "Outlook", "PayPal", "Amazon", "Netflix", "Apple ID", "DHL Express",
          "FedEx", "HDFC Bank", "SBI", "ICICI Bank", "Paytm", "Google", "Instagram", "Facebook",
          "Coinbase", "Binance", "Chase", "Wells Fargo", "DocuSign", "Dropbox", "LinkedIn",
          "WhatsApp", "Flipkart", "Income Tax Department", "Spotify", "Adobe", "Zoom"]
NAMES = ["Rahul", "Priya", "Aman", "Neha", "John", "Sarah", "Michael", "Emily", "Arjun", "Sneha",
         "David", "Aisha", "Karan", "Riya", "Daniel", "Olivia", "Vikram", "Ananya", "Chris", "Meera"]
PHISH_DOMAINS = ["secure-{b}-verify.com", "{b}-account-update.net", "{b}.login-support.xyz",
                 "verify-{b}.top", "{b}-security-alert.info", "{b}support.online",
                 "account-{b}.site", "{b}.com.session-renew.ru", "login-{b}.help-center.tk",
                 "{b}-billing.cf", "{b}-kyc-update.in.net", "185.{n1}.{n2}.{n3}/{b}/login.php",
                 "bit.ly/{rand}", "{b}-refund.claims-portal.co", "my{b}-verify.live"]
LEGIT_DOMAINS = ["https://www.{b}.com/account", "https://{b}.com/orders", "https://support.{b}.com",
                 "https://www.{b}.com/help", "https://calendar.google.com", "https://github.com/{u}",
                 "https://docs.google.com/document/d/{rand}"]

PHISH_SUBJECTS = [
    "Action Required: Your {brand} account has been suspended",
    "URGENT: Unusual sign-in activity detected",
    "Your password expires today",
    "Final notice: payment failed",
    "Your parcel could not be delivered",
    "Verify your identity within 24 hours",
    "You have (1) pending refund of {money}",
    "Security alert for your {brand} account",
    "Congratulations! You've won a {money} gift card",
    "KYC update pending - account will be blocked",
    "Invoice #{num} overdue",
    "Your mailbox storage is full",
    "Confirm your billing information",
]
PHISH_OPENERS = [
    "Dear Customer,", "Dear User,", "Dear valued member,", "Hello,", "Dear Account Holder,",
    "Attention!", "Dear {name},", "Hi,", "Dear Client,", "Dear Sir/Madam,",
]
PHISH_BODIES = [
    "We detected unusual activity on your {brand} account and have temporarily suspended access. "
    "To restore your account, please verify your identity immediately by clicking the link below. "
    "Failure to verify within 24 hours will result in permanent account closure.",
    "Your {brand} password is set to expire today. To keep using your mailbox, confirm your current "
    "password using the secure portal below. If you do not act now, you will lose access to all emails.",
    "We were unable to process your last payment of {money}. Please update your billing information and "
    "card details to avoid suspension of your {brand} subscription.",
    "Your package with tracking number {num} is on hold due to an unpaid customs fee of {money}. "
    "Pay the fee now to schedule delivery, otherwise the parcel will be returned to sender.",
    "As per RBI guidelines your KYC is not updated. Your {brand} account will be blocked today. "
    "Update your PAN, Aadhaar and OTP details using the link below to continue banking services.",
    "You are eligible for a tax refund of {money}. To receive the refund, submit your bank account "
    "number, debit card number and PIN through the official refund form.",
    "Congratulations {name}! You have been selected as the winner of a {money} {brand} gift card. "
    "Claim your reward now by providing your shipping and payment details. Offer expires in 12 hours.",
    "Someone tried to sign in to your {brand} account from an unknown device in Russia. If this was not you, "
    "secure your account immediately by logging in and confirming your credentials.",
    "Your mailbox has exceeded its storage limit. Incoming messages will be rejected. "
    "Validate your account and re-enter your username and password to increase your quota for free.",
    "Please review and sign the attached document shared with you via {brand}. You must log in with your "
    "email password to view the secure document. The link expires soon.",
    "We noticed a login attempt to your {brand} account. For your security your password has been reset. "
    "Login with your old password to confirm the change and set a new password.",
    "IT Helpdesk: we are upgrading all staff mailboxes. Reply with your username and password or log in to the "
    "staff portal to avoid interruption of service.",
    "Your {brand} account access will be restricted. Please sign in and confirm your password and security "
    "question to keep your account active.",
    "Shared file: {name} has shared 'Salary_Revision_2026.xlsx' with you. Sign in with your email and password "
    "to access the document.",
    "Your {brand} wallet has been flagged for suspicious transactions. To avoid losing your funds, "
    "verify your recovery phrase and wallet credentials within 48 hours.",
    "Invoice #{num} for {money} is overdue. Open the attached invoice and enable macros to view the "
    "payment instructions. Wire transfer must be completed today to avoid legal action.",
]
PHISH_CTAS = [
    "Click here to verify: {url}", "Verify now: {url}", "Login here: {url}", "Restore access: {url}",
    "Update details: {url}", "Claim now >> {url}", "Secure your account: {url}", "Pay now: {url}",
    "{url}",
]
PHISH_CLOSERS = [
    "Thank you,\n{brand} Security Team", "Regards,\nAccount Services", "{brand} Support",
    "Customer Care Department", "Thanks,\nThe {brand} Team", "Billing Department", "IT Helpdesk",
]

LEGIT_SUBJECTS = [
    "Your {brand} order has shipped", "Meeting notes from today's sync", "Re: project timeline",
    "Your monthly statement is ready", "Welcome to the team!", "Lunch on Friday?",
    "Invitation: Design review @ Thu 3pm", "Your receipt from {brand}", "Weekly newsletter",
    "Assignment submission reminder", "Re: quick question about the report", "Your OTP for login",
    "Team outing photos", "Password changed successfully",
]
LEGIT_BODIES = [
    "Hi {name}, thanks for joining the call today. As discussed, I'll send the updated slides by Thursday "
    "and we can review the budget numbers in next week's meeting. Let me know if I missed anything.",
    "Hello {name}, your order #{num} has been shipped and will arrive by Monday. You can track it from the "
    "Orders section of the app. No action is needed from your side.",
    "Hey {name}, are you free for lunch on Friday? There's a new place near the office that a few of us "
    "wanted to try. Around 1pm works for me.",
    "Hi team, please find the minutes from today's standup below. Backend API is complete, frontend "
    "integration is in progress, and testing starts next sprint. Great work everyone.",
    "Dear {name}, this is a reminder that the lab assignment is due on Wednesday at 5 pm. Please upload "
    "your report on the course portal. Reach out during office hours if you have questions.",
    "Your one-time password is {num}. It is valid for 10 minutes. {brand} will never call you or email you "
    "asking for this code. Do not share it with anyone.",
    "Hi {name}, the password for your {brand} account was changed successfully. If you made this change, "
    "you don't need to do anything. If not, please contact support through the official app.",
    "Thanks for your purchase of {money}. This email confirms your payment to {brand}. A copy of the "
    "receipt is available in your account history. We appreciate your business.",
    "Hi {name}, welcome aboard! Your laptop will be ready on Monday and your manager will walk you through "
    "the onboarding plan. Looking forward to working with you.",
    "In this week's newsletter: new features in our mobile app, tips for staying productive, and an "
    "interview with our engineering lead. Read more on our blog. You can unsubscribe at any time.",
    "Hi {name}, I reviewed the draft report and left a few comments on section 3. Overall it looks good. "
    "Can we finalise it by Friday so I can share it with the department?",
    "Hello {name}, sharing the photos from the team outing last weekend. Thanks to everyone who organised "
    "it - we should plan another one next quarter.",
]
LEGIT_CLOSERS = ["Best,\n{name}", "Thanks,\n{name}", "Regards,\n{name}", "Cheers,\n{name}",
                 "The {brand} Team", "Sent from my phone", "Warm regards,\n{name}"]


def _money(r: random.Random) -> str:
    return r.choice(["$", "₹", "€", "£"]) + f"{r.randint(5, 4999)}.{r.randint(0, 99):02d}"


def _fill(s: str, r: random.Random, brand: str) -> str:
    slug = brand.lower().replace(" ", "").replace("365", "").replace("express", "").replace("department", "")
    rand = "".join(r.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(r.randint(6, 12)))
    url_tpl = r.choice(PHISH_DOMAINS)
    url = url_tpl.format(b=slug, n1=r.randint(1, 255), n2=r.randint(1, 255), n3=r.randint(1, 255), rand=rand)
    if not url.startswith("bit.ly") and r.random() < 0.8:
        url = r.choice(["http://", "https://"]) + url
    return s.format(brand=brand, name=r.choice(NAMES), money=_money(r), num=r.randint(100000, 999999),
                    url=url, b=slug, u=r.choice(NAMES).lower(), rand=rand)


def _legit_url(r: random.Random, brand: str) -> str:
    slug = brand.lower().replace(" ", "").replace("365", "").replace("express", "").replace("department", "")
    rand = "".join(r.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(10))
    return r.choice(LEGIT_DOMAINS).format(b=slug, u=r.choice(NAMES).lower(), rand=rand)


def generate(n_each: int = 2000, seed: int = 42) -> tuple[list[str], list[int]]:
    r = random.Random(seed)
    texts, labels = [], []
    for _ in range(n_each):
        brand = r.choice(BRANDS)
        parts = [
            "Subject: " + _fill(r.choice(PHISH_SUBJECTS), r, brand),
            _fill(r.choice(PHISH_OPENERS), r, brand),
            _fill(r.choice(PHISH_BODIES), r, brand),
        ]
        if r.random() < 0.85:
            parts.append(_fill(r.choice(PHISH_CTAS), r, brand))
        if r.random() < 0.4:
            parts.append(_fill(r.choice(PHISH_BODIES), r, brand))
        parts.append(_fill(r.choice(PHISH_CLOSERS), r, brand))
        text = "\n\n".join(parts)
        if r.random() < 0.3:
            text = text.upper() if r.random() < 0.2 else text.replace(".", "!", 1)
        texts.append(text)
        labels.append(1)
    for _ in range(n_each):
        brand = r.choice(BRANDS)
        parts = [
            "Subject: " + _fill(r.choice(LEGIT_SUBJECTS), r, brand),
            _fill(r.choice(["Hi {name},", "Hello,", "Hey {name},", "Dear {name},", "Hi team,"]), r, brand),
            _fill(r.choice(LEGIT_BODIES), r, brand),
        ]
        if r.random() < 0.35:
            parts.append(_fill(r.choice(LEGIT_BODIES), r, brand))
        if r.random() < 0.3:
            parts.append("More details: " + _legit_url(r, brand))
        parts.append(_fill(r.choice(LEGIT_CLOSERS), r, brand))
        texts.append("\n\n".join(parts))
        labels.append(0)
    return texts, labels
